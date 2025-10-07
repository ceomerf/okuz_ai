import request from 'supertest';

describe('Auth Integration', () => {
  const base = process.env.API_BASE_URL || 'http://localhost:3002';
  const email = `user_${Date.now()}@example.com`;
  const password = 'P@ssw0rd123';

  it('registers a user', async () => {
    const res = await request(base).post('/auth/register').send({ email, password, name: 'Test User' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it('logs in and refreshes token', async () => {
    const login = await request(base).post('/auth/login').send({ email, password });
    expect([200, 201]).toContain(login.status);
    const refresh = await request(base).post('/auth/refresh-token').send({ refreshToken: login.body.refreshToken });
    expect([200, 201]).toContain(refresh.status);
    expect(refresh.body.access_token || refresh.body.token).toBeTruthy();
  });
});


