# 🚀 Okuz AI Express API

Firebase Functions'tan dönüştürülmüş production-ready Express.js API. CPU quota sorunları çözmek ve VDS'de deploy etmek için oluşturulmuştur.

## 📋 İçindekiler

- [Kurulum](#kurulum)
- [API Endpoints](#api-endpoints)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [PM2 ile Deployment](#pm2-ile-deployment)

## 🛠 Kurulum

### 1. Dependencies Yükle

```bash
npm install
```

### 2. Environment Variables Ayarla

`.env` dosyası oluşturun:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Firebase Configuration
FIREBASE_PROJECT_ID=okuz-ai
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@okuz-ai.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://okuz-ai-default-rtdb.firebaseio.com

# Google AI (Gemini) Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=https://your-frontend-domain.com
API_SECRET_KEY=your-secret-key-for-internal-auth

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

### 3. Build ve Run

```bash
# Development
npm run dev

# Production Build
npm run build
npm start
```

## 🌐 API Endpoints

### Authentication
Tüm endpoints (health check hariç) `Authorization: Bearer <firebase-id-token>` header'ı gerektirir.

### 📊 Planning Endpoints

#### `POST /api/v1/planning/checkHolidayStatus`
Tatil durumunu kontrol eder.

```json
{
  "success": true,
  "data": {
    "isHoliday": false,
    "holidayReason": null,
    "message": "Normal eğitim dönemi"
  }
}
```

#### `POST /api/v1/planning/generateInitialLongTermPlan`
3 günlük task pool oluşturur.

**Request:**
```json
{
  "profileId": "optional-profile-id",
  "planType": "adaptive",
  "customRequests": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskPoolId": "task-pool-123",
    "taskPool": [...],
    "totalTasks": 8,
    "estimatedDays": 3,
    "message": "3 günlük esnek görev havuzu oluşturuldu!"
  }
}
```

#### `POST /api/v1/planning/savePlacedTasks`
Kullanıcının yerleştirdiği görevleri plana dönüştürür.

**Request:**
```json
{
  "taskPoolId": "task-pool-123",
  "placedTasks": [[...], [...], [...]],
  "profileId": "optional-profile-id"
}
```

### 💳 Subscription Endpoints

#### `POST /api/v1/subscription/startUserTrial`
Kullanıcı trial'ını başlatır.

#### `POST /api/v1/subscription/checkSubscriptionStatus`
Subscription durumunu kontrol eder.

#### `POST /api/v1/subscription/upgradeToPremium`
Premium'a yükseltir.

**Request:**
```json
{
  "planType": "monthly",
  "paymentMethod": "stripe"
}
```

#### `POST /api/v1/subscription/joinFounderMembership`
Founder membership'e dahil eder.

**Request:**
```json
{
  "inviteCode": "FOUNDER2024"
}
```

### 🧠 Analysis Endpoints

#### `POST /api/v1/analysis/processAndStructureText`
Metin analizi ve yapılandırma.

**Request:**
```json
{
  "text": "Analiz edilecek metin",
  "url": "https://example.com/article", // alternatif
  "analysisType": "summary"
}
```

#### `POST /api/v1/analysis/generateTopicMap`
Konu haritası oluşturur.

**Request:**
```json
{
  "subject": "Matematik"
}
```

#### `POST /api/v1/analysis/generateTopicConnection`
Konu bağlantısı analizi.

**Request:**
```json
{
  "subject": "Matematik",
  "topic": "Türev"
}
```

### 👤 Profile Endpoints

#### `POST /api/v1/profile/completeOnboardingProfile`
Onboarding profili tamamlar.

#### `POST /api/v1/profile/createAdvancedProfile`
Aile hesabına yeni profil ekler.

#### `GET /api/v1/profile/getUserProfiles`
Kullanıcı profillerini getirir.

#### `POST /api/v1/profile/switchProfile`
Aktif profili değiştirir.

### 🏆 Gamification Endpoints

#### `POST /api/v1/gamification/getGlobalLeaderboard`
Global leaderboard.

#### `POST /api/v1/gamification/getUserStats`
Kullanıcı istatistikleri.

#### `POST /api/v1/gamification/awardXP`
XP verir.

## 🚀 Production Deployment

### VDS Deployment

1. **Sunucuya Bağlan:**
```bash
ssh user@your-server.com
```

2. **Repository Clone Et:**
```bash
git clone https://github.com/your-repo/okuz-ai-express-api.git
cd okuz-ai-express-api
```

3. **Node.js ve NPM Yükle:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. **Dependencies Yükle:**
```bash
npm install
```

5. **Environment Variables Ayarla:**
```bash
cp .env.example .env
nano .env  # Değerleri düzenle
```

6. **Build Al:**
```bash
npm run build
```

7. **PM2 ile Çalıştır:**
```bash
npm install -g pm2
pm2 start pm2.json
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.okuz.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐳 Docker Deployment

### 1. Build Docker Image

```bash
docker build -t okuz-ai-api .
```

### 2. Run Container

```bash
docker run -d \
  --name okuz-ai-api \
  -p 3000:3000 \
  --env-file .env \
  okuz-ai-api
```

### 3. Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
```

## ⚡ PM2 ile Management

```bash
# Başlat
npm run pm2:start

# Durdur
npm run pm2:stop

# Restart
npm run pm2:restart

# Logları izle
npm run pm2:logs

# Status kontrol
pm2 status
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | Yes |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | No |
| `LOG_LEVEL` | Logging level | No |

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
```bash
# PM2 logs
pm2 logs okuz-ai-api

# Manual logs
tail -f logs/combined.log
```

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# Memory usage
free -h

# Disk usage
df -h
```

## 🔒 Security

- HTTPS zorunlu (production)
- Rate limiting aktif
- CORS configured
- Firebase ID token authentication
- Helmet security headers
- Input validation with Joi

## 🐛 Troubleshooting

### Common Issues

1. **Port zaten kullanımda:**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

2. **Firebase authentication hatası:**
- Service account key'leri kontrol edin
- Project ID doğru mu?

3. **Gemini API hatası:**
- API key aktif mi?
- Quota limit'ine takıldınız mı?

4. **Memory issues:**
```bash
# Increase PM2 memory limit
pm2 restart okuz-ai-api --max-memory-restart 1G
```

## 📞 Support

- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📧 Email: developer@okuz.ai
- 📝 Documentation: [API Docs](https://docs.okuz.ai)

---

**🎉 Firebase Functions'tan Express'e başarıyla geçiş tamamlandı!** 