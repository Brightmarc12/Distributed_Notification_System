import { StatusCodes } from 'http-status-codes';
import { check_idempotency_key, set_idempotency_key, get_idempotency_value } from '../utils/redis.js';

/**
 * Middleware to handle idempotency for notification requests
 * 
 * Clients can provide an Idempotency-Key header to ensure that duplicate requests
 * are not processed multiple times. If the same key is used within 24 hours,
 * the original response will be returned.
 * 
 * Usage:
 * - Client sends: Idempotency-Key: <unique-key>
 * - If key exists: Return cached response (409 Conflict or 200 OK with cached data)
 * - If key doesn't exist: Process request and cache response
 */
export const idempotency_middleware = async (req, res, next) => {
  const idempotency_key = req.headers['idempotency-key'];

  // If no idempotency key provided, proceed normally
  if (!idempotency_key) {
    return next();
  }

  try {
    // Check if this request has been processed before
    const exists = await check_idempotency_key(`idempotency:${idempotency_key}`);

    if (exists) {
      // Request already processed, return cached response
      const cached_response = await get_idempotency_value(`idempotency:${idempotency_key}`);
      
      if (cached_response) {
        console.log(`[Idempotency] Duplicate request detected for key: ${idempotency_key}`);
        return res.status(StatusCodes.OK).json({
          success: true,
          message: 'Request already processed (idempotent)',
          data: cached_response,
          idempotent: true,
        });
      }
    }

    // Store the idempotency key to mark this request as being processed
    // We'll update it with the response after processing
    await set_idempotency_key(`idempotency:${idempotency_key}`, {
      status: 'processing',
      timestamp: new Date().toISOString(),
    }, 86400); // 24 hours TTL

    // Store the idempotency key in the request for later use
    req.idempotency_key = idempotency_key;

    // Intercept the response to cache it
    const original_json = res.json.bind(res);
    res.json = function (body) {
      // Cache the response for future duplicate requests
      if (req.idempotency_key) {
        set_idempotency_key(`idempotency:${req.idempotency_key}`, {
          status: 'completed',
          timestamp: new Date().toISOString(),
          response: body,
        }, 86400).catch(err => {
          console.error('Error caching idempotency response:', err);
        });
      }
      return original_json(body);
    };

    next();
  } catch (error) {
    console.error('Error in idempotency middleware:', error);
    // If Redis fails, proceed with the request (fail open)
    next();
  }
};

