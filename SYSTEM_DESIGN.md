# System Design - Distributed Notification System

## Architecture Overview

This document provides a comprehensive overview of the distributed notification system architecture, including all services, data flows, and technical features.

## High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Client[Client Application]
    end

    subgraph "API Gateway Layer - Port 3000"
        Gateway[API Gateway Service<br/>Express.js]
        RateLimit[Rate Limiter<br/>Redis Sliding Window]
        Idempotency[Idempotency Check<br/>Redis Cache]
        CB_Gateway[Circuit Breakers<br/>User & Template Services]
    end

    subgraph "Service Layer"
        subgraph "User Service - Port 3001"
            UserAPI[User API<br/>Express.js]
            UserCache[Redis Cache<br/>5-min TTL]
            UserDB[(PostgreSQL<br/>Users DB)]
        end

        subgraph "Template Service - Port 3002"
            TemplateAPI[Template API<br/>Express.js]
            TemplateCache[Redis Cache<br/>10-min TTL]
            TemplateDB[(PostgreSQL<br/>Templates DB)]
        end
    end

    subgraph "Message Queue Layer"
        Exchange[RabbitMQ Exchange<br/>notifications.direct]
        EmailQueue[email.queue]
        PushQueue[push.queue]
        DLX[Dead Letter Exchange<br/>notifications.dlx]
        FailedQueue[failed.queue<br/>DLQ]
    end

    subgraph "Worker Layer"
        subgraph "Email Service"
            EmailWorker[Email Worker<br/>Node.js]
            CB_Email[Circuit Breaker<br/>SMTP]
            SMTP[SMTP Server<br/>Gmail/SendGrid]
        end

        subgraph "Push Service"
            PushWorker[Push Worker<br/>Node.js]
            CB_Push[Circuit Breaker<br/>FCM]
            FCM[Firebase Cloud<br/>Messaging]
        end
    end

    subgraph "Infrastructure"
        Redis[(Redis<br/>Cache & Rate Limiting)]
        RabbitMQ[RabbitMQ<br/>Message Broker]
    end

    Client -->|1. POST /api/v1/notify| Gateway
    Gateway --> RateLimit
    RateLimit --> Idempotency
    Idempotency --> CB_Gateway
    CB_Gateway -->|2. GET user| UserAPI
    CB_Gateway -->|3. GET template| TemplateAPI
    
    UserAPI --> UserCache
    UserCache -.->|Cache miss| UserDB
    UserDB -.->|User data| UserCache
    
    TemplateAPI --> TemplateCache
    TemplateCache -.->|Cache miss| TemplateDB
    TemplateDB -.->|Template data| TemplateCache
    
    Gateway -->|4. Publish message| Exchange
    Exchange -->|route: email.queue| EmailQueue
    Exchange -->|route: push.queue| PushQueue
    
    EmailQueue -->|5. Consume| EmailWorker
    PushQueue -->|5. Consume| PushWorker
    
    EmailWorker --> CB_Email
    CB_Email -->|6. Send email| SMTP
    SMTP -.->|Delivery| Client
    
    PushWorker --> CB_Push
    CB_Push -->|6. Send push| FCM
    FCM -.->|Delivery| Client
    
    EmailQueue -.->|Max retries exceeded| DLX
    PushQueue -.->|Max retries exceeded| DLX
    DLX --> FailedQueue
    
    RateLimit -.-> Redis
    Idempotency -.-> Redis
    UserCache -.-> Redis
    TemplateCache -.-> Redis
    
    EmailQueue -.-> RabbitMQ
    PushQueue -.-> RabbitMQ
    Exchange -.-> RabbitMQ
    DLX -.-> RabbitMQ
    FailedQueue -.-> RabbitMQ

    style Client fill:#e1f5ff
    style Gateway fill:#fff4e6
    style UserAPI fill:#e8f5e9
    style TemplateAPI fill:#e8f5e9
    style EmailWorker fill:#f3e5f5
    style PushWorker fill:#f3e5f5
    style Redis fill:#ffebee
    style RabbitMQ fill:#fff3e0
    style UserDB fill:#e0f2f1
    style TemplateDB fill:#e0f2f1
