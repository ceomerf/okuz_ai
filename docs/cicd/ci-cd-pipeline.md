# 🚀 Okuz AI - CI/CD Pipeline Documentation

## 📋 İçindekiler

- [CI/CD Pipeline Genel Bakış](#cicd-pipeline-genel-bakış)
- [Environment Yönetimi](#environment-yönetimi)
- [Deployment Stratejileri](#deployment-stratejileri)
- [Rollback Stratejileri](#rollback-stratejileri)
- [Canary Deployment](#canary-deployment)
- [Monitoring ve Alerting](#monitoring-ve-alerting)
- [Best Practices](#best-practices)

## 🏗️ CI/CD Pipeline Genel Bakış

### Pipeline Akışı

```mermaid
graph LR
    A[Code Push] --> B[Code Quality]
    B --> C[Security Scan]
    C --> D[Unit Tests]
    D --> E[Integration Tests]
    E --> F[E2E Tests]
    F --> G[Build & Package]
    G --> H[Deploy Staging]
    H --> I[Staging Tests]
    I --> J[Deploy Production]
    J --> K[Production Monitoring]
```

### Pipeline Aşamaları

| Aşama | Açıklama | Süre | Kritik |
|-------|----------|------|--------|
| **Code Quality** | ESLint, Prettier, SonarCloud | 2-3 dk | ✅ |
| **Security Scan** | npm audit, dependency check | 1-2 dk | ✅ |
| **Unit Tests** | Jest unit tests | 3-5 dk | ✅ |
| **Integration Tests** | API integration tests | 5-10 dk | ✅ |
| **E2E Tests** | End-to-end tests | 10-15 dk | ✅ |
| **Build & Package** | Docker image build | 5-10 dk | ✅ |
| **Deploy Staging** | Kubernetes deployment | 3-5 dk | ✅ |
| **Staging Tests** | Smoke tests | 2-3 dk | ✅ |
| **Deploy Production** | Production deployment | 5-10 dk | ✅ |
| **Production Monitoring** | Health checks | Sürekli | ✅ |

## 🌍 Environment Yönetimi

### Environment Hiyerarşisi

```mermaid
graph TD
    A[Development] --> B[Staging]
    B --> C[Production]
    
    A --> A1[Local Development]
    A --> A2[Feature Branches]
    
    B --> B1[Staging Environment]
    B --> B2[Integration Tests]
    
    C --> C1[Production Environment]
    C --> C2[Canary Deployment]
    C --> C3[Blue-Green Deployment]
```

### Environment Konfigürasyonları

#### Development Environment
```yaml
# env.development
NODE_ENV: development
PORT: 3002
DATABASE_URL: postgresql://okuz_user:dev_password@localhost:5432/okuz_ai_dev
REDIS_URL: redis://localhost:6379
JWT_SECRET: dev-jwt-secret-key-minimum-32-chars-for-development
OPENAI_API_KEY: your-openai-api-key-here
CORS_ALLOWED_ORIGINS: http://localhost:3000,http://localhost:3001,http://localhost:8080
DEBUG: true
HOT_RELOAD: true
MOCK_EXTERNAL_SERVICES: true
```

#### Staging Environment
```yaml
# env.staging
NODE_ENV: staging
PORT: 3002
DATABASE_URL: postgresql://okuz_user:staging_password@staging-db:5432/okuz_ai_staging
REDIS_URL: redis://staging-redis:6379
JWT_SECRET: staging-jwt-secret-key-minimum-32-chars-for-staging
OPENAI_API_KEY: your-openai-api-key-here
CORS_ALLOWED_ORIGINS: https://staging.okuz.ai,https://staging-admin.okuz.ai
DEBUG: false
HOT_RELOAD: false
MOCK_EXTERNAL_SERVICES: false
ENABLE_TEST_DATA: true
```

#### Production Environment
```yaml
# env.production
NODE_ENV: production
PORT: 3002
DATABASE_URL: postgresql://okuz_user:production_password@prod-db:5432/okuz_ai_prod
REDIS_URL: redis://prod-redis:6379
JWT_SECRET: production-jwt-secret-key-minimum-32-chars-for-production
OPENAI_API_KEY: your-openai-api-key-here
CORS_ALLOWED_ORIGINS: https://app.okuz.ai,https://admin.okuz.ai
DEBUG: false
HOT_RELOAD: false
MOCK_EXTERNAL_SERVICES: false
ENABLE_TEST_DATA: false
ENABLE_DEBUG_ENDPOINTS: false
```

## 🚀 Deployment Stratejileri

### 1. Blue-Green Deployment

```mermaid
graph LR
    A[Load Balancer] --> B[Blue Environment]
    A --> C[Green Environment]
    
    B --> B1[Current Version]
    C --> C1[New Version]
    
    A --> D[Switch Traffic]
    D --> E[All Traffic to Green]
```

**Avantajları:**
- Sıfır downtime
- Hızlı rollback
- A/B testing imkanı

**Dezavantajları:**
- Yüksek kaynak kullanımı
- Karmaşık setup

### 2. Rolling Deployment

```mermaid
graph LR
    A[Pod 1 - v1] --> B[Pod 1 - v2]
    C[Pod 2 - v1] --> D[Pod 2 - v2]
    E[Pod 3 - v1] --> F[Pod 3 - v2]
    
    B --> G[Traffic Switch]
    D --> G
    F --> G
```

**Avantajları:**
- Düşük kaynak kullanımı
- Basit setup
- Otomatik scaling

**Dezavantajları:**
- Kısa süreli downtime
- Yavaş deployment

### 3. Canary Deployment

```mermaid
graph LR
    A[Load Balancer] --> B[90% Traffic to v1]
    A --> C[10% Traffic to v2]
    
    B --> D[Stable Version]
    C --> E[Canary Version]
    
    E --> F[Monitor Metrics]
    F --> G[Gradual Increase]
```

**Avantajları:**
- Risk azaltma
- Gerçek kullanıcı testi
- Yavaş rollout

**Dezavantajları:**
- Karmaşık monitoring
- Uzun deployment süresi

## 🔄 Rollback Stratejileri

### 1. Git Tags Üzerinden Rollback

```bash
# Rollback to specific tag
git tag --sort=-version:refname | head -10

# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n okuz-ai-production

# Rollback to specific tag
kubectl set image deployment/api-gateway \
  api-gateway=ghcr.io/okuz-ai/okuz-ai/api-gateway:v1.2.3 \
  -n okuz-ai-production
```

### 2. Kubernetes Rollout History

```bash
# View rollout history
kubectl rollout history deployment/api-gateway -n okuz-ai-production

# Rollback to previous revision
kubectl rollout undo deployment/api-gateway -n okuz-ai-production

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2 -n okuz-ai-production
```

### 3. Database Rollback

```sql
-- Database migration rollback
-- Planning Service
ALTER TABLE plans ADD COLUMN old_column VARCHAR(255);
UPDATE plans SET old_column = new_column;
ALTER TABLE plans DROP COLUMN new_column;

-- Smart Tools Service
ALTER TABLE chat_history ADD COLUMN old_column VARCHAR(255);
UPDATE chat_history SET old_column = new_column;
ALTER TABLE chat_history DROP COLUMN new_column;
```

## 🚀 Canary Deployment

### Canary Deployment Akışı

```mermaid
graph TD
    A[Deploy Canary] --> B[10% Traffic]
    B --> C[Monitor Metrics]
    C --> D{Issues?}
    D -->|Yes| E[Rollback]
    D -->|No| F[Increase Traffic]
    F --> G[50% Traffic]
    G --> H[Monitor Metrics]
    H --> I{Issues?}
    I -->|Yes| E
    I -->|No| J[100% Traffic]
    J --> K[Promote to Stable]
```

### Canary Monitoring

```yaml
# Canary monitoring configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: canary-monitoring
data:
  metrics:
    - name: error_rate
      threshold: 5%
    - name: response_time
      threshold: 1000ms
    - name: cpu_usage
      threshold: 80%
    - name: memory_usage
      threshold: 80%
```

### Canary Deployment Komutları

```bash
# Start canary deployment
kubectl create deployment api-gateway-canary \
  --image=ghcr.io/okuz-ai/okuz-ai/api-gateway:latest \
  -n okuz-ai-production

# Scale canary deployment
kubectl scale deployment api-gateway-canary --replicas=1 -n okuz-ai-production

# Monitor canary deployment
kubectl get pods -n okuz-ai-production
kubectl top pods -n okuz-ai-production

# Promote canary deployment
kubectl scale deployment api-gateway-canary --replicas=5 -n okuz-ai-production
kubectl scale deployment api-gateway --replicas=0 -n okuz-ai-production
```

## 📊 Monitoring ve Alerting

### Health Checks

```typescript
// Health check implementation
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () => this.kafkaHealth.isHealthy('kafka'),
    ]);
  }
}
```

### Metrics Collection

```typescript
// Metrics implementation
@Injectable()
export class MetricsService {
  private readonly requestCounter = new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  });

  private readonly requestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
  });
}
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: okuz-ai-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"
```

## 🔧 Best Practices

### 1. Git Workflow

```bash
# Feature branch workflow
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create pull request
gh pr create --title "feat: add new feature" --body "Description"

# Merge to develop
git checkout develop
git merge feature/new-feature
git push origin develop

# Merge to main
git checkout main
git merge develop
git tag v1.2.3
git push origin main --tags
```

### 2. Environment Variables

```bash
# Use environment-specific files
cp env.development .env
cp env.staging .env
cp env.production .env

# Never commit secrets
echo "*.env" >> .gitignore
echo "*.env.*" >> .gitignore
```

### 3. Database Migrations

```bash
# Run migrations in order
npx prisma migrate deploy
npx prisma generate

# Rollback migrations if needed
npx prisma migrate reset
```

### 4. Docker Best Practices

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "start:prod"]
```

### 5. Kubernetes Best Practices

```yaml
# Resource limits
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Health checks
livenessProbe:
  httpGet:
    path: /health
    port: 3002
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3002
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 6. Security Best Practices

```yaml
# Security context
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

## 📚 Troubleshooting

### Common Issues

#### 1. Deployment Failures

```bash
# Check deployment status
kubectl get deployments -n okuz-ai-production
kubectl describe deployment api-gateway -n okuz-ai-production

# Check pod logs
kubectl logs -f deployment/api-gateway -n okuz-ai-production

# Check events
kubectl get events -n okuz-ai-production --sort-by='.lastTimestamp'
```

#### 2. Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it deployment/api-gateway -n okuz-ai-production -- npx prisma db pull

# Check database logs
kubectl logs -f deployment/postgres -n okuz-ai-production
```

#### 3. Redis Connection Issues

```bash
# Check Redis connectivity
kubectl exec -it deployment/api-gateway -n okuz-ai-production -- redis-cli ping

# Check Redis logs
kubectl logs -f deployment/redis -n okuz-ai-production
```

### Recovery Procedures

#### 1. Service Recovery

```bash
# Restart service
kubectl rollout restart deployment/api-gateway -n okuz-ai-production

# Scale service
kubectl scale deployment/api-gateway --replicas=0 -n okuz-ai-production
kubectl scale deployment/api-gateway --replicas=3 -n okuz-ai-production
```

#### 2. Database Recovery

```bash
# Backup database
kubectl exec -it deployment/postgres -n okuz-ai-production -- pg_dump -U okuz_user okuz_ai_prod > backup.sql

# Restore database
kubectl exec -it deployment/postgres -n okuz-ai-production -- psql -U okuz_user okuz_ai_prod < backup.sql
```

#### 3. Complete System Recovery

```bash
# Rollback all services
kubectl rollout undo deployment/api-gateway -n okuz-ai-production
kubectl rollout undo deployment/planning-service -n okuz-ai-production
kubectl rollout undo deployment/smart-tools-service -n okuz-ai-production
kubectl rollout undo deployment/gamification-service -n okuz-ai-production
kubectl rollout undo deployment/notification-service -n okuz-ai-production
kubectl rollout undo deployment/auth-service -n okuz-ai-production
```

Bu CI/CD pipeline dokümantasyonu, Okuz AI sisteminin hızlı, güvenli ve sürdürülebilir deployment süreçlerini sağlar. Tüm deployment stratejileri, rollback mekanizmaları ve monitoring araçları detaylı bir şekilde açıklanmıştır.
