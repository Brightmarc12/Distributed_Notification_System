# 🚀 Performance Testing Guide

This directory contains comprehensive performance tests for the Distributed Notification System.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Suite](#test-suite)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Test Details](#test-details)
- [Performance Targets](#performance-targets)
- [Interpreting Results](#interpreting-results)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## 🎯 Overview

The performance test suite validates that the system meets the following requirements:

- **Throughput**: Handle 1000+ notifications per minute
- **Response Time**: Average API response time < 100ms
- **Success Rate**: >= 99.5% successful delivery
- **Scalability**: Maintain performance under concurrent load

## 📦 Test Suite

### Available Tests

1. **`test_notification_throughput.js`**
   - Tests high-volume notification processing
   - Validates throughput target (1000+ notifications/min)
   - Measures response times under load
   - Tests concurrent request handling

2. **`test_api_response_times.js`**
   - Tests individual API endpoint response times
   - Validates response time target (< 100ms average)
   - Tests all major endpoints
   - Measures P50, P95, P99 latencies

3. **`run_all_tests.sh`**
   - Runs all performance tests in sequence
   - Generates comprehensive report
   - Validates all services are healthy
   - Provides summary of results

## 📋 Prerequisites

### Required

- **Docker & Docker Compose**: All services must be running
- **Node.js 18+**: For running test scripts
- **curl**: For health checks (usually pre-installed)

### Optional

- **jq**: For JSON parsing in scripts
- **Apache Bench (ab)**: For additional load testing
- **k6**: For advanced load testing scenarios

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **CPU**: 2 cores minimum, 4 cores recommended
- **Disk**: 10GB free space
- **Network**: Stable internet connection (for email/push services)

## 🚀 Quick Start

### 1. Start All Services

```bash
# From project root
docker-compose up -d

# Wait for services to be ready (30-60 seconds)
docker-compose logs -f
```

### 2. Verify Services are Healthy

```bash
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Template Service
```

### 3. Run All Performance Tests

```bash
cd performance_tests

# Make script executable (first time only)
chmod +x run_all_tests.sh

# Run all tests
./run_all_tests.sh
```

### 4. View Results

Results are displayed in the console and saved to a timestamped report file:
```
performance_report_YYYYMMDD_HHMMSS.txt
```

## 📊 Test Details

### Test 1: Notification Throughput

**Purpose**: Validate the system can handle high-volume notification requests.

**What it tests**:
- Sends 1200 notifications in rapid succession
- Uses 50 concurrent requests
- Measures throughput (notifications per minute)
- Tracks response times (avg, min, max, P95, P99)
- Calculates success rate

**Configuration** (via environment variables):
```bash
TOTAL_NOTIFICATIONS=1200      # Total notifications to send
CONCURRENT_REQUESTS=50         # Concurrent requests
API_GATEWAY_URL=http://localhost:3000
USER_SERVICE_URL=http://localhost:3001
TEMPLATE_SERVICE_URL=http://localhost:3002
```

**Run individually**:
```bash
node test_notification_throughput.js
```

**Expected Results**:
- ✅ Throughput: >= 1000 notifications/minute
- ✅ Average Response Time: < 100ms
- ✅ Success Rate: >= 99.5%

### Test 2: API Response Times

**Purpose**: Validate individual API endpoints meet response time targets.

**What it tests**:
- Tests health endpoints for all services
- Tests User Service list endpoint
- Tests Template Service list endpoint
- Sends 100 requests per endpoint
- Measures response times (avg, min, max, P50, P95, P99)

**Configuration**:
```bash
REQUESTS_PER_ENDPOINT=100      # Requests per endpoint
TARGET_AVG_RESPONSE_TIME=100   # Target average (ms)
```

**Run individually**:
```bash
node test_api_response_times.js
```

**Expected Results**:
- ✅ All endpoints: Average < 100ms
- ✅ Success Rate: >= 99%

## 🎯 Performance Targets

### Primary Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Throughput | >= 1000 notifications/min | ✅ Yes |
| Avg Response Time | < 100ms | ✅ Yes |
| Success Rate | >= 99.5% | ✅ Yes |

### Secondary Targets

| Metric | Target | Critical |
|--------|--------|----------|
| P95 Response Time | < 200ms | ⚠️ Recommended |
| P99 Response Time | < 500ms | ⚠️ Recommended |
| Max Response Time | < 1000ms | ⚠️ Recommended |

## 📈 Interpreting Results

### Throughput Test Results

```
📊 PERFORMANCE TEST RESULTS
================================================================================

📈 Test Configuration:
   Total Notifications: 1200
   Concurrent Requests: 50
   Test Duration: 45.23s (0.75 min)

📊 Request Statistics:
   Requests Sent: 1200
   Requests Completed: 1200
   Successful: 1198 (99.83%)
   Failed: 2

⚡ Throughput:
   Requests/Second: 26.53
   Requests/Minute: 1591.80

⏱️  Response Times (ms):
   Average: 87.45 ms
   Min: 12 ms
   Max: 456 ms
   P50 (Median): 78 ms
   P95: 145 ms
   P99: 234 ms

🎯 Target Validation:
   Throughput (>= 1000 req/min): ✅ PASS (1591.80)
   Response Time (<= 100 ms): ✅ PASS (87.45 ms)
   Success Rate (>= 99.5%): ✅ PASS (99.83%)

🎉 ALL TESTS PASSED!
```

### What to Look For

#### ✅ Good Performance
- Throughput > 1000 req/min
- Average response time < 100ms
- Success rate > 99.5%
- P95 < 200ms
- No errors or very few errors

#### ⚠️ Acceptable Performance
- Throughput 800-1000 req/min
- Average response time 100-150ms
- Success rate 98-99.5%
- P95 < 300ms
- Few errors (< 1%)

#### ❌ Poor Performance
- Throughput < 800 req/min
- Average response time > 150ms
- Success rate < 98%
- P95 > 300ms
- Many errors (> 1%)

## 🐛 Troubleshooting

### Issue: Low Throughput

**Symptoms**: Throughput < 1000 req/min

**Possible Causes**:
1. **Insufficient Resources**: Docker containers may be resource-constrained
2. **Database Bottleneck**: PostgreSQL may be slow
3. **Redis Bottleneck**: Redis may be overloaded
4. **RabbitMQ Bottleneck**: Message queue may be slow

**Solutions**:
```bash
# Check Docker resource usage
docker stats

# Increase Docker resources (Docker Desktop settings)
# - CPU: 4+ cores
# - Memory: 8GB+

# Check database performance
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Check Redis performance
docker-compose exec redis redis-cli INFO stats

# Check RabbitMQ queue depth
# Visit http://localhost:15672 (user/password)
```

### Issue: High Response Times

**Symptoms**: Average response time > 100ms

**Possible Causes**:
1. **Network Latency**: Slow network between services
2. **Database Queries**: Slow database queries
3. **Cache Misses**: Redis cache not being used effectively
4. **Circuit Breaker Open**: Services in degraded state

**Solutions**:
```bash
# Check service logs
docker-compose logs api_gateway_service
docker-compose logs user_service
docker-compose logs template_service

# Check cache hit rate
docker-compose exec redis redis-cli INFO stats | grep keyspace

# Check circuit breaker status
curl http://localhost:3003/health | jq '.circuit_breaker'
curl http://localhost:3004/health | jq '.circuit_breaker'

# Restart services
docker-compose restart
```

### Issue: Low Success Rate

**Symptoms**: Success rate < 99.5%

**Possible Causes**:
1. **Service Errors**: Services returning errors
2. **Database Connection Issues**: Connection pool exhausted
3. **RabbitMQ Issues**: Message queue errors
4. **Rate Limiting**: Hitting rate limits

**Solutions**:
```bash
# Check error logs
docker-compose logs --tail=100 | grep -i error

# Check rate limiting
curl -I http://localhost:3000/health | grep RateLimit

# Clear rate limits
docker-compose exec redis redis-cli FLUSHDB

# Restart services
docker-compose restart
```

### Issue: Tests Fail to Start

**Symptoms**: Tests exit immediately with errors

**Possible Causes**:
1. **Services Not Running**: Docker containers not started
2. **Wrong Ports**: Services running on different ports
3. **Node.js Not Installed**: Missing Node.js

**Solutions**:
```bash
# Check services are running
docker-compose ps

# Start services
docker-compose up -d

# Check Node.js version
node --version  # Should be 18+

# Install Node.js if missing
# Visit https://nodejs.org/
```

## 🔧 Advanced Usage

### Custom Configuration

Run tests with custom parameters:

```bash
# High-volume test
TOTAL_NOTIFICATIONS=5000 CONCURRENT_REQUESTS=100 node test_notification_throughput.js

# Extended response time test
REQUESTS_PER_ENDPOINT=500 node test_api_response_times.js

# Custom service URLs
API_GATEWAY_URL=http://staging.example.com:3000 node test_notification_throughput.js
```

### Using Apache Bench

Test individual endpoints with Apache Bench:

```bash
# Install Apache Bench
# Ubuntu/Debian: apt-get install apache2-utils
# macOS: brew install httpd

# Test API Gateway health endpoint
ab -n 1000 -c 50 http://localhost:3000/health

# Test with POST request
ab -n 1000 -c 50 -p notification.json -T application/json http://localhost:3000/api/v1/notify
```

### Using k6 (Advanced)

For more advanced load testing scenarios:

```bash
# Install k6
# Visit https://k6.io/docs/getting-started/installation/

# Create k6 script (example)
cat > load_test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 50,
  duration: '60s',
};

export default function() {
  let res = http.get('http://localhost:3000/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
}
EOF

# Run k6 test
k6 run load_test.js
```

## 📊 Continuous Performance Testing

### GitHub Actions Integration

The performance tests can be integrated into your CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Start services
        run: docker-compose up -d
      - name: Wait for services
        run: sleep 60
      - name: Run performance tests
        run: cd performance_tests && ./run_all_tests.sh
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance_tests/performance_report_*.txt
```

## 📝 Best Practices

1. **Run tests multiple times**: Performance can vary, run 3-5 times and average results
2. **Warm up the system**: Run a small test first to warm up caches
3. **Monitor resources**: Watch CPU, memory, and disk usage during tests
4. **Test in isolation**: Don't run other heavy processes during tests
5. **Document results**: Save reports for comparison over time
6. **Test different scenarios**: Vary load patterns (steady, burst, ramp-up)

## 📞 Support

If you encounter issues with performance tests:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review service logs: `docker-compose logs`
3. Check system resources: `docker stats`
4. Create an issue on GitHub with test results and logs

---

**Happy Testing! 🚀**

