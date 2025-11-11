/**
 * Performance Test: API Response Times
 * 
 * Tests response times for all API endpoints under load.
 * Target: < 100ms average response time
 * 
 * Usage:
 *   node test_api_response_times.js
 */

const http = require('http');

// Configuration
const CONFIG = {
  api_gateway_url: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  user_service_url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  template_service_url: process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3002',
  
  requests_per_endpoint: 100,
  target_avg_response_time: 100, // ms
};

// Test results
const results = {
  endpoints: [],
};

// Utility: Make HTTP request and measure time
function makeTimedRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      resolve({
        statusCode: 0,
        responseTime,
        success: false,
        error: error.message,
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test endpoint performance
async function testEndpoint(name, url, method = 'GET', data = null) {
  console.log(`\n📊 Testing: ${name}`);
  console.log(`   URL: ${method} ${url}`);
  console.log(`   Requests: ${CONFIG.requests_per_endpoint}`);

  const responseTimes = [];
  let successCount = 0;
  let failCount = 0;

  // Send requests sequentially to measure individual response times
  for (let i = 0; i < CONFIG.requests_per_endpoint; i++) {
    const result = await makeTimedRequest(url, method, data);
    responseTimes.push(result.responseTime);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // Progress indicator every 25 requests
    if ((i + 1) % 25 === 0) {
      process.stdout.write(`   Progress: ${i + 1}/${CONFIG.requests_per_endpoint}\r`);
    }
  }

  // Calculate statistics
  responseTimes.sort((a, b) => a - b);
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const min = responseTimes[0];
  const max = responseTimes[responseTimes.length - 1];
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.50)];
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
  const successRate = (successCount / CONFIG.requests_per_endpoint) * 100;

  const endpointResult = {
    name,
    url,
    method,
    requests: CONFIG.requests_per_endpoint,
    successCount,
    failCount,
    successRate,
    responseTimes: {
      avg,
      min,
      max,
      p50,
      p95,
      p99,
    },
    pass: avg <= CONFIG.target_avg_response_time && successRate >= 99,
  };

  results.endpoints.push(endpointResult);

  console.log(`   ✅ Complete`);
  console.log(`   Avg: ${avg.toFixed(2)}ms | Min: ${min}ms | Max: ${max}ms | P95: ${p95}ms`);
  console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`   Status: ${endpointResult.pass ? '✅ PASS' : '❌ FAIL'}`);

  return endpointResult;
}

// Print summary report
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 API RESPONSE TIME TEST RESULTS');
  console.log('='.repeat(80));

  console.log('\n📈 Summary by Endpoint:\n');
  console.log('   Endpoint                          | Avg (ms) | P95 (ms) | Success | Status');
  console.log('   ' + '-'.repeat(76));

  results.endpoints.forEach((endpoint) => {
    const name = endpoint.name.padEnd(33);
    const avg = endpoint.responseTimes.avg.toFixed(1).padStart(8);
    const p95 = endpoint.responseTimes.p95.toString().padStart(8);
    const success = `${endpoint.successRate.toFixed(1)}%`.padStart(7);
    const status = endpoint.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${name} | ${avg} | ${p95} | ${success} | ${status}`);
  });

  // Overall statistics
  const allAvgs = results.endpoints.map(e => e.responseTimes.avg);
  const overallAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
  const allPassed = results.endpoints.every(e => e.pass);

  console.log('\n📊 Overall Statistics:');
  console.log(`   Average Response Time: ${overallAvg.toFixed(2)} ms`);
  console.log(`   Target: < ${CONFIG.target_avg_response_time} ms`);
  console.log(`   Endpoints Tested: ${results.endpoints.length}`);
  console.log(`   Endpoints Passed: ${results.endpoints.filter(e => e.pass).length}`);
  console.log(`   Endpoints Failed: ${results.endpoints.filter(e => !e.pass).length}`);

  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('🎉 ALL ENDPOINTS PASSED!');
  } else {
    console.log('⚠️  SOME ENDPOINTS FAILED - Review results above');
  }
  console.log('='.repeat(80) + '\n');

  return allPassed;
}

// Main execution
async function main() {
  console.log('🔔 Distributed Notification System - API Response Time Test');
  console.log('='.repeat(80));
  console.log(`Target: Average response time < ${CONFIG.target_avg_response_time}ms`);

  // Test health endpoints
  await testEndpoint(
    'API Gateway Health',
    `${CONFIG.api_gateway_url}/health`,
    'GET'
  );

  await testEndpoint(
    'User Service Health',
    `${CONFIG.user_service_url}/health`,
    'GET'
  );

  await testEndpoint(
    'Template Service Health',
    `${CONFIG.template_service_url}/health`,
    'GET'
  );

  // Test User Service endpoints
  await testEndpoint(
    'User Service - List Users',
    `${CONFIG.user_service_url}/api/v1/users`,
    'GET'
  );

  // Test Template Service endpoints
  await testEndpoint(
    'Template Service - List Templates',
    `${CONFIG.template_service_url}/api/v1/templates`,
    'GET'
  );

  // Print summary
  const allPassed = printSummary();

  process.exit(allPassed ? 0 : 1);
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

