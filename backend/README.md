# Okuz AI Backend

## Hızlı Başlangıç (15 dk)

1) Gereksinimler: Node 18+, Docker (ops), PostgreSQL, Redis
2) Ortam değişkenleri:

```
cp env.example .env
# Zorunlu
JWT_SECRET=change_me
DATABASE_URL=postgresql://user:pass@localhost:5432/okuz
EXTERNAL_API_KEY=dev_api_key
STRIPE_WEBHOOK_SECRET=dev_stripe
IYZICO_WEBHOOK_SECRET=dev_iyzico
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

3) Kurulum ve Çalıştırma:

```
npm ci
npx prisma generate
npm run start:dev
# Swagger: http://localhost:3002/api
```

## Testler

```
npm run test
npm run test:cov
```

E2E örnekleri: `backend/test/integration/webhook/payment-webhook.e2e.spec.ts`

## Rate Limit & Güvenlik

- Public rotalar rate limit altında; Smart Tools uçları sıkı throttling
- Webhook’lar HMAC imza doğrulaması ile korunur
- API Key: `EXTERNAL_API_KEY` başlığı `X-API-Key`

## Docker (opsiyonel)

```
docker-compose up -d
```


