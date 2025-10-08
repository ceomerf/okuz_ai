# 🚀 Okuz AI - Gerçek Verilerle Admin Panel Deployment Rehberi

## 📋 Genel Bakış

Bu rehber, Okuz AI admin panelini gerçek verilerle çalışacak şekilde sunucuda nasıl deploy edeceğinizi adım adım açıklar.

## 🛠️ Sistem Gereksinimleri

### Minimum Gereksinimler
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **Disk**: 20GB SSD
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### Önerilen Gereksinimler
- **CPU**: 4 vCPU
- **RAM**: 8GB
- **Disk**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

## 🔧 Backend Kurulumu

### 1. Sistem Güncellemesi
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Node.js Kurulumu
```bash
# Node.js 18.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Alternatif: nvm ile
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 3. PostgreSQL Kurulumu
```bash
# PostgreSQL 14 kurulumu
sudo apt install postgresql postgresql-contrib -y

# PostgreSQL servisini başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql

# PostgreSQL kullanıcısı oluştur
sudo -u postgres psql
CREATE USER okuz_user WITH PASSWORD 'güçlü_şifre_buraya';
CREATE DATABASE okuz_ai_db OWNER okuz_user;
GRANT ALL PRIVILEGES ON DATABASE okuz_ai_db TO okuz_user;
\q
```

### 4. Redis Kurulumu
```bash
# Redis kurulumu
sudo apt install redis-server -y

# Redis servisini başlat
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Redis konfigürasyonu
sudo nano /etc/redis/redis.conf
# requirepass güçlü_redis_şifresi_buraya
# maxmemory 2gb
# maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

### 5. Nginx Kurulumu
```bash
# Nginx kurulumu
sudo apt install nginx -y

# Nginx servisini başlat
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6. PM2 Kurulumu
```bash
# PM2 global kurulumu
sudo npm install -g pm2

# PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## 🚀 Backend Deployment

### 1. Proje Klonlama
```bash
cd /opt
sudo git clone https://github.com/your-repo/okuz_ai.git
sudo chown -R $USER:$USER /opt/okuz_ai
cd /opt/okuz_ai/backend
```

### 2. Backend Bağımlılıkları
```bash
# Backend bağımlılıklarını yükle
npm install

# Prisma client oluştur
npx prisma generate

# Veritabanı migrasyonları
npx prisma migrate deploy

# Seed verileri (opsiyonel)
npx prisma db seed
```

### 3. Environment Variables
```bash
# .env dosyası oluştur
cp env.example .env

# .env dosyasını düzenle
nano .env
```

**Örnek .env içeriği:**
```env
# Database
DATABASE_URL="postgresql://okuz_user:güçlü_şifre_buraya@localhost:5432/okuz_ai_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="çok_güçlü_jwt_secret_buraya_en_az_32_karakter"
JWT_REFRESH_SECRET="çok_güçlü_jwt_refresh_secret_buraya_en_az_32_karakter"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# CORS
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://your-domain.com"

# Environment
NODE_ENV="production"
PORT=3000

# Throttling
THROTTLER_SHORT_TTL=60000
THROTTLER_SHORT_LIMIT=5
THROTTLER_MEDIUM_TTL=60000
THROTTLER_MEDIUM_LIMIT=20
THROTTLER_LONG_TTL=60000
THROTTLER_LONG_LIMIT=100

# Monitoring
PROMETHEUS_PORT=9090
SWAGGER_ENABLE=true
```

### 4. Backend Build ve Start
```bash
# Backend build
npm run build

# PM2 ile başlat
pm2 start ecosystem.config.js --env production

# PM2 durumunu kontrol et
pm2 status
pm2 logs
```

## 🎨 Frontend Deployment

### 1. Frontend Bağımlılıkları
```bash
cd /opt/okuz_ai/frontend/executive-dashboard

# Frontend bağımlılıklarını yükle
npm install

# Build
npm run build
```

### 2. Environment Variables (Frontend)
```bash
# .env dosyası oluştur
nano .env
```

