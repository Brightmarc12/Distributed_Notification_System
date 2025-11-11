# API Documentation

This document provides an overview of the API documentation available for the Distributed Notification System.

## Swagger/OpenAPI Documentation

All three main services have comprehensive Swagger/OpenAPI 3.0 documentation available through interactive web interfaces.

### Access Points

#### 1. API Gateway Service
- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json
- **Port**: 3000

**Endpoints Documented:**
- `POST /api/v1/notify` - Send a notification (with idempotency and rate limiting)
- `GET /health` - Health check with circuit breaker stats

**Features Documented:**
- Asynchronous processing (fire-and-forget pattern)
- Idempotency support via `Idempotency-Key` header
- Rate limiting (100 requests/minute per IP)
- Circuit breaker protection
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)

---

#### 2. User Service
- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json
- **Port**: 3001

**Endpoints Documented:**
- `POST /api/v1/users` - Create a new user
- `GET /api/v1/users` - List all users (with pagination)
- `GET /api/v1/users/{id}` - Get user by ID
- `PUT /api/v1/users/{id}` - Update user information
- `DELETE /api/v1/users/{id}` - Delete a user
- `PUT /api/v1/users/{id}/preferences` - Update notification preferences
- `POST /api/v1/users/{id}/push-tokens` - Add a push notification token
- `DELETE /api/v1/users/{id}/push-tokens/{token_id}` - Remove a push token
- `GET /health` - Health check

**Features Documented:**
- User CRUD operations
- Notification preferences management
- Push token management (for mobile devices)
- Redis caching (5-minute TTL)
- Automatic cache invalidation
- Pagination support

---

#### 3. Template Service
- **Swagger UI**: http://localhost:3002/api-docs
- **OpenAPI JSON**: http://localhost:3002/api-docs.json
- **Port**: 3002

**Endpoints Documented:**
- `POST /api/v1/templates` - Create a new template
- `GET /api/v1/templates` - List all templates (with pagination)
- `GET /api/v1/templates/{id}` - Get template by ID (with all versions)
- `GET /api/v1/templates/name/{name}` - Get template by name (active version only)
- `PUT /api/v1/templates/{id}` - Update template (creates new version)
- `DELETE /api/v1/templates/{id}` - Delete a template
- `GET /api/v1/templates/{id}/versions` - Get all versions of a template
- `GET /health` - Health check

**Features Documented:**
- Template CRUD operations
- Template versioning (multiple versions per template)
- Active/inactive version management
- Redis caching (10-minute TTL)
- Automatic cache invalidation
- Support for EMAIL and PUSH notification types

---

## Data Models

### User Service Models

#### User
```json
{
  "id": "uuid",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "notification_preference": { ... },
  "push_tokens": [ ... ]
}
```

#### NotificationPreference
```json
{
  "id": "uuid",
  "email_enabled": "boolean",
  "push_enabled": "boolean",
  "user_id": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### PushToken
```json
{
  "id": "uuid",
  "token": "string",
  "device_type": "ios | android | web",
  "device_name": "string",
  "user_id": "uuid",
  "created_at": "datetime"
}
```

### Template Service Models

#### Template
```json
{
  "id": "uuid",
  "name": "string",
  "type": "EMAIL | PUSH",
  "created_at": "datetime",
  "updated_at": "datetime",
  "versions": [ ... ]
}
```

#### TemplateVersion
```json
{
  "id": "uuid",
  "subject": "string",
  "body": "string",
  "language": "string",
  "version": "integer",
  "is_active": "boolean",
  "template_id": "uuid",
  "createdAt": "datetime"
}
```

---

## Response Format

All API responses follow a consistent snake_case naming convention:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Success Response with Pagination
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [ ... ],
  "meta": {
    "total": 100,
    "limit": 10,
    "page": 1,
    "total_pages": 10,
    "has_next": true,
    "has_previous": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

### Rate Limit Error (429)
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "limit": 100,
    "window_ms": 60000,
    "retry_after_seconds": 60
  }
}
```

---

## Special Headers

### Rate Limiting Headers (API Gateway)
- `X-RateLimit-Limit`: Maximum requests allowed per window (100)
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

### Idempotency Header (API Gateway)
- `Idempotency-Key`: Unique key to prevent duplicate requests (valid for 24 hours)

---

## Testing the APIs

### Using Swagger UI
1. Open the Swagger UI in your browser (see Access Points above)
2. Click on an endpoint to expand it
3. Click "Try it out"
4. Fill in the required parameters
5. Click "Execute"
6. View the response

### Using cURL

#### Send a Notification
```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "user_id": "a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2",
    "template_name": "new-login-alert",
    "variables": {
      "location": "New York, USA"
    }
  }'
```

#### Create a User
```bash
curl -X POST http://localhost:3001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

#### Create a Template
```bash
curl -X POST http://localhost:3002/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome-email",
    "type": "EMAIL",
    "subject": "Welcome to MyApp!",
    "body": "Hello {{first_name}}, welcome to our platform!",
    "language": "en"
  }'
```

---

## Implementation Details

### Technology Stack
- **Framework**: Express.js
- **Documentation**: swagger-jsdoc + swagger-ui-express
- **Specification**: OpenAPI 3.0.0

### Files Structure
```
api_gateway_service/
├── src/
│   ├── config/
│   │   └── swagger.js          # Swagger configuration
│   ├── routes/
│   │   └── notification.routes.js  # Route definitions with JSDoc annotations
│   └── index.js                # Swagger UI setup

user_service/
├── src/
│   ├── config/
│   │   └── swagger.js          # Swagger configuration
│   ├── docs/
│   │   └── user.swagger.js     # Detailed endpoint documentation
│   └── index.js                # Swagger UI setup

template_service/
├── src/
│   ├── config/
│   │   └── swagger.js          # Swagger configuration
│   ├── docs/
│   │   └── template.swagger.js # Detailed endpoint documentation
│   └── index.js                # Swagger UI setup
```

---

## Next Steps

The API documentation is now complete and accessible. You can:
1. Share the Swagger UI URLs with your team
2. Export the OpenAPI JSON for use with other tools
3. Use the documentation for integration testing
4. Reference it when implementing client applications

For the project submission, you can include screenshots of the Swagger UI or export the OpenAPI specifications.

