import express from 'express';
import 'dotenv/config';
import { StatusCodes } from 'http-status-codes';
import swaggerUi from 'swagger-ui-express';
import templateRoutes from './routes/template.routes.js';
import { connect_redis, close_redis } from './utils/redis.js';
import { swaggerSpec } from './config/swagger.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// --- Swagger Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Template Service API',
}));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// --- Routes ---
app.use('/api/v1/templates', templateRoutes);

// --- Health Check Endpoint ---
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'Template service is healthy' });
});

const startServer = async () => {
  try {
    // Connect to Redis
    await connect_redis();

    const server = app.listen(PORT, () => {
      console.log(`Template service is running on port ${PORT}`);
      console.log('Available endpoints:');
      console.log('  POST   /api/v1/templates - Create template');
      console.log('  GET    /api/v1/templates - List all templates (with pagination)');
      console.log('  GET    /api/v1/templates/name/:name - Get template by name (active version)');
      console.log('  GET    /api/v1/templates/:id - Get template by ID (all versions)');
      console.log('  PUT    /api/v1/templates/:id - Update template (creates new version)');
      console.log('  DELETE /api/v1/templates/:id - Delete template');
      console.log('  GET    /api/v1/templates/:id/versions - Get all versions of template');
      console.log('  GET    /health - Health check');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('HTTP server closed');
        await close_redis();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();