```

## Request Flow Sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant G as API Gateway
    participant RL as Rate Limiter
    participant I as Idempotency
    participant U as User Service
    participant T as Template Service
    participant R as RabbitMQ
    participant E as Email Worker
    participant P as Push Worker
    participant SMTP as SMTP Server
    participant FCM as FCM Server

    C->>G: POST /api/v1/notify
    G->>RL: Check rate limit
    RL-->>G: OK (within limit)
    G->>I: Check idempotency key
    I-->>G: New request
    
    G->>U: GET /api/v1/users/{id}
    U->>U: Check Redis cache
    alt Cache Hit
        U-->>G: User data (cached)
    else Cache Miss
        U->>U: Query PostgreSQL
        U->>U: Store in cache
        U-->>G: User data (from DB)
    end
    
    G->>T: GET /api/v1/templates/name/{name}
    T->>T: Check Redis cache
    alt Cache Hit
        T-->>G: Template (cached)
    else Cache Miss
        T->>T: Query PostgreSQL
        T->>T: Store in cache
        T-->>G: Template (from DB)
    end
    
    G->>R: Publish to email.queue & push.queue
    G-->>C: 202 Accepted
    
    par Email Processing
        R->>E: Consume from email.queue
        E->>E: Render template
        E->>SMTP: Send email
        alt Success
            SMTP-->>E: Delivery confirmed
            E->>R: ACK message
        else Failure
            SMTP-->>E: Error
            E->>R: NACK (retry with backoff)
        end
    and Push Processing
        R->>P: Consume from push.queue
        P->>P: Render template
        P->>FCM: Send push notification
        alt Success
            FCM-->>P: Delivery confirmed
            P->>R: ACK message
        else Failure
            FCM-->>P: Error
            P->>R: NACK (retry with backoff)
        end
    end
```

## Data Models

```mermaid
erDiagram
    User ||--o| NotificationPreference : has
    User ||--o{ PushToken : has
    Template ||--o{ TemplateVersion : has

    User {
        uuid id PK
        string email
        string first_name
        string last_name
        string password_hash
        datetime created_at
        datetime updated_at
    }

    NotificationPreference {
        uuid id PK
        uuid user_id FK
        boolean email_enabled
        boolean push_enabled
        datetime created_at
        datetime updated_at
    }

    PushToken {
        uuid id PK
        uuid user_id FK
        string token
        string device_type
        string device_name
        datetime created_at
    }

    Template {
        uuid id PK
        string name
        enum type
        datetime created_at
        datetime updated_at
    }

    TemplateVersion {
        uuid id PK
        uuid template_id FK
        string subject
        text body
        string language
        int version
        boolean is_active
        datetime createdAt
    }
```

## Circuit Breaker State Machine

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> OPEN : Error threshold exceeded<br/>(50% errors)
    OPEN --> HALF_OPEN : Reset timeout<br/>(30 seconds)
    HALF_OPEN --> CLOSED : Success
    HALF_OPEN --> OPEN : Failure
    CLOSED --> CLOSED : Success
    
    note right of CLOSED
        Normal operation
        All requests pass through
    end note
    
    note right of OPEN
        Circuit is open
        Requests fail fast
        No calls to service
    end note
    
    note right of HALF_OPEN
        Testing recovery
        Limited requests allowed
    end note
```

## Retry Mechanism Flow

```mermaid
flowchart TD
    Start[Message Received] --> Process[Process Message]
    Process --> Success{Success?}
    Success -->|Yes| ACK[ACK Message]
    Success -->|No| CheckRetry{Retry Count < 4?}
    CheckRetry -->|Yes| Backoff[Calculate Backoff]
    Backoff --> Wait1{Attempt 1?}
    Wait1 -->|Yes| Wait1s[Wait 1 second]
    Wait1 -->|No| Wait2{Attempt 2?}
    Wait2 -->|Yes| Wait5s[Wait 5 seconds]
    Wait2 -->|No| Wait25s[Wait 25 seconds]
    Wait1s --> NACK[NACK Message]
    Wait5s --> NACK
    Wait25s --> NACK
    NACK --> Requeue[Requeue to Same Queue]
    Requeue --> Process
    CheckRetry -->|No| DLX[Send to DLX]
    DLX --> Failed[Move to failed.queue]
    Failed --> End[Manual Review Required]
    ACK --> Complete[Complete]

    style Success fill:#c8e6c9
    style ACK fill:#a5d6a7
    style DLX fill:#ffcdd2
    style Failed fill:#ef9a9a
