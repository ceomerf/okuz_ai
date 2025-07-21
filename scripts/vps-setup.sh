#!/bin/bash

# Okuz AI VPS Setup Script
# Bu script VPS'te gerekli tüm servisleri kurar ve yapılandırır

echo "🚀 Okuz AI VPS Setup başlatılıyor..."

# System update
echo "📦 Sistem güncelleniyor..."
apt update && apt upgrade -y

# Node.js kurulumu
echo "📦 Node.js kuruluyor..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# PM2 kurulumu
echo "📦 PM2 kuruluyor..."
npm install -g pm2

# PostgreSQL kurulumu
echo "🗄️ PostgreSQL kuruluyor..."
apt install -y postgresql postgresql-contrib

# PostgreSQL servisini başlat
systemctl start postgresql
systemctl enable postgresql

# Database ve kullanıcı oluştur
echo "🗄️ Database oluşturuluyor..."
sudo -u postgres psql << EOF
CREATE DATABASE okuz_ai_db;
CREATE USER okuz_user WITH PASSWORD 'okuz_password';
GRANT ALL PRIVILEGES ON DATABASE okuz_ai_db TO okuz_user;
ALTER USER okuz_user CREATEDB;
\q
EOF

# Nginx kurulumu
echo "🌐 Nginx kuruluyor..."
apt install -y nginx

# Nginx yapılandırması
cat > /etc/nginx/sites-available/okuz-ai << EOF
server {
    listen 80;
    server_name your-domain.com;  # Domain adınızı buraya yazın

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Nginx site'ını aktifleştir
ln -s /etc/nginx/sites-available/okuz-ai /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
systemctl restart nginx

# Firewall yapılandırması
echo "🔥 Firewall yapılandırılıyor..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3002
ufw --force enable

# Application dizini oluştur
echo "📁 Application dizini oluşturuluyor..."
mkdir -p /root/okuz-nestjs-api
cd /root/okuz-nestjs-api

echo "✅ VPS Setup tamamlandı!"
echo "📋 Sonraki adımlar:"
echo "1. Domain adınızı Nginx yapılandırmasında güncelleyin"
echo "2. SSL sertifikası kurun (Let's Encrypt)"
echo "3. Environment variables'ları ayarlayın"
echo "4. GitHub Actions ile deploy edin" 