**Frontend .env içeriği:**
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_REAL_TIME=true
```

### 3. Nginx Konfigürasyonu
```bash
# Nginx konfigürasyonu oluştur
sudo nano /etc/nginx/sites-available/okuz-ai
```

**Nginx konfigürasyonu:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React)
    location / {
        root /opt/okuz_ai/frontend/executive-dashboard/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
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

    # Backend API (executive endpoints)
    location /executive/ {
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

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Nginx Aktifleştirme
```bash
# Site linkini oluştur
sudo ln -s /etc/nginx/sites-available/okuz-ai /etc/nginx/sites-enabled/

# Nginx konfigürasyonunu test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl restart nginx
```

## 🔒 SSL Sertifikası (Let's Encrypt)

### 1. Certbot Kurulumu
```bash
# Certbot kurulumu
sudo apt install certbot python3-certbot-nginx -y
```

### 2. SSL Sertifikası Alma
```bash
# SSL sertifikası al
sudo certbot --nginx -d your-domain.com

# Otomatik yenileme test et
sudo certbot renew --dry-run
```

## 📊 Monitoring ve Logging

### 1. PM2 Monitoring
```bash
# PM2 monitoring
pm2 monit

# PM2 logs
pm2 logs --lines 100

# PM2 restart
pm2 restart all
```

### 2. System Monitoring
```bash
# Sistem durumu
htop
df -h
free -h

# Servis durumları
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status nginx
```

## 🔄 Otomatik Deployment Script

### 1. Deployment Script Oluştur
```bash
nano /opt/deploy-okuz-ai.sh
```

**Deployment script içeriği:**
```bash
#!/bin/bash

echo "🚀 Okuz AI Deployment Başlıyor..."

# Backend deployment
cd /opt/okuz_ai/backend
git pull origin main
npm install
npx prisma migrate deploy
npm run build
pm2 restart all

# Frontend deployment
cd /opt/okuz_ai/frontend/executive-dashboard
git pull origin main
npm install
npm run build

# Nginx restart
sudo systemctl restart nginx

echo "✅ Deployment Tamamlandı!"
```

### 2. Script'i Çalıştırılabilir Yap
```bash
chmod +x /opt/deploy-okuz-ai.sh
```

## 🚨 Güvenlik Önerileri

### 1. Firewall Konfigürasyonu
```bash
# UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000
```

### 2. Database Güvenliği
```bash
# PostgreSQL güvenlik
sudo nano /etc/postgresql/14/main/postgresql.conf
# listen_addresses = 'localhost'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# local   all             all                                     md5
```

### 3. Nginx Güvenlik
```bash
# Nginx güvenlik headers
sudo nano /etc/nginx/sites-available/okuz-ai
```

**Güvenlik headers ekle:**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## 📈 Performans Optimizasyonu

### 1. Nginx Optimizasyonu
```bash
# Nginx worker processes
sudo nano /etc/nginx/nginx.conf
```

```nginx
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### 2. PM2 Cluster Mode
```bash
# PM2 cluster mode
pm2 start ecosystem.config.js --env production -i max
```

## 🔧 Troubleshooting

### 1. Yaygın Sorunlar
```bash
# Port çakışması
sudo netstat -tulpn | grep :3000

# Disk alanı
df -h

# Memory kullanımı
free -h

# Log dosyaları
tail -f /var/log/nginx/error.log
pm2 logs
```

### 2. Servis Restart
```bash
# Tüm servisleri yeniden başlat
sudo systemctl restart postgresql
sudo systemctl restart redis-server
sudo systemctl restart nginx
pm2 restart all
```

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. Servis durumlarını kontrol edin
3. Network bağlantısını test edin
4. Disk alanını kontrol edin

## 🎯 Son Kontrol Listesi

- [ ] Node.js 18.x kurulu
- [ ] PostgreSQL kurulu ve çalışıyor
- [ ] Redis kurulu ve çalışıyor
- [ ] Nginx kurulu ve konfigüre edilmiş
- [ ] PM2 kurulu ve çalışıyor
- [ ] SSL sertifikası (opsiyonel)
- [ ] Firewall konfigüre edilmiş
- [ ] Environment variables ayarlanmış
- [ ] Database migrasyonları çalıştırılmış
- [ ] Frontend build edilmiş
- [ ] Backend build edilmiş ve çalışıyor
- [ ] Monitoring aktif

Bu rehberi takip ederek Okuz AI admin panelini gerçek verilerle çalışacak şekilde başarıyla deploy edebilirsiniz! 🚀
