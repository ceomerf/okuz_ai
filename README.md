# 🚀 Okuz AI Backend

NestJS tabanlı Okuz AI backend API'si.

## 📋 Gereksinimler

- Node.js 18+
- PostgreSQL
- PM2 (production için)

## 🔧 Kurulum

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Environment Variables
```bash
cp env.example .env
# .env dosyasını düzenleyin
```

### 3. Database Migration
```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Development
```bash
npm run start:dev
```

### 5. Production
```bash
npm run build
pm2 start ecosystem.config.js --env production
```

## 🌐 API Endpoints

- **Health Check**: `GET /health`
- **API Docs**: `GET /api`
- **Auth**: `POST /auth/register`, `POST /auth/login`
- **Users**: `GET /users/profile`
- **Planning**: `POST /planning/generate-plan`
- **Gamification**: `POST /gamification/complete-task`
- **Smart Tools**: `POST /smart-tools/sos-question-solver`

## 🗄️ Database

PostgreSQL kullanılıyor. Prisma ORM ile yönetiliyor.

## 📊 Monitoring

PM2 ile process yönetimi:
```bash
pm2 status
pm2 logs okuz-api
```

## 🔐 Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/db"
JWT_SECRET="your-secret"
PORT=3002
NODE_ENV=production
CORS_ORIGINS="*"
GEMINI_API_KEY="your-key"
```
