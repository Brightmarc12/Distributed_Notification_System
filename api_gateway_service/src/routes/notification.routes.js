import { Router } from 'express';
import { send_notification } from '../controllers/notification.controller.js';
import { idempotency_middleware } from '../middleware/idempotency.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/v1/notify:
 *   post:
 *     summary: Send a notification
 *     description: |
 *       Sends a notification to a user using a specified template.
 *       The request is processed asynchronously - this endpoint returns immediately with 202 Accepted.
 *
 *       **Features:**
 *       - Asynchronous processing (fire-and-forget)
 *       - Idempotency support via Idempotency-Key header
 *       - Rate limiting (100 requests/minute per IP)
 *       - Circuit breaker protection
 *
 *       **Flow:**
 *       1. Validates request
 *       2. Fetches user data from User Service
 *       3. Fetches template from Template Service
 *       4. Publishes message to RabbitMQ
 *       5. Returns 202 Accepted immediately
 *       6. Workers process the message asynchronously
 *     tags:
 *       - Notifications
 *     parameters:
 *       - $ref: '#/components/parameters/IdempotencyKey'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationRequest'
 *           examples:
 *             login_alert:
 *               summary: Login alert notification
 *               value:
 *                 user_id: "a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2"
 *                 template_name: "new-login-alert"
 *                 variables:
 *                   location: "New York, USA"
 *             welcome_email:
 *               summary: Welcome email
 *               value:
 *                 user_id: "a61f9f2c-6e4c-49d9-80e6-bfb3ef7e09c2"
 *                 template_name: "welcome-email"
 *                 variables:
 *                   app_name: "MyApp"
 *     responses:
 *       202:
 *         description: Notification request accepted and is being processed
 *         headers:
 *           X-RateLimit-Limit:
 *             schema:
 *               type: integer
 *             description: Maximum requests allowed per window
 *           X-RateLimit-Remaining:
 *             schema:
 *               type: integer
 *             description: Remaining requests in current window
 *           X-RateLimit-Reset:
 *             schema:
 *               type: integer
 *             description: Unix timestamp when the rate limit resets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *             examples:
 *               success:
 *                 summary: New request
 *                 value:
 *                   success: true
 *                   message: "Notification request accepted and is being processed."
 *               idempotent:
 *                 summary: Duplicate request (idempotent)
 *                 value:
 *                   success: true
 *                   message: "Notification request accepted and is being processed."
 *                   idempotent: true
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User or template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/notify', idempotency_middleware, send_notification);

export default router;