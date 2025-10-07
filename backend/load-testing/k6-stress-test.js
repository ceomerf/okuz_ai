import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    error_rate: ['rate<0.05'],          // Custom error rate below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Test data
  const testUser = {
    email: `testuser_${__VU}_${__ITER}@example.com`,
    password: 'password123',
    name: `Test User ${__VU}`,
  };

  // 1. Register new user
  const registerResponse = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: testUser.email,
    password: testUser.password,
    name: testUser.name,
    accountType: 'STUDENT'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const registerSuccess = check(registerResponse, {
    'register status is 201': (r) => r.status === 201,
    'register has access_token': (r) => JSON.parse(r.body).access_token !== undefined,
  });

  if (!registerSuccess) {
    errorRate.add(1);
    return;
  }

  const accessToken = JSON.parse(registerResponse.body).access_token;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 2. Create study plan
  const planResponse = http.post(`${BASE_URL}/planning/v2/generate-plan`, JSON.stringify({
    subjects: ['Mathematics', 'Physics'],
    goals: ['Pass exam', 'Improve grades'],
    availableTime: 180,
    planDurationDays: 7,
    planType: 'WEEKLY',
  }), { headers });

  const planSuccess = check(planResponse, {
    'plan creation status is 201': (r) => r.status === 201,
    'plan has sessions': (r) => JSON.parse(r.body).sessions !== undefined,
  });

  if (!planSuccess) {
    errorRate.add(1);
  }

  // 3. Get user plans
  const plansResponse = http.get(`${BASE_URL}/planning/v2/plans`, { headers });

  check(plansResponse, {
    'plans status is 200': (r) => r.status === 200,
    'plans is array': (r) => Array.isArray(JSON.parse(r.body)),
  });

  // 4. Use smart tools (with rate limiting)
  if (Math.random() < 0.3) { // 30% chance to use smart tools
    const smartToolResponse = http.post(`${BASE_URL}/smart-tools/sos-question-solver`, JSON.stringify({
      questionText: 'What is the derivative of x^2?',
      subject: 'Mathematics',
      grade: 10,
      userId: JSON.parse(registerResponse.body).user.id,
    }), { headers });

    check(smartToolResponse, {
      'smart tool status is 201': (r) => r.status === 201,
    });
  }

  sleep(1); // Wait 1 second between iterations
}
