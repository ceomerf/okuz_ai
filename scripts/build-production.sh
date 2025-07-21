#!/bin/bash

# Okuz AI Production Build Script

echo "🚀 Production build başlatılıyor..."

# Environment kontrolü
if [ ! -f .env ]; then
    echo "❌ .env dosyası bulunamadı!"
    echo "📝 env.production dosyasını .env olarak kopyalayın"
    cp env.production .env
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

# PM2 restart
echo "🔄 PM2 restart ediliyor..."
pm2 restart okuz-api

echo "✅ Production build tamamlandı!"
echo "📊 PM2 Status:"
pm2 status

echo "🏥 Health Check:"
curl -s http://localhost:3002/health || echo "Health check failed" 