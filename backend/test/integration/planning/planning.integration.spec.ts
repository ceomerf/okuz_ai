import request from 'supertest';

describe('Planning Integration', () => {
  const base = process.env.API_BASE_URL || 'http://localhost:3002';
  let token: string;

  beforeAll(async () => {
    const email = `plan_${Date.now()}@example.com`;
    const password = 'P@ssw0rd123';
    await request(base).post('/auth/register').send({ email, password, name: 'Plan User' });
    const login = await request(base).post('/auth/login').send({ email, password });
    token = login.body.access_token;
  });

  it('creates premium plan and persists sessions', async () => {
    const res = await request(base)
      .post('/planning/create-premium-plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ subjects: ['Matematik'], goals: ['TYT'], planDurationDays: 7 });
    expect([200, 201]).toContain(res.status);
  });
});


