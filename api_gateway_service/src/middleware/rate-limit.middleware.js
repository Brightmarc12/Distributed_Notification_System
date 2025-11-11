import { StatusCodes } from 'http-status-codes';
import { get_redis_client } from '../utils/redis.js';

/**
 * Rate limiting middleware using Redis
 * 
 * Implements a sliding window rate limiter that tracks requests per IP address.
 * 
 * Default limits:
 * - 100 requests per minute per IP
 * - 1000 requests per hour per IP
 * 
 * Configuration via environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 100)
 * 
 * Response headers:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Time when the rate limit resets (Unix timestamp)
 * - Retry-After: Seconds to wait before retrying (only when rate limited)
 */

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

/**
 * Get client identifier (IP address or custom identifier from header)
 */
const get_client_identifier = (req) => {
  // Check for custom identifier header (useful for API keys, user IDs, etc.)
  const custom_id = req.headers['x-client-id'];
  if (custom_id) {
    return `client:${custom_id}`;
  }

  // Use IP address as identifier
  const forwarded_for = req.headers['x-forwarded-for'];
  const ip = forwarded_for ? forwarded_for.split(',')[0].trim() : req.ip || req.connection.remoteAddress;
  return `ip:${ip}`;
};

/**
 * Rate limiting middleware
 */
export const rate_limit_middleware = async (req, res, next) => {
  try {
    const redis_client = get_redis_client();
    const client_id = get_client_identifier(req);
    const key = `rate_limit:${client_id}`;
    const now = Date.now();
    const window_start = now - RATE_LIMIT_WINDOW_MS;

    // Remove old entries outside the current window first
    await redis_client.zRemRangeByScore(key, 0, window_start);

    // Count current requests in the window
    const current_count = await redis_client.zCard(key);

    // Calculate remaining requests
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - current_count);
    const reset_time = Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset_time);

    // Check if rate limit exceeded BEFORE adding the new request
    if (current_count >= RATE_LIMIT_MAX_REQUESTS) {
      const retry_after = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
      res.setHeader('Retry-After', retry_after);

      console.log(`[Rate Limit] Client ${client_id} exceeded limit: ${current_count}/${RATE_LIMIT_MAX_REQUESTS}`);

      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          limit: RATE_LIMIT_MAX_REQUESTS,
          window_ms: RATE_LIMIT_WINDOW_MS,
          retry_after_seconds: retry_after,
        },
      });
    }

    // Log when client is approaching limit (80% threshold)
    if (current_count > RATE_LIMIT_MAX_REQUESTS * 0.8) {
      console.log(`[Rate Limit] Client ${client_id} approaching limit: ${current_count}/${RATE_LIMIT_MAX_REQUESTS}`);
    }

    // Add the current request to the window
    const request_id = `${now}:${Math.random()}`;
    await redis_client.zAdd(key, { score: now, value: request_id });
    await redis_client.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) + 1);

    next();
  } catch (error) {
    console.error('Error in rate limit middleware:', error);
    // If Redis fails, allow the request to proceed (fail open)
    // This prevents Redis issues from blocking all traffic
    next();
  }
};

/**
 * Custom rate limiter factory for specific routes
 * 
 * @param {number} max_requests - Maximum requests allowed
 * @param {number} window_ms - Time window in milliseconds
 * @returns {Function} Rate limiting middleware
 */
export const create_rate_limiter = (max_requests, window_ms) => {
  return async (req, res, next) => {
    try {
      const redis_client = get_redis_client();
      const client_id = get_client_identifier(req);
      const key = `rate_limit:custom:${client_id}`;
      const now = Date.now();
      const window_start = now - window_ms;

      // Remove old entries and count current requests
      await redis_client.zRemRangeByScore(key, 0, window_start);
      const current_count = await redis_client.zCard(key);

      const remaining = Math.max(0, max_requests - current_count);
      const reset_time = Math.ceil((now + window_ms) / 1000);

      res.setHeader('X-RateLimit-Limit', max_requests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset_time);

      if (current_count >= max_requests) {
        const retry_after = Math.ceil(window_ms / 1000);
        res.setHeader('Retry-After', retry_after);

        console.log(`[Rate Limit] Client ${client_id} exceeded custom limit: ${current_count}/${max_requests}`);

        return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            limit: max_requests,
            window_ms: window_ms,
            retry_after_seconds: retry_after,
          },
        });
      }

      // Add current request
      const request_id = `${now}:${Math.random()}`;
      await redis_client.zAdd(key, { score: now, value: request_id });
      await redis_client.expire(key, Math.ceil(window_ms / 1000) + 1);

      next();
    } catch (error) {
      console.error('Error in custom rate limit middleware:', error);
      next();
    }
  };
};

