import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

let redisClient = null;

export const connect_redis = async () => {
  try {
    console.log(`Connecting to Redis at: ${REDIS_URL}`);
    
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Redis: Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`Redis: Reconnecting in ${delay}ms...`);
          return delay;
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    await redisClient.connect();
    
    // Test connection
    await redisClient.ping();
    console.log('✅ Redis ping successful');
    
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const close_redis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
};

export const get_redis_client = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connect_redis() first.');
  }
  return redisClient;
};

// Idempotency functions
export const check_idempotency_key = async (key) => {
  try {
    const client = get_redis_client();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Error checking idempotency key:', error);
    // If Redis is down, allow the request to proceed (fail open)
    return false;
  }
};

export const set_idempotency_key = async (key, value, ttl_seconds = 86400) => {
  try {
    const client = get_redis_client();
    await client.setEx(key, ttl_seconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Error setting idempotency key:', error);
    // If Redis is down, allow the request to proceed (fail open)
    return false;
  }
};

export const get_idempotency_value = async (key) => {
  try {
    const client = get_redis_client();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting idempotency value:', error);
    return null;
  }
};

