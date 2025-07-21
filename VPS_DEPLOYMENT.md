# 🚀 Okuz AI VPS Deployment Guide

## 📋 Gereksinimler

- Ubuntu 20.04+ VPS
- Root erişimi
- Domain adı (opsiyonel ama önerilen)

## 🔧 VPS Kurulumu

### 1. VPS'e Bağlanın
```bash
ssh root@your-vps-ip
```

### 2. Setup Script'ini Çalıştırın
```bash
# Script'i VPS'e kopyalayın
wget https://raw.githubusercontent.com/your-repo/okuz_ai/main/scripts/vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh
```

### 3. Domain Yapılandırması
```bash
# Nginx yapılandırmasını düzenleyin
nano /etc/nginx/sites-available/okuz-ai

# Domain adınızı güncelleyin
server_name your-domain.com;

# Nginx'i yeniden başlatın
systemctl restart nginx
```

### 4. SSL Sertifikası (Let's Encrypt)
```bash
# Certbot kurulumu
apt install certbot python3-certbot-nginx

# SSL sertifikası alın
certbot --nginx -d your-domain.com

# Otomatik yenileme
crontab -e
# Şu satırı ekleyin:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔐 Environment Variables

### 1. Production Environment Dosyası Oluşturun
```bash
cd /root/okuz-nestjs-api
nano .env
```

### 2. Gerekli Değişkenleri Ayarlayın
```env
# Database
DATABASE_URL="postgresql://okuz_user:okuz_password@localhost:5432/okuz_ai_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-for-production-2025"
JWT_EXPIRES_IN="7d"

# Server
PORT=3002
NODE_ENV=production

# CORS
CORS_ORIGINS="https://your-domain.com"

# Google Gemini API
GEMINI_API_KEY="your-actual-gemini-api-key"
```

## 🗄️ Database Kurulumu

### 1. Prisma Migration'ları
```bash
cd /root/okuz-nestjs-api
npx prisma migrate deploy
npx prisma generate
```

### 2. Database Seed (İsteğe bağlı)
```bash
npm run seed
```

## 🚀 Deployment

### 1. GitHub Secrets Ayarlayın
Repository Settings > Secrets and variables > Actions:
- `VPS_HOST`: VPS IP adresi
- `VPS_USER`: root
- `VPS_SSH_KEY`: SSH private key

### 2. Code Push
```bash
git add .
git commit -m "VPS deployment ready"
git push origin master
```

### 3. PM2 Yapılandırması
```bash
# Ecosystem dosyasını kontrol edin
cat ecosystem.config.js

# PM2'yi başlatın
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 📊 Monitoring

### 1. PM2 Status
```bash
pm2 status
pm2 logs okuz-api
```

### 2. Nginx Logs
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 3. Application Logs
```bash
tail -f /root/okuz-nestjs-api/logs/combined.log
```

## 🔧 Troubleshooting

### 1. Port Kontrolü
```bash
netstat -tlnp | grep :3002
```

### 2. Service Status
```bash
systemctl status postgresql
systemctl status nginx
pm2 status
```

### 3. Firewall Kontrolü
```bash
ufw status
```

## 📱 Flutter Uygulaması

### 1. API Client Güncelleme
`lib/services/api_client.dart` dosyasında:
```dart
static const String baseUrl = 'https://your-domain.com';
```

### 2. Build ve Deploy
```bash
flutter build apk --release
flutter build appbundle --release
```

## 🔄 Otomatik Deployment

GitHub Actions ile her push'ta otomatik deploy:
- VPS'e SSH ile bağlanır
- Kodu günceller
- Bağımlılıkları yükler
- Build eder
- PM2'yi restart eder

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Service status'larını kontrol edin
3. GitHub Issues'da bildirin 