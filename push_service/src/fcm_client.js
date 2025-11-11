import admin from 'firebase-admin';
import CircuitBreaker from 'opossum';
import 'dotenv/config';
import fs from 'fs';

// Initialize the Firebase Admin SDK
const serviceAccount = JSON.parse(
  fs.readFileSync(process.env.FCM_CREDENTIALS_PATH, 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log('Firebase Admin SDK initialized.');

/**
 * Internal function to send push notification via FCM
 * @param {object} message - FCM message object
 * @returns {Promise<string>}
 */
const send_push_internal = async (message) => {
  return await admin.messaging().send(message);
};

// Circuit breaker configuration
const circuitBreakerOptions = {
  timeout: 10000, // 10 seconds timeout
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 10000, // Rolling window for error calculation
  rollingCountBuckets: 10, // Number of buckets in the rolling window
  name: 'fcmCircuitBreaker',
};

// Create circuit breaker for FCM
const fcmCircuitBreaker = new CircuitBreaker(send_push_internal, circuitBreakerOptions);

// Circuit breaker event listeners
fcmCircuitBreaker.on('open', () => {
  console.log('⚠️  Circuit breaker OPENED - FCM service appears to be down');
});

fcmCircuitBreaker.on('halfOpen', () => {
  console.log('🔄 Circuit breaker HALF-OPEN - Testing FCM service');
});

fcmCircuitBreaker.on('close', () => {
  console.log('✅ Circuit breaker CLOSED - FCM service is healthy');
});

fcmCircuitBreaker.fallback(() => {
  console.log('🔴 Circuit breaker fallback triggered - FCM service unavailable');
  throw new Error('Push notification service temporarily unavailable. Circuit breaker is open.');
});

/**
 * Sends a push notification to a specific device with circuit breaker protection.
 * @param {string} deviceToken - The FCM registration token of the target device.
 * @param {string} title - The notification title.
 * @param {string} body - The notification body.
 * @returns {Promise<void>}
 */
export const send_push_notification = async (deviceToken, title, body) => {
  const message = {
    notification: {
      title,
      body,
    },
    token: deviceToken,
  };

  try {
    const response = await fcmCircuitBreaker.fire(message);
    console.log('Successfully sent push notification:', response);
  } catch (error) {
    console.error('Error sending push notification:', error.message);
    // Re-throw the error so the message handler knows it failed
    throw error;
  }
};

// Export circuit breaker stats for monitoring
export const get_circuit_breaker_stats = () => {
  return {
    name: fcmCircuitBreaker.name,
    state: fcmCircuitBreaker.opened ? 'OPEN' : fcmCircuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    stats: fcmCircuitBreaker.stats,
  };
};