import express from 'express';
import 'dotenv/config';
import { StatusCodes } from 'http-status-codes';
import swaggerUi from 'swagger-ui-express';
import { connect_rabbitmq, close_rabbitmq } from './utils/rabbitmq.js';
import { connect_redis, close_redis } from './utils/redis.js';
import notificationRoutes from './routes/notification.routes.js';
import { get_all_circuit_breaker_stats } from './utils/circuit-breaker.js';
import { rate_limit_middleware } from './middleware/rate-limit.middleware.js';
import { swaggerSpec } from './config/swagger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- Swagger Documentation ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Notification System API',
}));

// Serve swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// --- Global Rate Limiting ---
// Apply rate limiting to all routes (except health check and docs)
app.use((req, res, next) => {
  // Skip rate limiting for health check and API docs
  if (req.path === '/health' || req.path.startsWith('/api-docs')) {
    return next();
  }
  return rate_limit_middleware(req, res, next);
});

// --- Routes ---
app.use('/api/v1', notificationRoutes);

// --- Health Check Endpoint ---
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns the health status of the API Gateway and circuit breaker states
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
  const circuitBreakerStats = get_all_circuit_breaker_stats();
  res.status(StatusCodes.OK).json({
    message: 'API Gateway service is healthy',
    circuit_breakers: circuitBreakerStats,
  });
});

// Start the server after connecting to RabbitMQ and Redis
const startServer = async () => {
  try {
    await connect_rabbitmq();
    await connect_redis();
    const server = app.listen(PORT, () => {
      console.log(`API Gateway is running on port ${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('HTTP server closed');
        await close_rabbitmq();
        await close_redis();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections - don't crash, just log
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit - just log the error
    });

    // Handle uncaught exceptions - log but don't crash immediately
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // In production, you might want to exit here, but for development, let's continue
      gracefulShutdown('uncaughtException').then(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
};

startServer();