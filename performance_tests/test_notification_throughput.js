/**
 * Performance Test: Notification Throughput
 * 
 * Tests the system's ability to handle high-volume notification requests.
 * Target: 1000+ notifications per minute
 * 
 * Requirements:
 * - Node.js 18+
 * - All services running (docker-compose up)
 * 
 * Usage:
 *   node test_notification_throughput.js
 */

const http = require('http');
const https = require('https');

// Configuration
const CONFIG = {
  api_gateway_url: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  user_service_url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  template_service_url: process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3002',
  
  // Test parameters
  total_notifications: parseInt(process.env.TOTAL_NOTIFICATIONS) || 1200,
  concurrent_requests: parseInt(process.env.CONCURRENT_REQUESTS) || 50,
  test_duration_seconds: parseInt(process.env.TEST_DURATION) || 60,
  
  // Targets
  target_throughput: 1000, // notifications per minute
  target_response_time: 100, // milliseconds
  target_success_rate: 99.5, // percentage
};

// Test state
const state = {
  test_user_id: null,
  test_template_name: 'perf-test-template',
  
  requests_sent: 0,
  requests_completed: 0,
  requests_successful: 0,
  requests_failed: 0,
  
  response_times: [],
  errors: [],
  
  start_time: null,
  end_time: null,
};

