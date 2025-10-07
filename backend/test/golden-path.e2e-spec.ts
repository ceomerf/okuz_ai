import request from 'supertest';

describe('Golden Path (E2E)', () => {
  const base = process.env.API_BASE_URL || 'http://localhost:3002';
  const email = `golden_${Date.now()}@example.com`;
  const password = 'P@ssw0rd123';
  let token: string;

  it('registers and logs in', async () => {
    await request(base).post('/auth/register').send({ email, password, name: 'Golden User' });
    const login = await request(base).post('/auth/login').send({ email, password });
    expect([200, 201]).toContain(login.status);
    token = login.body.access_token;
  });

  it('creates a plan', async () => {
    const res = await request(base)
      .post('/planning/generate-plan')
      .set('Authorization', `Bearer ${token}`)
      .send({ subjects: ['Matematik'], goals: ['Deneme'], availableTime: 120 });
    expect([200, 201]).toContain(res.status);
  });

  it('lists plans', async () => {
    const res = await request(base)
      .get('/planning/user-plans')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });
});


