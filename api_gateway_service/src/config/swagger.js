import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification System API Gateway',
      version: '1.0.0',
      description: `
# Distributed Notification System - API Gateway

The API Gateway is the entry point for all notification requests in the distributed notification system.

## Features
- **Asynchronous Processing**: Fire-and-forget pattern with immediate 202 Accepted response
- **Circuit Breaker**: Protects against cascading failures
- **Rate Limiting**: 100 requests per minute per IP
- **Idempotency**: Prevents duplicate notifications using Idempotency-Key header
- **Multi-channel Support**: Email and Push notifications

## Architecture
The API Gateway:
1. Validates incoming notification requests
2. Fetches user data from User Service
3. Fetches template data from Template Service
4. Publishes messages to RabbitMQ queues
5. Returns immediate response (202 Accepted)

Workers (Email Service, Push Service) consume messages from queues and send notifications.

## Rate Limiting
- **Limit**: 100 requests per minute per IP
- **Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- **Status Code**: 429 Too Many Requests when exceeded

## Idempotency
Use the \`Idempotency-Key\` header to prevent duplicate notifications:
- Same key within 24 hours returns cached response
- Response includes \`"idempotent": true\` flag
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Notifications',
        description: 'Notification operations',
      },
      {
        name: 'Health',
        description: 'Health check and monitoring',
      },
    ],
    components: {
      schemas: {
        NotificationRequest: {
          type: 'object',
          required: ['user_id', 'template_name'],
          properties: {
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'UUID of the user to send notification to',
              example: 'a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2',
            },
            template_name: {
              type: 'string',
              description: 'Name of the notification template',
              example: 'new-login-alert',
            },
            variables: {
              type: 'object',
              description: 'Variables to substitute in the template',
              example: { location: 'New York, USA' },
            },
          },
        },
        NotificationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Notification request accepted and is being processed.',
            },
            idempotent: {
              type: 'boolean',
              description: 'True if this is a duplicate request (idempotency key matched)',
              example: false,
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
              },
            },
          },
        },
        RateLimitError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Too many requests. Please try again later.',
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'RATE_LIMIT_EXCEEDED',
                },
                limit: {
                  type: 'integer',
                  example: 100,
                },
                window_ms: {
                  type: 'integer',
                  example: 60000,
                },
                retry_after_seconds: {
                  type: 'integer',
                  example: 60,
                },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'API Gateway service is healthy',
            },
            circuit_breakers: {
              type: 'object',
              properties: {
                user_service: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    state: { type: 'string', enum: ['CLOSED', 'OPEN', 'HALF_OPEN'] },
                    stats: { type: 'object' },
                  },
                },
                template_service: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    state: { type: 'string', enum: ['CLOSED', 'OPEN', 'HALF_OPEN'] },
                    stats: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      parameters: {
        IdempotencyKey: {
          in: 'header',
          name: 'Idempotency-Key',
          schema: {
            type: 'string',
          },
          required: false,
          description: 'Unique key to prevent duplicate requests (valid for 24 hours)',
          example: 'unique-request-id-12345',
        },
      },
      responses: {
        RateLimitExceeded: {
          description: 'Too many requests',
          headers: {
            'X-RateLimit-Limit': {
              schema: { type: 'integer' },
              description: 'Maximum requests allowed per window',
            },
            'X-RateLimit-Remaining': {
              schema: { type: 'integer' },
              description: 'Remaining requests in current window',
            },
            'X-RateLimit-Reset': {
              schema: { type: 'integer' },
              description: 'Unix timestamp when the rate limit resets',
            },
            'Retry-After': {
              schema: { type: 'integer' },
              description: 'Seconds to wait before retrying',
            },
          },
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitError',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