```

## Technology Stack

### Services
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Language**: JavaScript (ES6+)

### Databases
- **PostgreSQL**: User and Template data
- **Redis**: Caching, rate limiting, idempotency
- **Prisma ORM**: Database access layer

### Message Queue
- **RabbitMQ**: Message broker
- **amqplib**: Node.js client library

### External Services
- **SMTP**: Email delivery (Gmail/SendGrid)
- **FCM**: Push notification delivery

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

### Monitoring & Resilience
- **Opossum**: Circuit breaker implementation
- **Winston/Console**: Logging

### Documentation
- **Swagger/OpenAPI 3.0**: API documentation
- **swagger-jsdoc**: JSDoc to OpenAPI conversion
- **swagger-ui-express**: Interactive API docs

## Key Features

### 1. Rate Limiting
- **Algorithm**: Sliding window using Redis sorted sets
- **Limit**: 100 requests per minute per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response**: 429 Too Many Requests when exceeded

### 2. Idempotency
- **Storage**: Redis with 24-hour TTL
- **Header**: `Idempotency-Key`
- **Behavior**: Returns cached response for duplicate requests

### 3. Circuit Breaker
- **Library**: Opossum
- **Timeout**: 5-10 seconds
- **Error Threshold**: 50%
- **Reset Timeout**: 30 seconds
- **Protected Services**: User Service, Template Service, SMTP, FCM

### 4. Caching Strategy
- **User Data**: 5-minute TTL
- **Template Data**: 10-minute TTL
- **Invalidation**: On update/delete operations
- **Fail-Open**: Continues on cache failure

### 5. Retry Strategy
- **Max Attempts**: 4
- **Backoff**: Exponential (1s, 5s, 25s)
- **Dead Letter Queue**: After max retries
- **Manual Review**: Failed messages in DLQ

### 6. Asynchronous Processing
- **Pattern**: Fire-and-forget
- **Response**: 202 Accepted immediately
- **Processing**: Workers consume from queues
- **Decoupling**: API Gateway doesn't wait for delivery

## Performance Characteristics

### API Gateway
- **Response Time**: < 100ms (target)
- **Throughput**: 100+ requests/minute per IP
- **Availability**: High (circuit breakers prevent cascading failures)

### Workers
- **Email Processing**: ~1-2 seconds per email
- **Push Processing**: ~500ms per notification
- **Concurrency**: Multiple workers can run in parallel

### Caching
- **Cache Hit Rate**: 80%+ (expected)
- **Cache Response Time**: < 10ms
- **Database Response Time**: 50-100ms

## Scalability Considerations

### Horizontal Scaling
- **API Gateway**: Can run multiple instances behind load balancer
- **Workers**: Can run multiple instances (RabbitMQ distributes load)
- **Services**: User and Template services can be scaled independently

### Vertical Scaling
- **Database**: PostgreSQL can be upgraded for more connections
- **Redis**: Can be upgraded for more memory
- **RabbitMQ**: Can handle millions of messages

### Bottlenecks
- **Database**: Most likely bottleneck (mitigated by caching)
- **External Services**: SMTP and FCM rate limits
- **RabbitMQ**: Queue depth monitoring needed

## Security Considerations

### Authentication & Authorization
- **Current**: Basic password hashing (bcrypt)
- **Future**: JWT tokens, OAuth2

### Data Protection
- **Passwords**: Hashed with bcrypt
- **Tokens**: Stored securely in database
- **API Keys**: Environment variables

### Network Security
- **Docker Network**: Services isolated in Docker network
- **External Access**: Only API Gateway exposed

## Monitoring & Observability

### Health Checks
- All services expose `/health` endpoints
- Circuit breaker stats available
- Docker health checks configured

### Logging
- Correlation IDs for request tracking
- Structured logging with timestamps
- Error logging with stack traces

### Metrics (Future)
- Request rate and response times
- Queue depth and processing rate
- Cache hit/miss ratios
- Circuit breaker state changes

## Deployment

### Development
```bash
docker-compose up -d
```

### Production Considerations
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Use managed Redis (AWS ElastiCache, Redis Cloud)
- Use managed RabbitMQ (CloudAMQP, AWS MQ)
- Implement proper secrets management
- Add SSL/TLS for all connections
- Implement proper monitoring and alerting

## Future Enhancements

1. **Notification Status Tracking**: Track delivery status in database
2. **Webhook Support**: Notify clients of delivery status
3. **Template Preview**: Preview templates before sending
4. **A/B Testing**: Test different template versions
5. **Analytics**: Track open rates, click rates
6. **Multi-tenancy**: Support multiple organizations
7. **Scheduled Notifications**: Send notifications at specific times
8. **Batch Processing**: Send bulk notifications efficiently

