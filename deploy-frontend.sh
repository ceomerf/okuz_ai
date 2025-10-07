#!/bin/bash

# Frontend Deploy Scripti
# Kullanım: ./deploy-frontend.sh

echo "🚀 Frontend Deploy Başlatılıyor..."

# Frontend build al
echo "📦 Frontend build alınıyor..."
cd frontend/executive-dashboard

if [ ! -f "package.json" ]; then
    echo "❌ Frontend klasörü bulunamadı: frontend/executive-dashboard"
    exit 1
fi

echo "🔧 Dependencies yükleniyor..."
npm install

echo "🏗️  Production build alınıyor..."
npm run build

if [ ! -d "build" ]; then
    echo "❌ Build klasörü oluşturulamadı"
    exit 1
fi

echo "✅ Build başarıyla tamamlandı"

# Sunucuya deploy et
echo "📤 Sunucuya deploy ediliyor..."

# Build dosyalarını sunucuya kopyala
sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
    echo "📁 Frontend klasörü hazırlanıyor..."
    mkdir -p /var/www/dashboard
    rm -rf /var/www/dashboard/*
    echo "✅ Frontend klasörü temizlendi: /var/www/dashboard"
EOF

# Build dosyalarını kopyala
echo "📤 Build dosyaları kopyalanıyor..."
sshpass -p "As270323" scp -o StrictHostKeyChecking=no -r build/* root@37.60.224.91:/var/www/dashboard/

echo "✅ Frontend başarıyla deploy edildi!"

# Nginx konfigürasyonu
echo "🔧 Nginx konfigürasyonu oluşturuluyor..."
sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
    cat > /etc/nginx/sites-available/dashboard << 'NGINX'
server {
    listen 80;
    server_name 37.60.224.91;
    root /var/www/dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
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
NGINX

    # Nginx site'ı etkinleştir
    ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
    
    # Nginx'i yeniden başlat
    systemctl reload nginx
    
    echo "✅ Nginx konfigürasyonu tamamlandı"
    echo "🌐 Dashboard URL: http://37.60.224.91"
EOF

echo ""
echo "🎉 Deploy Tamamlandı!"
echo "🌐 Dashboard URL: http://37.60.224.91"
echo "🔗 Backend API: http://37.60.224.91/api"
echo ""
echo "📱 Mobil erişim için:"
echo "   - Telefonda http://37.60.224.91 adresine git"
echo "   - 'Ana ekrana ekle' seçeneğini kullan"
echo "   - PWA olarak kullan"
