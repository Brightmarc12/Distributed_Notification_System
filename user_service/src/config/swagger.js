import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description: `
# User Service

Manages users, notification preferences, and push notification tokens.

## Features
- User CRUD operations
- Notification preferences management
- Push token management (for mobile devices)
- Redis caching (5-minute TTL)
- Automatic cache invalidation

## Data Model
- **User**: Basic user information (email, name)
- **NotificationPreference**: Email/Push notification settings per user
- **PushToken**: FCM tokens for push notifications with device info
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Preferences',
        description: 'Notification preference operations',
      },
      {
        name: 'Push Tokens',
        description: 'Push notification token operations',
      },
      {
        name: 'Health',
        description: 'Health check',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            first_name: {
              type: 'string',
              example: 'John',
            },
            last_name: {
              type: 'string',
              example: 'Doe',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
            notification_preference: {
              $ref: '#/components/schemas/NotificationPreference',
            },
            push_tokens: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PushToken',
              },
            },
          },
        },
        NotificationPreference: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email_enabled: {
              type: 'boolean',
              example: true,
            },
            push_enabled: {
              type: 'boolean',
              example: true,
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PushToken: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            token: {
              type: 'string',
              description: 'FCM token',
              example: 'fcm_token_abc123',
            },
            device_type: {
              type: 'string',
              enum: ['ios', 'android', 'web'],
              example: 'android',
            },
            device_name: {
              type: 'string',
              example: 'Samsung Galaxy S21',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['email', 'password', 'first_name', 'last_name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'SecurePassword123!',
            },
            first_name: {
              type: 'string',
              example: 'John',
            },
            last_name: {
              type: 'string',
              example: 'Doe',
            },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            first_name: {
              type: 'string',
            },
            last_name: {
              type: 'string',
            },
          },
        },
        UpdatePreferencesRequest: {
          type: 'object',
          properties: {
            email_enabled: {
              type: 'boolean',
            },
            push_enabled: {
              type: 'boolean',
            },
          },
        },
        AddPushTokenRequest: {
          type: 'object',
          required: ['token', 'device_type'],
          properties: {
            token: {
              type: 'string',
              example: 'fcm_token_abc123',
            },
            device_type: {
              type: 'string',
              enum: ['ios', 'android', 'web'],
              example: 'android',
            },
            device_name: {
              type: 'string',
              example: 'Samsung Galaxy S21',
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            limit: { type: 'integer' },
            page: { type: 'integer' },
            total_pages: { type: 'integer' },
            has_next: { type: 'boolean' },
            has_previous: { type: 'boolean' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
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
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/docs/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

