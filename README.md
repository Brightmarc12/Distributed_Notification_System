# 🔔 Distributed Notification System

[![CI/CD](https://github.com/Brightmarc12/Distributed_Notification_System/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Brightmarc12/Distributed_Notification_System/actions/workflows/ci-cd.yml)
[![Tests](https://github.com/Brightmarc12/Distributed_Notification_System/actions/workflows/test.yml/badge.svg)](https://github.com/Brightmarc12/Distributed_Notification_System/actions/workflows/test.yml)
[![Docker](https://github.com/Brightmarc12/Distributed_Notification_System/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Brightmarc12/Distributed_Notification_System/actions/workflows/docker-publish.yml)

A production-ready, scalable microservices-based notification system that supports multiple delivery channels (Email, Push Notifications) with advanced features like circuit breakers, rate limiting, caching, and idempotency.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

This distributed notification system is designed to handle high-volume notification delivery across multiple channels. Built with microservices architecture, it provides reliability, scalability, and fault tolerance through industry-standard patterns and practices.

### Key Capabilities

- **Multi-Channel Delivery**: Email and Push Notifications
- **High Throughput**: Handles 1000+ notifications per minute
- **Fault Tolerance**: Circuit breakers and retry mechanisms
- **Idempotency**: Prevents duplicate notifications
- **Rate Limiting**: Protects against abuse
- **Caching**: Redis-based caching for improved performance
- **Template Management**: Versioned notification templates
- **User Preferences**: Granular notification preferences per user

## ✨ Features

### Core Features

- ✅ **Complete CRUD Operations** - User and Template management
- ✅ **Asynchronous Processing** - Fire-and-forget notification delivery
- ✅ **Message Queue** - RabbitMQ with Dead Letter Queue (DLQ)
- ✅ **Circuit Breaker Pattern** - Automatic failure detection and recovery
- ✅ **Idempotency Support** - Duplicate request prevention
- ✅ **Redis Caching** - User and template data caching
- ✅ **Rate Limiting** - Sliding window algorithm (100 req/min per IP)
- ✅ **API Documentation** - Interactive Swagger/OpenAPI 3.0
- ✅ **CI/CD Pipeline** - Automated testing and deployment
- ✅ **Template Versioning** - Track template changes over time
- ✅ **Retry Mechanism** - Exponential backoff (1s, 5s, 25s)

### Advanced Features

- 🔄 **Circuit Breaker States**: CLOSED → OPEN → HALF_OPEN
- 🔐 **Idempotency Keys**: 24-hour TTL with Redis
- 📊 **Rate Limit Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- 💾 **Smart Caching**: User data (5-min), Templates (10-min)
- 🔁 **Automatic Retries**: Max 4 attempts with exponential backoff
- 📝 **Correlation IDs**: Request tracking across services
- 🏥 **Health Checks**: All services expose health endpoints

## 🏗️ Architecture

### System Components

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         API Gateway Service             │
│  (Rate Limiting, Idempotency, Circuit)  │
└──────┬──────────────────────────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    User     │ │  Template   │ │  RabbitMQ   │
│   Service   │ │   Service   │ │   Queue     │
└─────────────┘ └─────────────┘ └──────┬──────┘
                                       │
                                ┌──────┴──────┐
                                ▼             ▼
                         ┌─────────────┐ ┌─────────────┐
                         │    Email    │ │    Push     │
                         │   Service   │ │   Service   │
                         └─────────────┘ └─────────────┘
```

### Services

1. **API Gateway Service** (Port 3000)
   - Entry point for all client requests
   - Rate limiting and idempotency
   - Circuit breaker for downstream services
   - Routes notifications to RabbitMQ

2. **User Service** (Port 3001)
   - User management (CRUD)
   - Notification preferences
   - Push token management
   - PostgreSQL + Prisma ORM

3. **Template Service** (Port 3002)
   - Template management (CRUD)
   - Template versioning
   - Template retrieval by name/ID
   - PostgreSQL + Prisma ORM

4. **Email Service** (Worker)
   - Consumes from RabbitMQ email queue
   - Sends emails via SMTP
   - Circuit breaker for SMTP
   - Retry mechanism with exponential backoff

5. **Push Service** (Worker)
   - Consumes from RabbitMQ push queue
   - Sends push notifications via FCM
   - Circuit breaker for FCM
   - Retry mechanism with exponential backoff

### Infrastructure

- **PostgreSQL**: User and Template databases
- **Redis**: Caching, rate limiting, idempotency
- **RabbitMQ**: Message queue with DLQ
- **Docker**: Containerization
- **GitHub Actions**: CI/CD pipeline

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Language**: JavaScript (ES6+)

### Databases
- **PostgreSQL 15**: Relational data storage
- **Redis 7**: Caching and rate limiting
- **Prisma ORM**: Database access layer

### Message Queue
- **RabbitMQ 3**: Asynchronous message processing

### External Services
- **SMTP**: Email delivery (Gmail, SendGrid, etc.)
- **Firebase Cloud Messaging (FCM)**: Push notifications

### DevOps
- **Docker & Docker Compose**: Containerization
- **GitHub Actions**: CI/CD pipeline
- **Trivy**: Security scanning

### Libraries
- **opossum**: Circuit breaker implementation
- **amqplib**: RabbitMQ client
- **ioredis**: Redis client
- **nodemailer**: Email sending
- **firebase-admin**: FCM integration
- **swagger-jsdoc**: API documentation
- **swagger-ui-express**: Interactive API docs

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) - Only for local development
- **Git** - For version control
- **Gmail Account** or **SMTP Server** - For email sending
- **Firebase Project** - For push notifications (optional)

### Optional Tools
- **Postman** or **curl** - For API testing
- **Redis CLI** - For Redis debugging
- **PostgreSQL Client** - For database inspection

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Brightmarc12/Distributed_Notification_System.git
cd Distributed_Notification_System
```

### 2. Configure Environment Variables

Create `.env` files for each service (or use the provided `.env.example` files):

```bash
# Copy example files
cp api_gateway_service/.env.example api_gateway_service/.env
cp user_service/.env.example user_service/.env
cp template_service/.env.example template_service/.env
cp email_service/.env.example email_service/.env
cp push_service/.env.example push_service/.env
```

**Important**: Update the following in `email_service/.env`:
```env
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

For Gmail, generate an [App Password](https://support.google.com/accounts/answer/185833).

### 3. Start All Services

```bash
# Start all services with Docker Compose
docker-compose up -d

# Wait for services to be ready (30-60 seconds)
docker-compose logs -f
```

### 4. Initialize Databases

The databases are automatically initialized with Prisma migrations on first startup.

### 5. Verify Services

Check that all services are healthy:

```bash
# API Gateway
curl http://localhost:3000/health

# User Service
curl http://localhost:3001/health

# Template Service
curl http://localhost:3002/health
```

### 6. Access API Documentation

Open your browser and navigate to:

- **API Gateway**: http://localhost:3000/api-docs
- **User Service**: http://localhost:3001/api-docs
- **Template Service**: http://localhost:3002/api-docs

### 7. Send Your First Notification

```bash
# Create a user
USER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
  }')

USER_ID=$(echo $USER_RESPONSE | jq -r '.data.id')

# Create a template
curl -X POST http://localhost:3002/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome-email",
    "type": "EMAIL",
    "subject": "Welcome to Our Platform!",
    "body": "Hello {{first_name}}, welcome aboard!",
    "language": "en"
  }'

# Send notification
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"template_name\": \"welcome-email\",
    \"variables\": {}
  }"
```

## ⚙️ Configuration

### Environment Variables

#### API Gateway Service
```env
PORT=3000
NODE_ENV=development
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
REDIS_HOST=redis
REDIS_PORT=6379
USER_SERVICE_URL=http://user_service:3001
TEMPLATE_SERVICE_URL=http://template_service:3002
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### User Service
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/user_db
REDIS_HOST=redis
REDIS_PORT=6379
```

#### Template Service
```env
PORT=3002
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/template_db
REDIS_HOST=redis
REDIS_PORT=6379
```

#### Email Service
```env
NODE_ENV=development
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com
```

#### Push Service
```env
NODE_ENV=development
RABBITMQ_URL=amqp://user:password@rabbitmq:5672
FCM_SERVICE_ACCOUNT_PATH=./fcm-service-account.json
```

### Docker Compose Configuration

The `docker-compose.yml` file defines all services. Key configurations:

- **Health Checks**: All services have health check endpoints
- **Restart Policy**: `unless-stopped` for automatic recovery
- **Networks**: All services on `notification-network`
- **Volumes**: PostgreSQL and RabbitMQ data persistence

## 📚 API Documentation

### Interactive Documentation

Access the interactive Swagger UI for each service:

- **API Gateway**: http://localhost:3000/api-docs
- **User Service**: http://localhost:3001/api-docs
- **Template Service**: http://localhost:3002/api-docs

### API Gateway Endpoints

#### Send Notification
```http
POST /api/v1/notify
Content-Type: application/json
Idempotency-Key: unique-key-123

{
  "user_id": "uuid",
  "template_name": "template-name",
  "variables": {
    "key": "value"
  }
}
```

**Response**: `202 Accepted`

### User Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/users` | Create a new user |
| GET | `/api/v1/users` | List all users (paginated) |
| GET | `/api/v1/users/:id` | Get user by ID |
| PUT | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Delete user |
| PUT | `/api/v1/users/:id/preferences` | Update notification preferences |
| POST | `/api/v1/users/:id/push-tokens` | Add push token |
| DELETE | `/api/v1/users/:id/push-tokens/:token_id` | Remove push token |

### Template Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/templates` | Create a new template |
| GET | `/api/v1/templates` | List all templates (paginated) |
| GET | `/api/v1/templates/:id` | Get template by ID |
| GET | `/api/v1/templates/name/:name` | Get template by name |
| PUT | `/api/v1/templates/:id` | Update template (creates new version) |
| DELETE | `/api/v1/templates/:id` | Delete template |
| GET | `/api/v1/templates/:id/versions` | Get template version history |

### Rate Limiting

All API Gateway requests are rate-limited:

- **Limit**: 100 requests per minute per IP
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
- **Status Code**: `429 Too Many Requests` when exceeded

### Idempotency

Use the `Idempotency-Key` header to prevent duplicate notifications:

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{ ... }'
```

- Same key within 24 hours returns cached response
- Response includes `"idempotent": true` flag

## 🧪 Testing

### Running Tests Locally

#### Start Services
```bash
docker-compose up -d
sleep 30  # Wait for services to be ready
```

#### Health Checks
```bash
# Check all services
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

#### User Service Tests
```bash
# Create user
curl -X POST http://localhost:3001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# List users
curl http://localhost:3001/api/v1/users

# Update user
curl -X PUT http://localhost:3001/api/v1/users/{user_id} \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Updated"}'

# Delete user
curl -X DELETE http://localhost:3001/api/v1/users/{user_id}
```

#### Template Service Tests
```bash
# Create template
curl -X POST http://localhost:3002/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-template",
    "type": "EMAIL",
    "subject": "Test Subject",
    "body": "Hello {{name}}!",
    "language": "en"
  }'

# Get template by name
curl http://localhost:3002/api/v1/templates/name/test-template

# Update template (creates new version)
curl -X PUT http://localhost:3002/api/v1/templates/{template_id} \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Updated Subject",
    "body": "Updated body"
  }'

# Get version history
curl http://localhost:3002/api/v1/templates/{template_id}/versions
```

#### Notification Flow Test
```bash
# Send notification
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-$(date +%s)" \
  -d '{
    "user_id": "{user_id}",
    "template_name": "test-template",
    "variables": {"name": "John"}
  }'

# Check email service logs
docker-compose logs email_service

# Check push service logs
docker-compose logs push_service
```

#### Rate Limiting Test
```bash
# Make multiple rapid requests
for i in {1..15}; do
  curl -w "%{http_code}\n" -o /dev/null -s http://localhost:3000/health
done
```

#### Idempotency Test
```bash
# Send same request twice with same key
IDEMPOTENCY_KEY="test-$(date +%s)"

curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{ ... }'

# Wait a moment
sleep 2

# Send again with same key
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{ ... }'
```

### Automated Tests

The project includes comprehensive automated tests via GitHub Actions:

```bash
# View test workflows
.github/workflows/test.yml
.github/workflows/ci-cd.yml
```

**Test Coverage:**
- ✅ Health checks for all services
- ✅ User CRUD operations
- ✅ Template CRUD operations
- ✅ Notification flow (end-to-end)
- ✅ Idempotency verification
- ✅ Rate limiting verification
- ✅ Integration tests with real databases

### Performance Testing

Test system throughput:

```bash
# Install Apache Bench (if not installed)
# Ubuntu/Debian: apt-get install apache2-utils
# macOS: brew install httpd

# Run performance test
ab -n 1000 -c 10 http://localhost:3000/health
```

Expected results:
- **API Gateway**: < 100ms response time
- **Throughput**: 1000+ requests per minute
- **Success Rate**: > 99.5%

## 🚀 Deployment

### Docker Deployment

#### Production Build
```bash
# Build all images
docker-compose build

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Environment-Specific Deployment

**Staging:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

**Production:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline

The project uses GitHub Actions for automated deployment:

1. **Push to `master`** → Triggers CI/CD pipeline
2. **Build & Test** → All services built and tested
3. **Security Scan** → Trivy vulnerability scanning
4. **Deploy to Staging** → Automatic deployment
5. **Manual Approval** → Required for production
6. **Deploy to Production** → Blue-green deployment

See [CI_CD_DOCUMENTATION.md](CI_CD_DOCUMENTATION.md) for details.

### Kubernetes Deployment (Future)

```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: ghcr.io/brightmarc12/api_gateway_service:latest
        ports:
        - containerPort: 3000
```

### Scaling

#### Horizontal Scaling
```bash
# Scale API Gateway
docker-compose up -d --scale api_gateway_service=3

# Scale workers
docker-compose up -d --scale email_service=3 --scale push_service=3
```

#### Vertical Scaling
Update resource limits in `docker-compose.yml`:
```yaml
services:
  api_gateway_service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## 📊 Monitoring

### Health Checks

All services expose health endpoints:

```bash
# Check service health
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Template Service
curl http://localhost:3003/health  # Email Service
curl http://localhost:3004/health  # Push Service
```

### Logs

View service logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api_gateway_service

# Last 100 lines
docker-compose logs --tail=100 email_service

# Follow logs with timestamps
docker-compose logs -f -t user_service
```

### Redis Monitoring

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# View all keys
KEYS *

# View rate limit data
KEYS rate_limit:*

# View cached data
KEYS user:*
KEYS template:*

# View idempotency keys
KEYS idempotency:*

# Monitor commands in real-time
MONITOR
```

### RabbitMQ Management

Access RabbitMQ Management UI:
- **URL**: http://localhost:15672
- **Username**: `user`
- **Password**: `password`

**Features:**
- View queues and messages
- Monitor message rates
- Check consumer status
- View dead letter queue

### Database Monitoring

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres

# List databases
\l

# Connect to user database
\c user_db

# List tables
\dt

# View users
SELECT * FROM "User" LIMIT 10;

# Connect to template database
\c template_db

# View templates
SELECT * FROM "Template" LIMIT 10;
```

### Circuit Breaker Status

Check circuit breaker stats via health endpoints:

```bash
# Email service circuit breaker
curl http://localhost:3003/health | jq '.circuit_breaker'

# Push service circuit breaker
curl http://localhost:3004/health | jq '.circuit_breaker'
```

### Metrics (Future Enhancement)

Planned integrations:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **ELK Stack**: Centralized logging
- **Jaeger**: Distributed tracing

## 🐛 Troubleshooting

### Common Issues

#### Services Not Starting

**Problem**: Services fail to start or crash immediately

**Solutions**:
```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check port conflicts
netstat -an | grep -E "3000|3001|3002|5432|6379|5672"
```

#### Database Connection Errors

**Problem**: `Error: connect ECONNREFUSED` or `Connection refused`

**Solutions**:
```bash
# Wait for PostgreSQL to be ready
docker-compose logs postgres

# Restart services
docker-compose restart user_service template_service

# Check database health
docker-compose exec postgres pg_isready
```

#### RabbitMQ Connection Issues

**Problem**: Workers can't connect to RabbitMQ

**Solutions**:
```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq

# Wait for RabbitMQ to be ready (takes 30-60 seconds)
sleep 60
docker-compose restart email_service push_service
```

#### Email Not Sending

**Problem**: Emails not being delivered

**Solutions**:
```bash
# Check email service logs
docker-compose logs email_service

# Verify SMTP credentials
docker-compose exec email_service env | grep SMTP

# Test SMTP connection
telnet smtp.gmail.com 587

# Check circuit breaker status
curl http://localhost:3003/health
```

**Common causes**:
- Invalid SMTP credentials
- Gmail App Password not generated
- SMTP server blocking connection
- Circuit breaker is OPEN

#### Push Notifications Not Working

**Problem**: Push notifications not being sent

**Solutions**:
```bash
# Check push service logs
docker-compose logs push_service

# Verify FCM configuration
docker-compose exec push_service ls -la fcm-service-account.json

# Check circuit breaker status
curl http://localhost:3004/health
```

**Common causes**:
- Missing FCM service account file
- Invalid FCM credentials
- Invalid push tokens
- Circuit breaker is OPEN

#### Rate Limiting Issues

**Problem**: Getting 429 Too Many Requests

**Solutions**:
```bash
# Check current rate limit
curl -I http://localhost:3000/health

# Clear rate limit data in Redis
docker-compose exec redis redis-cli FLUSHDB

# Adjust rate limit in .env
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

#### Cache Issues

**Problem**: Stale data being returned

**Solutions**:
```bash
# Clear all cache
docker-compose exec redis redis-cli FLUSHALL

# Clear specific cache
docker-compose exec redis redis-cli DEL "user:uuid"
docker-compose exec redis redis-cli DEL "template:name:template-name"

# Restart services to reconnect to Redis
docker-compose restart user_service template_service
```

#### Prisma Migration Issues

**Problem**: Database schema out of sync

**Solutions**:
```bash
# Reset user database
docker-compose exec user_service npx prisma migrate reset --force

# Reset template database
docker-compose exec template_service npx prisma migrate reset --force

# Run migrations manually
docker-compose exec user_service npx prisma migrate deploy
docker-compose exec template_service npx prisma migrate deploy
```

#### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use`

**Solutions**:
```bash
# Find process using port
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3010:3000"  # Use 3010 instead of 3000
```

#### Docker Out of Space

**Problem**: `no space left on device`

**Solutions**:
```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Debug Mode

Enable debug logging:

```bash
# Set NODE_ENV to development
NODE_ENV=development docker-compose up

# Or edit .env files
NODE_ENV=development
LOG_LEVEL=debug
```

### Getting Help

1. **Check Logs**: Always start with `docker-compose logs`
2. **Check Health**: Verify all services are healthy
3. **Check Documentation**: Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
4. **Check Issues**: Search [GitHub Issues](https://github.com/Brightmarc12/Distributed_Notification_System/issues)
5. **Create Issue**: If problem persists, create a new issue with:
   - Error message
   - Steps to reproduce
   - Service logs
   - Environment details

## 📖 Additional Documentation

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API reference
- **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)** - Architecture and design decisions
- **[CI_CD_DOCUMENTATION.md](CI_CD_DOCUMENTATION.md)** - CI/CD pipeline details
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Project progress and status
- **[.github/WORKFLOWS_GUIDE.md](.github/WORKFLOWS_GUIDE.md)** - GitHub Actions guide

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Test your changes**
   ```bash
   docker-compose up -d
   # Run tests
   ```
5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request**

### Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `perf:` - Performance improvements

### Code Style

- Use **snake_case** for all naming (files, variables, functions)
- Follow **ESLint** rules (if configured)
- Add **JSDoc comments** for functions
- Write **meaningful commit messages**

### Testing

- Add tests for new features
- Ensure all tests pass before submitting PR
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

This project was developed by a team of 4 as part of a distributed systems course.

**Team Members:**
- [Your Name] - [Role]
- [Team Member 2] - [Role]
- [Team Member 3] - [Role]
- [Team Member 4] - [Role]

## 🙏 Acknowledgments

- **Node.js Community** - For excellent libraries and tools
- **Docker** - For containerization platform
- **RabbitMQ** - For reliable message queuing
- **PostgreSQL** - For robust database system
- **Redis** - For high-performance caching
- **GitHub Actions** - For CI/CD automation

## 📞 Support

For support and questions:

- **GitHub Issues**: [Create an issue](https://github.com/Brightmarc12/Distributed_Notification_System/issues)
- **Documentation**: Check the docs folder
- **Email**: [Your email]

## 🗺️ Roadmap

### Completed ✅
- [x] Microservices architecture
- [x] Circuit breaker pattern
- [x] Rate limiting
- [x] Idempotency support
- [x] Redis caching
- [x] API documentation (Swagger)
- [x] CI/CD pipeline
- [x] Template versioning
- [x] Retry mechanism with exponential backoff

### In Progress 🚧
- [ ] Performance testing (1000+ notifications/min)
- [ ] Load testing and optimization

### Planned 📋
- [ ] SMS notification channel
- [ ] WhatsApp notification channel
- [ ] Notification status tracking
- [ ] Webhook support for delivery status
- [ ] User notification history
- [ ] Analytics dashboard
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Distributed tracing (Jaeger)
- [ ] Kubernetes deployment
- [ ] Multi-region support
- [ ] A/B testing for templates
- [ ] Scheduled notifications
- [ ] Notification batching

## 📊 Project Statistics

- **Services**: 5 microservices
- **Databases**: 2 PostgreSQL databases
- **Message Queues**: 3 RabbitMQ queues
- **API Endpoints**: 20+ endpoints
- **Docker Images**: 5 custom images
- **Lines of Code**: ~5000+ lines
- **Test Coverage**: Comprehensive integration tests
- **Documentation**: 1000+ lines

## 🎓 Learning Outcomes

This project demonstrates:

- ✅ **Microservices Architecture** - Service decomposition and communication
- ✅ **Message Queue Patterns** - Asynchronous processing with RabbitMQ
- ✅ **Fault Tolerance** - Circuit breakers and retry mechanisms
- ✅ **Caching Strategies** - Redis caching with invalidation
- ✅ **Rate Limiting** - Sliding window algorithm
- ✅ **API Design** - RESTful APIs with proper status codes
- ✅ **Database Design** - Relational modeling with Prisma
- ✅ **Containerization** - Docker and Docker Compose
- ✅ **CI/CD** - Automated testing and deployment
- ✅ **Documentation** - Comprehensive API and system documentation

---

**Built with ❤️ by the Distributed Systems Team**

**⭐ Star this repository if you find it helpful!**


