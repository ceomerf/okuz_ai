import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const rateLimitHit = new Rate('rate_limit_hit');
const spikeResponseTime = new Rate('spike_response_time');

export let options = {
  stages: [
    { duration: '30s', target: 100 },   // Normal load
    { duration: '10s', target: 5000 },   // SPIKE: 5000 concurrent users
    { duration: '30s', target: 100 },   // Back to normal
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // Allow higher response times during spike
    rate_limit_hit: ['rate<0.1'],       // Rate limit hits should be below 10%
    spike_response_time: ['rate<0.8'],   // 80% of requests should complete
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Test smart tools endpoints (most likely to hit rate limits)
  const endpoints = [
    '/smart-tools/quick-chat-stream',
    '/smart-tools/sos-question-solver',
    '/smart-tools/summary-generator',
    '/smart-tools/flashcard-generator',
  ];

  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  // Prepare test data based on endpoint
  let payload = {};
  let headers = { 'Content-Type': 'application/json' };

  switch (randomEndpoint) {
    case '/smart-tools/quick-chat-stream':
      payload = {
        message: 'Test message for spike test',
        subject: 'Mathematics',
        grade: '10'
      };
      break;
    case '/smart-tools/sos-question-solver':
      payload = {
        questionText: 'What is 2+2?',
        subject: 'Mathematics',
        grade: 10,
        userId: `spike_user_${__VU}`
      };
      break;
    case '/smart-tools/summary-generator':
      payload = {
        content: 'This is a test content for summary generation during spike test.',
        type: 'bullet_points',
        title: 'Spike Test Summary'
      };
      break;
    case '/smart-tools/flashcard-generator':
      payload = {
        topic: 'Mathematics',
        count: 5,
        userId: `spike_user_${__VU}`
      };
      break;
  }

  const response = http.post(`${BASE_URL}${randomEndpoint}`, JSON.stringify(payload), { headers });

  const success = check(response, {
    'request successful': (r) => r.status === 201 || r.status === 200,
    'rate limit not exceeded': (r) => r.status !== 429,
    'response time acceptable': (r) => r.timings.duration < 10000, // 10 seconds max
  });

  if (response.status === 429) {
    rateLimitHit.add(1);
    console.log(`Rate limit hit for ${randomEndpoint} at VU ${__VU}`);
  }

  if (response.timings.duration > 5000) { // 5 seconds threshold
    spikeResponseTime.add(1);
  }

  // Short sleep to maximize concurrent requests
  sleep(0.1);
}