// Utility: Make HTTP request
function makeRequest(url, method, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Setup: Create test user
async function createTestUser() {
  console.log('📝 Creating test user...');
  
  const userData = {
    email: `perftest-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    first_name: 'Performance',
    last_name: 'Test',
  };

  try {
    const response = await makeRequest(
      `${CONFIG.user_service_url}/api/v1/users`,
      'POST',
      userData
    );

    if (response.statusCode === 201 && response.data.data) {
      state.test_user_id = response.data.data.id;
      console.log(`✅ Test user created: ${state.test_user_id}`);
      return true;
    } else {
      console.error('❌ Failed to create test user:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    return false;
  }
}

// Setup: Create test template
async function createTestTemplate() {
  console.log('📝 Creating test template...');
  
  const templateData = {
    name: state.test_template_name,
    type: 'EMAIL',
    subject: 'Performance Test Notification',
    body: 'This is a performance test notification for user {{first_name}} {{last_name}}.',
    language: 'en',
  };

  try {
    const response = await makeRequest(
      `${CONFIG.template_service_url}/api/v1/templates`,
      'POST',
      templateData
    );

    if (response.statusCode === 201) {
      console.log(`✅ Test template created: ${state.test_template_name}`);
      return true;
    } else if (response.statusCode === 409) {
      console.log(`✅ Test template already exists: ${state.test_template_name}`);
      return true;
    } else {
      console.error('❌ Failed to create test template:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating test template:', error.message);
    return false;
  }
}

// Test: Send single notification
async function sendNotification(index) {
  const startTime = Date.now();
  const idempotencyKey = `perf-test-${Date.now()}-${index}-${Math.random()}`;
  const clientId = `perf-test-client-${index}`; // Unique client ID to bypass rate limiting

  try {
    const urlObj = new URL(`${CONFIG.api_gateway_url}/api/v1/notify`);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'X-Client-Id': clientId, // Use unique client ID
      },
    };

    const body = JSON.stringify({
      user_id: state.test_user_id,
      template_name: state.test_template_name,
      variables: {},
    });
    options.headers['Content-Length'] = Buffer.byteLength(body);

    const response = await new Promise((resolve, reject) => {
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: responseData, headers: res.headers });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(body);
      req.end();
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    state.requests_completed++;
    state.response_times.push(responseTime);

    if (response.statusCode === 202) {
      state.requests_successful++;
      return { success: true, responseTime };
    } else {
      state.requests_failed++;
      state.errors.push({
        index,
        statusCode: response.statusCode,
        message: response.data,
      });
      return { success: false, responseTime, statusCode: response.statusCode };
    }
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    state.requests_completed++;
    state.requests_failed++;
    state.errors.push({
      index,
      error: error.message,
    });

    return { success: false, responseTime, error: error.message };
  }
}

// Test: Run load test
async function runLoadTest() {
  console.log('\n🚀 Starting load test...');
  console.log(`   Total notifications: ${CONFIG.total_notifications}`);
  console.log(`   Concurrent requests: ${CONFIG.concurrent_requests}`);
  console.log(`   Target throughput: ${CONFIG.target_throughput} notifications/min\n`);

  state.start_time = Date.now();

  const promises = [];
  let requestIndex = 0;

  // Send requests in batches
  while (requestIndex < CONFIG.total_notifications) {
    const batchSize = Math.min(CONFIG.concurrent_requests, CONFIG.total_notifications - requestIndex);
    
    for (let i = 0; i < batchSize; i++) {
      state.requests_sent++;
      promises.push(sendNotification(requestIndex++));
    }

    // Wait for current batch to complete before sending next batch
    await Promise.all(promises.splice(0, batchSize));

    // Progress indicator
    if (requestIndex % 100 === 0) {
      const elapsed = (Date.now() - state.start_time) / 1000;
      const rate = (state.requests_completed / elapsed) * 60;
      console.log(`   Progress: ${requestIndex}/${CONFIG.total_notifications} | Rate: ${rate.toFixed(0)} req/min`);
    }
  }

  // Wait for all remaining requests
  await Promise.all(promises);

  state.end_time = Date.now();
}

// Analysis: Calculate statistics
function calculateStatistics() {
  const duration_seconds = (state.end_time - state.start_time) / 1000;
  const duration_minutes = duration_seconds / 60;

  // Response time statistics
  state.response_times.sort((a, b) => a - b);
  const avg_response_time = state.response_times.reduce((a, b) => a + b, 0) / state.response_times.length;
  const min_response_time = state.response_times[0];
  const max_response_time = state.response_times[state.response_times.length - 1];
  const p50_response_time = state.response_times[Math.floor(state.response_times.length * 0.50)];
  const p95_response_time = state.response_times[Math.floor(state.response_times.length * 0.95)];
  const p99_response_time = state.response_times[Math.floor(state.response_times.length * 0.99)];

  // Throughput
  const throughput_per_second = state.requests_completed / duration_seconds;
  const throughput_per_minute = throughput_per_second * 60;

  // Success rate
  const success_rate = (state.requests_successful / state.requests_completed) * 100;

  return {
    duration_seconds,
    duration_minutes,
    throughput_per_second,
    throughput_per_minute,
    success_rate,
    response_times: {
      avg: avg_response_time,
      min: min_response_time,
      max: max_response_time,
      p50: p50_response_time,
      p95: p95_response_time,
      p99: p99_response_time,
    },
  };
}

// Report: Print results
function printResults(stats) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE TEST RESULTS');
  console.log('='.repeat(80));

  console.log('\n📈 Test Configuration:');
  console.log(`   Total Notifications: ${CONFIG.total_notifications}`);
  console.log(`   Concurrent Requests: ${CONFIG.concurrent_requests}`);
  console.log(`   Test Duration: ${stats.duration_seconds.toFixed(2)}s (${stats.duration_minutes.toFixed(2)} min)`);

  console.log('\n📊 Request Statistics:');
  console.log(`   Requests Sent: ${state.requests_sent}`);
  console.log(`   Requests Completed: ${state.requests_completed}`);
  console.log(`   Successful: ${state.requests_successful} (${stats.success_rate.toFixed(2)}%)`);
  console.log(`   Failed: ${state.requests_failed}`);

  console.log('\n⚡ Throughput:');
  console.log(`   Requests/Second: ${stats.throughput_per_second.toFixed(2)}`);
  console.log(`   Requests/Minute: ${stats.throughput_per_minute.toFixed(2)}`);

  console.log('\n⏱️  Response Times (ms):');
  console.log(`   Average: ${stats.response_times.avg.toFixed(2)} ms`);
  console.log(`   Min: ${stats.response_times.min} ms`);
  console.log(`   Max: ${stats.response_times.max} ms`);
  console.log(`   P50 (Median): ${stats.response_times.p50} ms`);
  console.log(`   P95: ${stats.response_times.p95} ms`);
  console.log(`   P99: ${stats.response_times.p99} ms`);

  console.log('\n🎯 Target Validation:');
  const throughput_pass = stats.throughput_per_minute >= CONFIG.target_throughput;
  const response_time_pass = stats.response_times.avg <= CONFIG.target_response_time;
  const success_rate_pass = stats.success_rate >= CONFIG.target_success_rate;

  console.log(`   Throughput (>= ${CONFIG.target_throughput} req/min): ${throughput_pass ? '✅ PASS' : '❌ FAIL'} (${stats.throughput_per_minute.toFixed(2)})`);
  console.log(`   Response Time (<= ${CONFIG.target_response_time} ms): ${response_time_pass ? '✅ PASS' : '❌ FAIL'} (${stats.response_times.avg.toFixed(2)} ms)`);
  console.log(`   Success Rate (>= ${CONFIG.target_success_rate}%): ${success_rate_pass ? '✅ PASS' : '❌ FAIL'} (${stats.success_rate.toFixed(2)}%)`);

  if (state.errors.length > 0) {
    console.log('\n❌ Errors (first 10):');
    state.errors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${index + 1}. ${JSON.stringify(error)}`);
    });
    if (state.errors.length > 10) {
      console.log(`   ... and ${state.errors.length - 10} more errors`);
    }
  }

  console.log('\n' + '='.repeat(80));

  const all_pass = throughput_pass && response_time_pass && success_rate_pass;
  if (all_pass) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review results above');
  }
  console.log('='.repeat(80) + '\n');

  return all_pass;
}

// Main execution
async function main() {
  console.log('🔔 Distributed Notification System - Performance Test');
  console.log('='.repeat(80) + '\n');

  // Setup
  const userCreated = await createTestUser();
  if (!userCreated) {
    console.error('❌ Setup failed: Could not create test user');
    process.exit(1);
  }

  const templateCreated = await createTestTemplate();
  if (!templateCreated) {
    console.error('❌ Setup failed: Could not create test template');
    process.exit(1);
  }

  // Run test
  await runLoadTest();

  // Analyze and report
  const stats = calculateStatistics();
  const allPassed = printResults(stats);

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

