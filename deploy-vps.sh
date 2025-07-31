#!/bin/bash

# Okuz AI Backend VPS Deployment Script

echo "🚀 Okuz AI Backend VPS Deployment başlatılıyor..."

# Environment kontrolü
if [ ! -f .env ]; then
    echo "❌ .env dosyası bulunamadı!"
    echo "📝 env.example dosyasını .env olarak kopyalayın"
    cp env.example .env
    echo "⚠️  Lütfen .env dosyasını düzenleyin ve tekrar çalıştırın"
    exit 1
fi

# Node modules kontrolü
if [ ! -d "node_modules" ]; then
    echo "📦 Node modules yükleniyor..."
    npm install
fi

# Prisma client generate
echo "🗄️ Prisma client generate ediliyor..."
npx prisma generate

# Database migration
echo "🗄️ Database migration çalıştırılıyor..."
npx prisma migrate deploy

# Build
echo "🔨 Production build oluşturuluyor..."
npm run build

# PM2 stop existing process
echo "🛑 Mevcut PM2 process'i durduruluyor..."
pm2 stop okuz-api || echo "No existing process to stop"

# PM2 delete existing process
echo "🗑️ Mevcut PM2 process'i siliniyor..."
pm2 delete okuz-api || echo "No existing process to delete"

# PM2 start new process
echo "🔄 PM2 yeni process başlatılıyor..."
pm2 start ecosystem.config.js --env production

# PM2 save
echo "💾 PM2 process kaydediliyor..."
pm2 save

echo "✅ VPS Deployment tamamlandı!"
echo "📊 PM2 Status:"
pm2 status

echo "🏥 Health Check:"
sleep 5
curl -s http://localhost:3002/health || echo "Health check failed"

echo "🌐 API Documentation:"
curl -s http://localhost:3002/api || echo "API docs check failed" 