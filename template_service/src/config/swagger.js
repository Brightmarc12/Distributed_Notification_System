import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Template Service API',
      version: '1.0.0',
      description: `
# Template Service

Manages notification templates with versioning support.

## Features
- Template CRUD operations
- Template versioning (multiple versions per template)
- Active/inactive version management
- Redis caching (10-minute TTL)
- Automatic cache invalidation
- Support for EMAIL and PUSH notification types

## Template Versioning
- Each template can have multiple versions
- Only one version can be active at a time
- Creating a new version automatically deactivates the previous one
- Version numbers are auto-incremented
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Templates',
        description: 'Template management operations',
      },
      {
        name: 'Health',
        description: 'Health check',
      },
    ],
    components: {
      schemas: {
        Template: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'welcome-email',
            },
            type: {
              type: 'string',
              enum: ['EMAIL', 'PUSH'],
              example: 'EMAIL',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
            versions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TemplateVersion',
              },
            },
          },
        },
        TemplateVersion: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            subject: {
              type: 'string',
              example: 'Welcome to MyApp!',
            },
            body: {
              type: 'string',
              example: 'Hello {{first_name}}, welcome to our platform!',
            },
            language: {
              type: 'string',
              example: 'en',
            },
            version: {
              type: 'integer',
              example: 1,
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            template_id: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateTemplateRequest: {
          type: 'object',
          required: ['name', 'type', 'subject', 'body'],
          properties: {
            name: {
              type: 'string',
              example: 'welcome-email',
            },
            type: {
              type: 'string',
              enum: ['EMAIL', 'PUSH'],
              example: 'EMAIL',
            },
            subject: {
              type: 'string',
              example: 'Welcome to MyApp!',
            },
            body: {
              type: 'string',
              example: 'Hello {{first_name}}, welcome to our platform!',
            },
            language: {
              type: 'string',
              default: 'en',
              example: 'en',
            },
          },
        },
        UpdateTemplateRequest: {
          type: 'object',
          required: ['subject', 'body'],
          properties: {
            subject: {
              type: 'string',
            },
            body: {
              type: 'string',
            },
            language: {
              type: 'string',
              default: 'en',
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

