import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CACHE_TTL = 300; // 5 minutes default TTL

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

// Cache functions
export const cache_get = async (key) => {
  try {
    const client = get_redis_client();
    const value = await client.get(key);
    if (value) {
      console.log(`[Cache HIT] ${key}`);
      return JSON.parse(value);
    }
    console.log(`[Cache MISS] ${key}`);
    return null;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null; // Fail open - return null if Redis is down
  }
};

export const cache_set = async (key, value, ttl = CACHE_TTL) => {
  try {
    const client = get_redis_client();
    await client.setEx(key, ttl, JSON.stringify(value));
    console.log(`[Cache SET] ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error('Error setting cache:', error);
    return false; // Fail open
  }
};

export const cache_delete = async (key) => {
  try {
    const client = get_redis_client();
    await client.del(key);
    console.log(`[Cache DELETE] ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting from cache:', error);
    return false;
  }
};

export const cache_delete_pattern = async (pattern) => {
  try {
    const client = get_redis_client();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[Cache DELETE] ${keys.length} keys matching pattern: ${pattern}`);
    }
    return true;
  } catch (error) {
    console.error('Error deleting cache pattern:', error);
    return false;
  }
};

