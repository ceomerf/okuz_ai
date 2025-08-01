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

# Kill existing Node.js processes
echo "🛑 Mevcut Node.js process'leri durduruluyor..."
pkill -f "node.*dist/main.js" || echo "No existing Node.js processes to stop"

# Start new process
echo "🔄 Yeni process başlatılıyor..."
nohup node dist/main.js > app.log 2>&1 &
echo "✅ Process başlatıldı (PID: $!)"

echo "✅ VPS Deployment tamamlandı!"
echo "📊 Process Status:"
ps aux | grep "node.*dist/main.js" | grep -v grep

echo "🏥 Health Check:"
sleep 5
curl -s http://localhost:3002/health || echo "Health check failed"

echo "🌐 API Documentation:"
curl -s http://localhost:3002/api || echo "API docs check failed"

echo "📝 Log dosyası: app.log" 