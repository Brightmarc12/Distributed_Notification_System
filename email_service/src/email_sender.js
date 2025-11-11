import nodemailer from 'nodemailer';
import CircuitBreaker from 'opossum';
import 'dotenv/config';

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Internal function to send email via SMTP
 * @param {object} mailOptions - Nodemailer mail options
 * @returns {Promise<object>}
 */
const send_email_internal = async (mailOptions) => {
  return await transporter.sendMail(mailOptions);
};

// Circuit breaker configuration
const circuitBreakerOptions = {
  timeout: 10000, // 10 seconds timeout
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 10000, // Rolling window for error calculation
  rollingCountBuckets: 10, // Number of buckets in the rolling window
  name: 'emailCircuitBreaker',
};

// Create circuit breaker for email sending
const emailCircuitBreaker = new CircuitBreaker(send_email_internal, circuitBreakerOptions);

// Circuit breaker event listeners
emailCircuitBreaker.on('open', () => {
  console.log('⚠️  Circuit breaker OPENED - SMTP service appears to be down');
});

emailCircuitBreaker.on('halfOpen', () => {
  console.log('🔄 Circuit breaker HALF-OPEN - Testing SMTP service');
});

emailCircuitBreaker.on('close', () => {
  console.log('✅ Circuit breaker CLOSED - SMTP service is healthy');
});

emailCircuitBreaker.fallback(() => {
  console.log('🔴 Circuit breaker fallback triggered - SMTP service unavailable');
  throw new Error('Email service temporarily unavailable. Circuit breaker is open.');
});

/**
 * Sends an email with circuit breaker protection.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The email subject.
 * @param {string} htmlBody - The HTML content of the email.
 * @returns {Promise<void>}
 */
export const send_email = async (to, subject, htmlBody) => {
  const mailOptions = {
    from: process.env.SMTP_FROM_EMAIL,
    to: to,
    subject: subject,
    html: htmlBody, // We send HTML emails
  };

  try {
    const info = await emailCircuitBreaker.fire(mailOptions);
    console.log('Email sent successfully. Message ID:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error.message);
    // Throw the error so the message handler can decide to retry or dead-letter the message
    throw error;
  }
};

// Export circuit breaker stats for monitoring
export const get_circuit_breaker_stats = () => {
  return {
    name: emailCircuitBreaker.name,
    state: emailCircuitBreaker.opened ? 'OPEN' : emailCircuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    stats: emailCircuitBreaker.stats,
  };
};