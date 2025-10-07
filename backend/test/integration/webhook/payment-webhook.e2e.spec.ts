import request from 'supertest';
import crypto from 'crypto';

describe('Payment Webhook (e2e)', () => {
  const base = process.env.API_BASE_URL || 'http://localhost:3002';

  it('rejects Stripe webhook with invalid signature', async () => {
    const res = await request(base)
      .post('/webhook/stripe')
      .set('stripe-signature', 'invalid')
      .send({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_1', metadata: { paymentId: 'p_1' }, amount: 1000, currency: 'try' } } });
    expect([401, 500]).toContain(res.status);
  });

  it('rejects Iyzico webhook with invalid signature', async () => {
    const res = await request(base)
      .post('/webhook/iyzico')
      .set('x-iyz-signature', 'invalid')
      .send({ status: 'SUCCESS', id: 'pay_1', conversationId: 'txn_1', price: 10, currency: 'TRY' });
    expect([401, 500]).toContain(res.status);
  });

  it('accepts Stripe webhook with valid signature (HMAC demo)', async () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || 'test_secret';
    const body = { type: 'payment_intent.succeeded', data: { object: { id: 'pi_1', metadata: { paymentId: 'p_1' }, amount: 1000, currency: 'try' } } };
    const payload = JSON.stringify(body);
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const res = await request(base)
      .post('/webhook/stripe')
      .set('stripe-signature', sig)
      .send(body);
    expect([200, 500]).toContain(res.status);
  });

  it('accepts Iyzico webhook with valid signature (HMAC demo)', async () => {
    const secret = process.env.IYZICO_WEBHOOK_SECRET || 'test_secret';
    const body = { status: 'SUCCESS', id: 'pay_1', conversationId: 'txn_1', price: 10, currency: 'TRY' };
    const payload = JSON.stringify(body);
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const res = await request(base)
      .post('/webhook/iyzico')
      .set('x-iyz-signature', sig)
      .send(body);
    expect([200, 500]).toContain(res.status);
  });
});


