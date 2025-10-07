#!/bin/bash

# Okuz AI Sunucu Bağlantı Scripti
# Kullanım: ./connect-server.sh

echo "🚀 Okuz AI Sunucusuna Bağlanıyor..."
echo "📍 Sunucu: 37.60.224.91"
echo "👤 Kullanıcı: root"
echo "📁 Backend Klasörü: /var/www/okuz"
echo ""

# SSH bağlantısı
sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
    echo "✅ Sunucuya başarıyla bağlandı!"
    echo "📁 Mevcut konum: $(pwd)"
    echo "📂 Backend klasörü: /var/www/okuz"
    echo ""
    echo "🔧 Backend durumu kontrol ediliyor..."
    
    if [ -d "/var/www/okuz" ]; then
        echo "✅ Backend klasörü bulundu: /var/www/okuz"
        cd /var/www/okuz
        echo "📁 Backend klasörüne geçildi: $(pwd)"
        
        # Backend durumunu kontrol et
        if [ -f "package.json" ]; then
            echo "✅ package.json bulundu"
            echo "🔍 Node.js sürümü: $(node --version)"
            echo "🔍 npm sürümü: $(npm --version)"
            
            # Backend'i başlat
            echo "🚀 Backend başlatılıyor..."
            npm run start:dev
        else
            echo "❌ package.json bulunamadı"
            echo "📂 Klasör içeriği:"
            ls -la
        fi
    else
        echo "❌ Backend klasörü bulunamadı: /var/www/okuz"
        echo "📂 Mevcut klasörler:"
        ls -la /var/www/
    fi
EOF

echo ""
echo "🔗 Bağlantı tamamlandı!"
echo "🌐 Backend URL: http://37.60.224.91:3000"
echo "📱 Dashboard URL: http://37.60.224.91:3001"
