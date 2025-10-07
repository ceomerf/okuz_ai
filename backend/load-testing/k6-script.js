import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const throughput = new Counter('throughput');
const concurrentUsers = new Gauge('concurrent_users');
const databaseConnections = new Gauge('database_connections');
const redisConnections = new Gauge('redis_connections');
const memoryUsage = new Gauge('memory_usage');
const cpuUsage = new Gauge('cpu_usage');

// Test configuration
export const options = {
  stages: [
    // Warm-up phase
    { duration: '1m', target: 10 },
    // Ramp-up phase
    { duration: '5m', target: 50 },
    // Sustained load phase
    { duration: '10m', target: 100 },
    // Peak load phase
    { duration: '5m', target: 200 },
    // Cool-down phase
    { duration: '2m', target: 20 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    error_rate: ['rate<0.1'],
    response_time: ['p(95)<2000'],
    throughput: ['count>1000'],
  },
  ext: {
    loadimpact: {
      projectID: 'okuz-ai-load-test',
      name: 'Okuz AI Load Test',
    },
  },
};

// Base URL
const BASE_URL = 'https://api.okuz-ai.com';

// Test data
const testUsers = [];
const testPlans = [];
const testSessions = [];

// Helper functions
function generateRandomEmail() {
  return `test_${Math.random().toString(36).substr(2, 9)}@example.com`;
}

function generateRandomName() {
  return `TestUser_${Math.random().toString(36).substr(2, 9)}`;
}

function generateRandomString(length = 10) {
  return Math.random().toString(36).substr(2, length);
}

function generateRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Authentication functions
function registerUser() {
  const email = generateRandomEmail();
  const password = 'TestPassword123!';
  const name = generateRandomName();
  
  const payload = {
    email: email,
    password: password,
    name: name,
    role: 'STUDENT'
  };
  
  const response = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(response, {
    'register status is 201': (r) => r.status === 201,
    'register response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  if (success && response.json('data.accessToken')) {
    testUsers.push({
      email: email,
      password: password,
      name: name,
      accessToken: response.json('data.accessToken')
    });
  }
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success ? response.json('data.accessToken') : null;
}

function loginUser(email, password) {
  const payload = {
    email: email,
    password: password
  };
  
  const response = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success ? response.json('data.accessToken') : null;
}

function getCurrentUser(accessToken) {
  const response = http.get(`${BASE_URL}/api/v1/auth/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  const success = check(response, {
    'get current user status is 200': (r) => r.status === 200,
    'get current user response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

// Planning functions
function createPlan(accessToken) {
  const payload = {
    title: `Test Plan ${generateRandomString()}`,
    description: `Test plan description ${generateRandomString()}`,
    subject: 'Mathematics',
    grade: generateRandomInt(1, 12),
    difficulty: generateRandomInt(1, 10),
    estimatedDuration: generateRandomInt(30, 300)
  };
  
  const response = http.post(`${BASE_URL}/api/v1/planning/plans`, JSON.stringify(payload), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
  
  const success = check(response, {
    'create plan status is 201': (r) => r.status === 201,
    'create plan response time < 3000ms': (r) => r.timings.duration < 3000,
  });
  
  if (success && response.json('data.id')) {
    testPlans.push(response.json('data.id'));
  }
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success ? response.json('data.id') : null;
}

function getPlan(accessToken, planId) {
  const response = http.get(`${BASE_URL}/api/v1/planning/plans/${planId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  const success = check(response, {
    'get plan status is 200': (r) => r.status === 200,
    'get plan response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

function updatePlan(accessToken, planId) {
  const payload = {
    title: `Updated Test Plan ${generateRandomString()}`,
    description: `Updated test plan description ${generateRandomString()}`
  };
  
  const response = http.put(`${BASE_URL}/api/v1/planning/plans/${planId}`, JSON.stringify(payload), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
  
  const success = check(response, {
    'update plan status is 200': (r) => r.status === 200,
    'update plan response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

function deletePlan(accessToken, planId) {
  const response = http.del(`${BASE_URL}/api/v1/planning/plans/${planId}`, null, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  const success = check(response, {
    'delete plan status is 200': (r) => r.status === 200,
    'delete plan response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

// AI Service functions
function generateContent(accessToken) {
  const payload = {
    prompt: 'Generate a study plan for mathematics grade 9',
    promptType: 'study_plan',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  };
  
  const response = http.post(`${BASE_URL}/api/v1/ai/generate`, JSON.stringify(payload), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
  
  const success = check(response, {
    'generate content status is 200': (r) => r.status === 200,
    'generate content response time < 10000ms': (r) => r.timings.duration < 10000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

function analyzeText(accessToken) {
  const payload = {
    text: 'I am struggling with algebra and need help with quadratic equations',
    analysisType: 'emotional'
  };
  
  const response = http.post(`${BASE_URL}/api/v1/ai/analyze`, JSON.stringify(payload), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
  
  const success = check(response, {
    'analyze text status is 200': (r) => r.status === 200,
    'analyze text response time < 5000ms': (r) => r.timings.duration < 5000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

// Notification functions
function sendNotification(accessToken) {
  const payload = {
    type: 'INFO',
    title: 'Test Notification',
    message: 'This is a test notification',
    channels: ['push', 'email'],
    priority: 'medium'
  };
  
  const response = http.post(`${BASE_URL}/api/v1/notifications/send`, JSON.stringify(payload), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
  
  const success = check(response, {
    'send notification status is 200': (r) => r.status === 200,
    'send notification response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

function getNotifications(accessToken) {
  const response = http.get(`${BASE_URL}/api/v1/notifications`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  
  const success = check(response, {
    'get notifications status is 200': (r) => r.status === 200,
    'get notifications response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

// Health check functions
function checkHealth() {
  const response = http.get(`${BASE_URL}/health`);
  
  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  throughput.add(1);
  
  return success;
}

// Main test function
export default function() {
  // Update concurrent users metric
  concurrentUsers.add(__VU);
  
  // Random scenario selection
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // Authentication Flow (30%)
    const accessToken = registerUser();
    if (accessToken) {
      getCurrentUser(accessToken);
    }
  } else if (scenario < 0.55) {
    // Planning Flow (25%)
    const accessToken = testUsers.length > 0 ? testUsers[0].accessToken : registerUser();
    if (accessToken) {
      const planId = createPlan(accessToken);
      if (planId) {
        getPlan(accessToken, planId);
        updatePlan(accessToken, planId);
        deletePlan(accessToken, planId);
      }
    }
  } else if (scenario < 0.75) {
    // AI Service Flow (20%)
    const accessToken = testUsers.length > 0 ? testUsers[0].accessToken : registerUser();
    if (accessToken) {
      generateContent(accessToken);
      analyzeText(accessToken);
    }
  } else if (scenario < 0.90) {
    // Notification Flow (15%)
    const accessToken = testUsers.length > 0 ? testUsers[0].accessToken : registerUser();
    if (accessToken) {
      sendNotification(accessToken);
      getNotifications(accessToken);
    }
  } else {
    // Health Check Flow (10%)
    checkHealth();
  }
  
  // Random sleep between requests
  sleep(Math.random() * 2);
}

// Setup function
export function setup() {
  console.log('Starting Okuz AI Load Test...');
  return { startTime: new Date().toISOString() };
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed at:', new Date().toISOString());
  console.log('Test started at:', data.startTime);
}
