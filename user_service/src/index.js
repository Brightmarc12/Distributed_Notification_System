import express from 'express';
import 'dotenv/config';
import { StatusCodes } from 'http-status-codes';
import swaggerUi from 'swagger-ui-express';
import userRoutes from './routes/user.routes.js';
import { connect_redis, close_redis } from './utils/redis.js';
import { swaggerSpec } from './config/swagger.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// --- Swagger Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'User Service API',
}));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// --- Routes ---
app.use('/api/v1/users', userRoutes);

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
  res.status(StatusCodes.OK).json({ message: 'User service is healthy' });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

const startServer = async () => {
  try {
    // Connect to Redis
    await connect_redis();

    const server = app.listen(PORT, () => {
      console.log(`User service is running on port ${PORT}`);
      console.log(`Available routes:`);
      console.log(`  POST   /api/v1/users - Create user`);
      console.log(`  GET    /api/v1/users - List all users (with pagination)`);
      console.log(`  GET    /api/v1/users/:id - Get user by ID`);
      console.log(`  PUT    /api/v1/users/:id - Update user`);
      console.log(`  DELETE /api/v1/users/:id - Delete user`);
      console.log(`  PUT    /api/v1/users/:id/preferences - Update notification preferences`);
      console.log(`  POST   /api/v1/users/:id/push-tokens - Add push token`);
      console.log(`  DELETE /api/v1/users/:id/push-tokens/:token_id - Remove push token`);
      console.log(`  GET    /health - Health check`);
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
