import CircuitBreaker from 'opossum';
import axios from 'axios';

/**
 * Create a circuit breaker for HTTP calls
 * @param {string} serviceName - Name of the service (for logging)
 * @returns {CircuitBreaker}
 */
const createHttpCircuitBreaker = (serviceName) => {
  const options = {
    timeout: 5000, // 5 seconds timeout
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000, // Try again after 30 seconds
    rollingCountTimeout: 10000, // Rolling window for error calculation
    rollingCountBuckets: 10, // Number of buckets in the rolling window
    name: `${serviceName}CircuitBreaker`,
  };

  const breaker = new CircuitBreaker(async (url) => {
    return await axios.get(url);
  }, options);

  // Event listeners
  breaker.on('open', () => {
    console.log(`⚠️  Circuit breaker OPENED for ${serviceName} - Service appears to be down`);
  });

  breaker.on('halfOpen', () => {
    console.log(`🔄 Circuit breaker HALF-OPEN for ${serviceName} - Testing service`);
  });

  breaker.on('close', () => {
    console.log(`✅ Circuit breaker CLOSED for ${serviceName} - Service is healthy`);
  });

  breaker.fallback(() => {
    console.log(`🔴 Circuit breaker fallback triggered for ${serviceName}`);
    const error = new Error(`${serviceName} is temporarily unavailable. Circuit breaker is open.`);
    error.circuitBreakerOpen = true;
    throw error;
  });

  return breaker;
};

// Create circuit breakers for each service
export const userServiceBreaker = createHttpCircuitBreaker('UserService');
export const templateServiceBreaker = createHttpCircuitBreaker('TemplateService');

/**
 * Get circuit breaker stats for monitoring
 */
export const get_all_circuit_breaker_stats = () => {
  return {
    user_service: {
      name: userServiceBreaker.name,
      state: userServiceBreaker.opened ? 'OPEN' : userServiceBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: userServiceBreaker.stats,
    },
    template_service: {
      name: templateServiceBreaker.name,
      state: templateServiceBreaker.opened ? 'OPEN' : templateServiceBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: templateServiceBreaker.stats,
    },
  };
};

