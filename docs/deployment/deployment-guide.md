# 🚀 Okuz AI - Deployment Guide

## 📋 İçindekiler

- [Deployment Stratejileri](#deployment-stratejileri)
- [Environment Konfigürasyonu](#environment-konfigürasyonu)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring ve Logging](#monitoring-ve-logging)
- [Troubleshooting](#troubleshooting)

## 🎯 Deployment Stratejileri

### 1. **Development Environment**
- **Amaç**: Geliştirici testleri
- **Teknoloji**: Docker Compose
- **Özellikler**: Hot reload, Debug mode, Local database

### 2. **Staging Environment**
- **Amaç**: Pre-production testleri
- **Teknoloji**: Kubernetes
- **Özellikler**: Production-like setup, Integration tests

### 3. **Production Environment**
- **Amaç**: Canlı sistem
- **Teknoloji**: Kubernetes + Load Balancer
- **Özellikler**: High availability, Auto-scaling, Monitoring

## 🔧 Environment Konfigürasyonu

### Environment Variables

#### Development (.env.development)
```env
# Database
DATABASE_URL="postgresql://okuz_user:password@localhost:5432/okuz_ai_dev"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="dev-jwt-secret-key-minimum-32-chars"
JWT_REFRESH_SECRET="dev-refresh-secret-key-minimum-32-chars"

# Server
PORT=3002
NODE_ENV=development

# CORS
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

# AI
OPENAI_API_KEY="your-openai-api-key"

# Monitoring
PROMETHEUS_PORT=9090
SWAGGER_ENABLE=true
```

#### Staging (.env.staging)
```env
# Database
DATABASE_URL="postgresql://okuz_user:staging_password@staging-db:5432/okuz_ai_staging"
REDIS_URL="redis://staging-redis:6379"

# JWT
JWT_SECRET="staging-jwt-secret-key-minimum-32-chars"
JWT_REFRESH_SECRET="staging-refresh-secret-key-minimum-32-chars"

# Server
PORT=3002
NODE_ENV=staging

# CORS
CORS_ALLOWED_ORIGINS="https://staging.okuz.ai"

# AI
OPENAI_API_KEY="your-openai-api-key"

# Monitoring
PROMETHEUS_PORT=9090
SWAGGER_ENABLE=true
```

#### Production (.env.production)
```env
# Database
DATABASE_URL="postgresql://okuz_user:production_password@prod-db:5432/okuz_ai_prod"
REDIS_URL="redis://prod-redis:6379"

# JWT
JWT_SECRET="production-jwt-secret-key-minimum-32-chars"
JWT_REFRESH_SECRET="production-refresh-secret-key-minimum-32-chars"

# Server
PORT=3002
NODE_ENV=production

# CORS
CORS_ALLOWED_ORIGINS="https://app.okuz.ai,https://admin.okuz.ai"

# AI
OPENAI_API_KEY="your-openai-api-key"

# Monitoring
PROMETHEUS_PORT=9090
SWAGGER_ENABLE=false
```

## 🐳 Docker Deployment

### 1. **Docker Compose (Development)**

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: okuz_ai_dev
      POSTGRES_USER: okuz_user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://okuz_user:password@postgres:5432/okuz_ai_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

### 2. **Dockerfile**

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### 3. **Docker Compose (Production)**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: okuz_ai_prod
      POSTGRES_USER: okuz_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - okuz-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - okuz-network
    restart: unless-stopped

  app:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - okuz-network
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - okuz-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  okuz-network:
    driver: bridge
```

## ☸️ Kubernetes Deployment

### 1. **Namespace ve ConfigMap**

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: okuz-ai
  labels:
    name: okuz-ai
```

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: okuz-ai-config
  namespace: okuz-ai
data:
  NODE_ENV: "production"
  PORT: "3002"
  CORS_ALLOWED_ORIGINS: "https://app.okuz.ai,https://admin.okuz.ai"
  PROMETHEUS_PORT: "9090"
  SWAGGER_ENABLE: "false"
```

### 2. **Secrets**

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: okuz-ai-secrets
  namespace: okuz-ai
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  JWT_REFRESH_SECRET: <base64-encoded-refresh-secret>
  OPENAI_API_KEY: <base64-encoded-openai-key>
```

### 3. **PostgreSQL Deployment**

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: okuz-ai
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: "okuz_ai_prod"
        - name: POSTGRES_USER
          value: "okuz_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: okuz-ai
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### 4. **Redis Deployment**

```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: okuz-ai
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
  volumeClaimTemplates:
  - metadata:
      name: redis-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: okuz-ai
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

### 5. **Application Deployment**

```yaml
# k8s/app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: okuz-ai-app
  namespace: okuz-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: okuz-ai-app
  template:
    metadata:
      labels:
        app: okuz-ai-app
    spec:
      containers:
      - name: okuz-ai
        image: okuz-ai:latest
        ports:
        - containerPort: 3002
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: okuz-ai-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: okuz-ai-config
              key: PORT
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: okuz-ai-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: okuz-ai-secrets
              key: REDIS_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: okuz-ai-secrets
              key: JWT_SECRET
        - name: JWT_REFRESH_SECRET
          valueFrom:
            secretKeyRef:
              name: okuz-ai-secrets
              key: JWT_REFRESH_SECRET
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: okuz-ai-secrets
              key: OPENAI_API_KEY
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: okuz-ai-service
  namespace: okuz-ai
spec:
  selector:
    app: okuz-ai-app
  ports:
  - port: 80
    targetPort: 3002
  type: ClusterIP
```

### 6. **Ingress**

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: okuz-ai-ingress
  namespace: okuz-ai
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.okuz.ai
    secretName: okuz-ai-tls
  rules:
  - host: api.okuz.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: okuz-ai-service
            port:
              number: 80
```

## 🔄 CI/CD Pipeline

### 1. **GitHub Actions Workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm run test:ci

      - name: Run security audit
        run: npm audit --audit-level=high

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging environment"
          # Add staging deployment commands here

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production environment"
          # Add production deployment commands here
```

### 2. **Deployment Scripts**

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-staging}
NAMESPACE="okuz-ai"

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t okuz-ai:$ENVIRONMENT ./backend

# Tag image
docker tag okuz-ai:$ENVIRONMENT ghcr.io/okuz-ai/okuz-ai:$ENVIRONMENT

# Push to registry
echo "📤 Pushing image to registry..."
docker push ghcr.io/okuz-ai/okuz-ai:$ENVIRONMENT

# Update Kubernetes deployment
echo "☸️ Updating Kubernetes deployment..."
kubectl set image deployment/okuz-ai-app okuz-ai=ghcr.io/okuz-ai/okuz-ai:$ENVIRONMENT -n $NAMESPACE

# Wait for rollout
echo "⏳ Waiting for rollout to complete..."
kubectl rollout status deployment/okuz-ai-app -n $NAMESPACE

# Health check
echo "🏥 Performing health check..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE

echo "✅ Deployment completed successfully!"
```

## 📊 Monitoring ve Logging

### 1. **Prometheus Configuration**

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert-rules.yml"

scrape_configs:
  - job_name: 'okuz-ai-app'
    static_configs:
      - targets: ['okuz-ai-service:80']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### 2. **Grafana Dashboard**

```json
{
  "dashboard": {
    "title": "Okuz AI - Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### 3. **Logging Configuration**

```yaml
# logging/fluentd.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: okuz-ai
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/okuz-ai*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
      time_key time
      time_format %Y-%m-%dT%H:%M:%S.%NZ
    </source>

    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name okuz-ai-logs
      type_name _doc
    </match>
```

## 🔧 Troubleshooting

### 1. **Common Issues**

#### Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it okuz-ai-app-xxx -n okuz-ai -- npx prisma db pull

# Check database logs
kubectl logs -f postgres-0 -n okuz-ai
```

#### Redis Connection Issues
```bash
# Check Redis connectivity
kubectl exec -it okuz-ai-app-xxx -n okuz-ai -- redis-cli ping

# Check Redis logs
kubectl logs -f redis-0 -n okuz-ai
```

#### Application Issues
```bash
# Check application logs
kubectl logs -f okuz-ai-app-xxx -n okuz-ai

# Check pod status
kubectl get pods -n okuz-ai

# Check service endpoints
kubectl get endpoints -n okuz-ai
```

### 2. **Health Checks**

```bash
# Application health
curl -f http://localhost:3002/health

# Database health
curl -f http://localhost:3002/health/database

# Redis health
curl -f http://localhost:3002/health/redis
```

### 3. **Performance Monitoring**

```bash
# Check resource usage
kubectl top pods -n okuz-ai

# Check node resources
kubectl top nodes

# Check application metrics
curl http://localhost:3002/metrics
```

### 4. **Rollback Procedures**

```bash
# Rollback deployment
kubectl rollout undo deployment/okuz-ai-app -n okuz-ai

# Check rollout history
kubectl rollout history deployment/okuz-ai-app -n okuz-ai

# Rollback to specific revision
kubectl rollout undo deployment/okuz-ai-app --to-revision=2 -n okuz-ai
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)

Bu deployment guide, Okuz AI sisteminin production ortamında güvenli ve ölçeklenebilir bir şekilde çalıştırılması için gerekli tüm adımları içermektedir.
