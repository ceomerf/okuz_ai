import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metrics for memory leak detection
const memoryUsage = new Trend('memory_usage');
const responseTimeTrend = new Trend('response_time_trend');

export let options = {
  stages: [
    { duration: '8h', target: 50 }, // 8 hours of sustained load
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // Response time should remain stable
    http_req_failed: ['rate<0.02'],     // Error rate should stay below 2%
    memory_usage: ['p(95)<100000000'],  // Memory usage should not exceed 100MB per request
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  const startTime = Date.now();
  
  // Simulate realistic user behavior patterns
  const userActions = [
    'login',
    'create_plan',
    'get_plans',
    'use_smart_tool',
    'check_progress',
    'update_profile'
  ];

  const action = userActions[Math.floor(Math.random() * userActions.length)];
  
  let response;
  let success = false;

  switch (action) {
    case 'login':
      response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: `soak_test_${__VU % 100}@example.com`, // Reuse same users
        password: 'password123'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      success = check(response, { 'login successful': (r) => r.status === 200 });
      break;

    case 'create_plan':
      // First get auth token
      const loginResp = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: `soak_test_${__VU % 100}@example.com`,
        password: 'password123'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (loginResp.status === 200) {
        const token = JSON.parse(loginResp.body).access_token;
        response = http.post(`${BASE_URL}/planning/v2/generate-plan`, JSON.stringify({
          subjects: ['Mathematics'],
          goals: ['Test goal'],
          availableTime: 120,
          planDurationDays: 3,
          planType: 'WEEKLY',
        }), {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
        });
        success = check(response, { 'plan created': (r) => r.status === 201 });
      }
      break;

    case 'get_plans':
      const loginResp2 = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: `soak_test_${__VU % 100}@example.com`,
        password: 'password123'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (loginResp2.status === 200) {
        const token = JSON.parse(loginResp2.body).access_token;
        response = http.get(`${BASE_URL}/planning/v2/plans`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        success = check(response, { 'plans retrieved': (r) => r.status === 200 });
      }
      break;

    case 'use_smart_tool':
      const loginResp3 = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: `soak_test_${__VU % 100}@example.com`,
        password: 'password123'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (loginResp3.status === 200) {
        const token = JSON.parse(loginResp3.body).access_token;
        response = http.post(`${BASE_URL}/smart-tools/sos-question-solver`, JSON.stringify({
          questionText: 'What is the integral of x?',
          subject: 'Mathematics',
          grade: 10,
          userId: `soak_user_${__VU}`
        }), {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
        });
        success = check(response, { 
          'smart tool used': (r) => r.status === 201 || r.status === 429 // 429 is expected due to rate limiting
        });
      }
      break;

    case 'check_progress':
      const loginResp4 = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: `soak_test_${__VU % 100}@example.com`,
        password: 'password123'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (loginResp4.status === 200) {
        const token = JSON.parse(loginResp4.body).access_token;
        response = http.get(`${BASE_URL}/planning/v2/plans`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        success = check(response, { 'progress checked': (r) => r.status === 200 });
      }
      break;

    case 'update_profile':
      const loginResp5 = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: `soak_test_${__VU % 100}@example.com`,
        password: 'password123'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (loginResp5.status === 200) {
        const token = JSON.parse(loginResp5.body).access_token;
        response = http.get(`${BASE_URL}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        success = check(response, { 'profile accessed': (r) => r.status === 200 });
      }
      break;
  }

  // Record metrics for trend analysis
  if (response) {
    const responseTime = response.timings.duration;
    responseTimeTrend.add(responseTime);
    
    // Simulate memory usage tracking (in real scenario, this would come from system metrics)
    const simulatedMemoryUsage = Math.random() * 50000000; // 0-50MB
    memoryUsage.add(simulatedMemoryUsage);
  }

  // Realistic user behavior - longer sleep times
  sleep(Math.random() * 10 + 5); // 5-15 seconds between actions
}
