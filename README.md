# 🚀 Okuz AI - AI-Powered Learning Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0+-red)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)

> **AI-Powered Learning Platform** - Yapay zeka destekli öğrenme platformu ile kişiselleştirilmiş eğitim deneyimi sunar.

## 📋 İçindekiler

- [🎯 Proje Hakkında](#-proje-hakkında)
- [🏗️ Mimari](#️-mimari)
- [⚡ Hızlı Başlangıç](#-hızlı-başlangıç)
- [🔧 Kurulum](#-kurulum)
- [🚀 Çalıştırma](#-çalıştırma)
- [🧪 Test](#-test)
- [📦 Deployment](#-deployment)
- [📚 API Dokümantasyonu](#-api-dokümantasyonu)
- [🏛️ Mimari Detayları](#️-mimari-detayları)
- [🔐 Güvenlik](#-güvenlik)
- [📊 Monitoring](#-monitoring)
- [🤝 Katkıda Bulunma](#-katkıda-bulunma)
- [📄 Lisans](#-lisans)

## 🎯 Proje Hakkında

Okuz AI, yapay zeka teknolojilerini kullanarak kişiselleştirilmiş öğrenme deneyimi sunan kapsamlı bir eğitim platformudur. Platform, öğrencilerin öğrenme stillerini analiz ederek, onlara en uygun çalışma planlarını oluşturur ve sürekli geri bildirim sağlar.

### ✨ Temel Özellikler

- 🤖 **AI-Powered Planning**: Yapay zeka destekli kişiselleştirilmiş çalışma planları
- 📊 **Smart Analytics**: Öğrenme performansı analizi ve raporlama
- 🎮 **Gamification**: Oyunlaştırma ile motivasyon artırma
- 🛠️ **Smart Tools**: AI destekli öğrenme araçları
- 📱 **Real-time Updates**: Anlık güncellemeler ve bildirimler
- 🔒 **Enterprise Security**: Kurumsal düzeyde güvenlik

### 🎯 Hedef Kitle

- **Öğrenciler**: Kişiselleştirilmiş öğrenme deneyimi
- **Eğitmenler**: Öğrenci takibi ve analiz araçları
- **Ebeveynler**: Çocuklarının eğitim sürecini takip etme
- **Kurumlar**: Toplu eğitim yönetimi

## 🏗️ Mimari

### 🏛️ Genel Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Flutter)                   │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway (NestJS)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   Auth      │ │  Planning   │ │ Smart Tools │ │   AI    │ │
│  │  Service    │ │  Service    │ │  Service    │ │ Service │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │ Gamification│ │  Analytics   │ │ Notifications│ │Monitoring│ │
│  │  Service    │ │  Service     │ │  Service     │ │ Service │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ PostgreSQL  │ │    Redis     │ │   OpenAI    │           │
│  │  Database   │ │    Cache     │ │     API     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 Veri Akışı

1. **Frontend** → **API Gateway** → **Microservices**
2. **Authentication** → **JWT Token** → **Service Authorization**
3. **AI Processing** → **OpenAI API** → **Response Caching**
4. **Real-time Updates** → **WebSocket** → **Client Notifications**

## ⚡ Hızlı Başlangıç

### 🎯 5 Dakikada Çalıştırma

```bash
# 1. Repository'yi klonlayın
git clone https://github.com/okuz-ai/okuz-ai.git
cd okuz-ai

# 2. Backend bağımlılıklarını yükleyin
cd backend
npm install

# 3. Environment dosyasını oluşturun
cp env.example .env

# 4. Veritabanını başlatın (Docker ile)
docker-compose up -d postgres redis

# 5. Migration'ları çalıştırın
npx prisma migrate deploy
npx prisma generate

# 6. Uygulamayı başlatın
npm run start:dev
```

🎉 **Tebrikler!** Uygulama `http://localhost:3002` adresinde çalışıyor.

## 🔧 Kurulum

### 📋 Gereksinimler

| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| **Node.js** | ≥18.0.0 | JavaScript runtime |
| **PostgreSQL** | ≥15.0 | Ana veritabanı |
| **Redis** | ≥6.0 | Cache ve session store |
| **Docker** | ≥20.0 | Containerization (opsiyonel) |
| **PM2** | ≥5.0 | Process manager (production) |

### 🛠️ Detaylı Kurulum

#### 1. **Sistem Gereksinimleri**

```bash
# Node.js kurulumu (nvm ile)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# PostgreSQL kurulumu (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Redis kurulumu
sudo apt install redis-server
```

#### 2. **Proje Kurulumu**

```bash
# Repository'yi klonlayın
git clone https://github.com/okuz-ai/okuz-ai.git
cd okuz-ai

# Backend bağımlılıklarını yükleyin
cd backend
npm install

# Environment dosyasını oluşturun
cp env.example .env
```

#### 3. **Veritabanı Kurulumu**

```bash
# PostgreSQL kullanıcısı oluşturun
sudo -u postgres psql
CREATE USER okuz_user WITH PASSWORD 'secure_password';
CREATE DATABASE okuz_ai;
GRANT ALL PRIVILEGES ON DATABASE okuz_ai TO okuz_user;
\q

# Migration'ları çalıştırın
npx prisma migrate deploy
npx prisma generate
```

#### 4. **Environment Konfigürasyonu**

```bash
# .env dosyasını düzenleyin
nano .env
```

**Gerekli Environment Variables:**

```env
# Database
DATABASE_URL="postgresql://okuz_user:secure_password@localhost:5432/okuz_ai"
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here-minimum-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here-minimum-32-chars"
JWT_ACCESS_TOKEN_EXPIRATION="1h"
JWT_REFRESH_TOKEN_EXPIRATION="7d"

# Server Configuration
PORT=3002
NODE_ENV=development

# CORS Configuration
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,https://app.okuz.ai"

# AI Services
OPENAI_API_KEY="your-openai-api-key-here"

# Rate Limiting
THROTTLER_SHORT_TTL=60000
THROTTLER_SHORT_LIMIT=5
THROTTLER_MEDIUM_TTL=60000
THROTTLER_MEDIUM_LIMIT=20
THROTTLER_LONG_TTL=60000
THROTTLER_LONG_LIMIT=100

# Monitoring (Optional)
PROMETHEUS_PORT=9090
SWAGGER_ENABLE=true
```

## 🚀 Çalıştırma

### 🛠️ Development Mode

```bash
# Development server başlatın
npm run start:dev

# Veya watch mode ile
npm run start:debug
```

### 🏭 Production Mode

```bash
# Uygulamayı build edin
npm run build

# Production'da çalıştırın
npm run start:prod

# PM2 ile process management
pm2 start ecosystem.config.js --env production
```

### 🐳 Docker ile Çalıştırma

```bash
# Tüm servisleri başlatın
docker-compose up -d

# Sadece backend'i çalıştırın
docker-compose up -d postgres redis
npm run start:dev
```

### 🔧 Debugging

```bash
# Debug mode ile çalıştırın
npm run start:debug

# Logs'ları takip edin
pm2 logs okuz-api

# Health check
curl http://localhost:3002/health
```

## 🧪 Test

### 🧪 Test Çalıştırma

```bash
# Tüm testleri çalıştırın
npm run test

# Coverage ile test
npm run test:coverage

# Watch mode
npm run test:watch

# E2E testler
npm run test:e2e

# Specific test
npm run test -- --testPathPattern="auth"
```

### 📊 Test Coverage

```bash
# Coverage raporu oluşturun
npm run test:coverage

# HTML raporu
open coverage/lcov-report/index.html
```

**Coverage Hedefleri:**
- **Statements**: %98
- **Branches**: %98
- **Functions**: %98
- **Lines**: %98

### 🧪 Test Kategorileri

| Test Türü | Komut | Açıklama |
|-----------|-------|----------|
| **Unit Tests** | `npm run test:unit` | Bireysel servis testleri |
| **Integration Tests** | `npm run test:integration` | Servis entegrasyon testleri |
| **E2E Tests** | `npm run test:e2e` | End-to-end testler |
| **AI Tests** | `npm run ai:test` | AI servis testleri |

## 📦 Deployment

### 🚀 Production Deployment

#### 1. **Environment Hazırlığı**

```bash
# Production environment variables
cp env.production .env.production

# SSL sertifikaları
mkdir -p ssl
# SSL sertifikalarınızı buraya koyun
```

#### 2. **Database Migration**

```bash
# Production migration
NODE_ENV=production npx prisma migrate deploy

# Seed data (opsiyonel)
NODE_ENV=production npx prisma db seed
```

#### 3. **Build ve Deploy**

```bash
# Production build
npm run build

# PM2 ile deploy
pm2 start ecosystem.config.js --env production

# Health check
curl https://api.okuz.ai/health
```

### 🐳 Docker Deployment

```bash
# Docker image build
docker build -t okuz-ai:latest .

# Container çalıştır
docker run -d \
  --name okuz-ai \
  -p 3002:3002 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  okuz-ai:latest
```

### ☸️ Kubernetes Deployment

```bash
# Namespace oluştur
kubectl create namespace okuz-ai

# ConfigMap ve Secret'ları uygula
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deployment'ları başlat
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 🔄 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:ci
      - name: Build application
        run: npm run build
      - name: Deploy to production
        run: |
          # Deployment script
          ./scripts/deploy.sh
```

## 📚 API Dokümantasyonu

### 🌐 API Endpoints

#### 🔐 Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Kullanıcı kaydı | ❌ |
| `POST` | `/auth/login` | Kullanıcı girişi | ❌ |
| `POST` | `/auth/refresh` | Token yenileme | ❌ |
| `POST` | `/auth/logout` | Çıkış yapma | ✅ |
| `GET` | `/auth/profile` | Profil bilgileri | ✅ |

#### 📚 Planning

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/planning/generate-plan` | Plan oluşturma | ✅ |
| `GET` | `/planning/user-plans` | Kullanıcı planları | ✅ |
| `GET` | `/planning/plan/:id` | Plan detayı | ✅ |
| `PUT` | `/planning/plan/:id` | Plan güncelleme | ✅ |
| `DELETE` | `/planning/plan/:id` | Plan silme | ✅ |

#### 🛠️ Smart Tools

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/smart-tools/quick-chat` | Hızlı sohbet | ✅ |
| `POST` | `/smart-tools/sos-question-solver` | Acil soru çözümü | ✅ |
| `POST` | `/smart-tools/summary-generator` | Özet oluşturma | ✅ |
| `POST` | `/smart-tools/flashcards-generator` | Flashcard oluşturma | ✅ |
| `POST` | `/smart-tools/concept-map` | Kavram haritası | ✅ |

#### 🎮 Gamification

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/gamification/complete-task` | Görev tamamlama | ✅ |
| `GET` | `/gamification/leaderboard` | Liderlik tablosu | ✅ |
| `GET` | `/gamification/achievements` | Başarımlar | ✅ |
| `GET` | `/gamification/progress` | İlerleme durumu | ✅ |

### 📖 Swagger/OpenAPI

API dokümantasyonu Swagger UI ile erişilebilir:

- **Development**: `http://localhost:3002/api`
- **Production**: `https://api.okuz.ai/api`

### 🔧 API Kullanım Örnekleri

#### 1. **Kullanıcı Kaydı**

```bash
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "name": "John Doe",
    "role": "STUDENT"
  }'
```

#### 2. **Plan Oluşturma**

```bash
curl -X POST http://localhost:3002/planning/generate-plan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjects": ["Mathematics", "Physics"],
    "goals": ["Learn calculus", "Understand mechanics"],
    "availableTime": 120,
    "learningStyle": "visual",
    "planDurationDays": 7
  }'
```

#### 3. **Smart Tools Kullanımı**

```bash
curl -X POST http://localhost:3002/smart-tools/sos-question-solver \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the derivative of x^2?",
    "subject": "mathematics",
    "grade": 11
  }'
```

## 🏛️ Mimari Detayları

### 🏗️ Microservices Mimarisi

#### 1. **API Gateway**
- **Teknoloji**: NestJS
- **Rol**: Tüm isteklerin giriş noktası
- **Özellikler**: Rate limiting, Authentication, Load balancing

#### 2. **Authentication Service**
- **Teknoloji**: NestJS + JWT
- **Rol**: Kullanıcı kimlik doğrulama
- **Özellikler**: JWT tokens, Refresh tokens, Role-based access

#### 3. **Planning Service**
- **Teknoloji**: NestJS + AI Integration
- **Rol**: Kişiselleştirilmiş plan oluşturma
- **Özellikler**: AI-powered planning, Progress tracking

#### 4. **Smart Tools Service**
- **Teknoloji**: NestJS + OpenAI
- **Rol**: AI destekli öğrenme araçları
- **Özellikler**: Question solving, Content generation, Summarization

#### 5. **Gamification Service**
- **Teknoloji**: NestJS + Redis
- **Rol**: Oyunlaştırma ve motivasyon
- **Özellikler**: Points, Badges, Leaderboards, Achievements

### 🔄 Veri Akışı

```mermaid
graph TD
    A[Frontend] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Planning Service]
    B --> E[Smart Tools Service]
    B --> F[Gamification Service]
    
    D --> G[PostgreSQL]
    E --> H[OpenAI API]
    F --> I[Redis Cache]
    
    G --> J[Analytics Service]
    I --> K[Real-time Updates]
```

### 🗄️ Veritabanı Şeması

#### Ana Tablolar

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Plans
CREATE TABLE plans (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subjects TEXT[] NOT NULL,
    goals TEXT[] NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Study Sessions
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY,
    plan_id UUID REFERENCES plans(id),
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    duration INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 🔐 Güvenlik

#### 1. **Authentication & Authorization**
- JWT token tabanlı kimlik doğrulama
- Role-based access control (RBAC)
- Token refresh mekanizması
- Rate limiting ve throttling

#### 2. **Data Security**
- Veritabanı şifreleme
- Sensitive data masking
- API key rotation
- CORS konfigürasyonu

#### 3. **Infrastructure Security**
- HTTPS zorunluluğu
- Security headers
- Input validation
- SQL injection koruması

### 📊 Monitoring

#### 1. **Application Monitoring**
- **PM2**: Process management
- **Winston**: Logging
- **Prometheus**: Metrics collection
- **Grafana**: Visualization

#### 2. **Health Checks**
```bash
# Application health
curl http://localhost:3002/health

# Database health
curl http://localhost:3002/health/database

# Redis health
curl http://localhost:3002/health/redis
```

#### 3. **Logging**
```bash
# Application logs
pm2 logs okuz-api

# Error logs
pm2 logs okuz-api --err

# Combined logs
pm2 logs okuz-api --raw
```

## 🤝 Katkıda Bulunma

### 🚀 Geliştirici Rehberi

#### 1. **Repository Setup**
```bash
# Fork repository
git clone https://github.com/YOUR_USERNAME/okuz-ai.git
cd okuz-ai

# Upstream ekle
git remote add upstream https://github.com/okuz-ai/okuz-ai.git

# Development branch oluştur
git checkout -b feature/your-feature-name
```

#### 2. **Development Workflow**
```bash
# Dependencies yükle
npm install

# Pre-commit hooks
npm run prepare

# Test çalıştır
npm run test

# Lint kontrolü
npm run lint

# Format code
npm run format
```

#### 3. **Pull Request Süreci**
1. **Feature branch** oluşturun
2. **Tests** yazın ve çalıştırın
3. **Code review** için PR açın
4. **CI/CD** pipeline'ını geçin
5. **Merge** işlemi

### 📝 Kod Standartları

#### 1. **TypeScript Guidelines**
```typescript
// Interface tanımları
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Service sınıfları
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    // Implementation
  }
}
```

#### 2. **API Design**
```typescript
// Controller örneği
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(): Promise<User[]> {
    return this.userService.findAll();
  }
}
```

#### 3. **Test Standards**
```typescript
// Test örneği
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, PrismaService],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a user', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' };
    const result = await service.createUser(userData);
    
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});
```

### 🐛 Bug Reports

Bug raporu oluştururken şu bilgileri ekleyin:

1. **Environment**: OS, Node.js version, Database version
2. **Steps to reproduce**: Adım adım tekrar etme
3. **Expected behavior**: Beklenen davranış
4. **Actual behavior**: Gerçek davranış
5. **Logs**: Error logları
6. **Screenshots**: Görsel kanıtlar

### 💡 Feature Requests

Yeni özellik önerisi için:

1. **Use case** açıklayın
2. **Benefits** listesi
3. **Implementation** önerisi
4. **Breaking changes** analizi
5. **Testing** stratejisi

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

- **Website**: [https://okuz.ai](https://okuz.ai)
- **Email**: support@okuz.ai
- **Discord**: [Okuz AI Community](https://discord.gg/okuz-ai)
- **GitHub**: [@okuz-ai](https://github.com/okuz-ai)

## 🙏 Teşekkürler

Bu projeye katkıda bulunan tüm geliştiricilere teşekkür ederiz:

- [Contributors](https://github.com/okuz-ai/okuz-ai/graphs/contributors)
- [OpenAI](https://openai.com/) - AI API desteği
- [NestJS](https://nestjs.com/) - Framework
- [Prisma](https://prisma.io/) - Database ORM

---

<div align="center">

**🚀 Okuz AI ile geleceğin eğitimini bugün deneyimleyin!**

[![Star](https://img.shields.io/github/stars/okuz-ai/okuz-ai?style=social)](https://github.com/okuz-ai/okuz-ai)
[![Fork](https://img.shields.io/github/forks/okuz-ai/okuz-ai?style=social)](https://github.com/okuz-ai/okuz-ai/fork)
[![Watch](https://img.shields.io/github/watchers/okuz-ai/okuz-ai?style=social)](https://github.com/okuz-ai/okuz-ai)

</div>