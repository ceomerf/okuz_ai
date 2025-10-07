#!/bin/bash

# Okuz AI Sunucu Yönetim Scripti
# Kullanım: ./server-management.sh [komut]

COMMAND=${1:-"help"}

case $COMMAND in
    "start")
        echo "🚀 Backend başlatılıyor..."
        sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
            cd /var/www/okuz
            echo "📁 Backend klasörüne geçildi: $(pwd)"
            echo "🔍 Node.js sürümü: $(node --version)"
            echo "🔍 npm sürümü: $(npm --version)"
            echo "🚀 Backend başlatılıyor..."
            npm run start:dev
EOF
        ;;
    "stop")
        echo "🛑 Backend durduruluyor..."
        sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
            echo "🔍 Çalışan Node.js süreçleri:"
            ps aux | grep node
            echo "🛑 Node.js süreçleri durduruluyor..."
            pkill -f "node.*okuz"
            echo "✅ Backend durduruldu"
EOF
        ;;
    "status")
        echo "📊 Backend durumu kontrol ediliyor..."
        sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
            echo "🔍 Çalışan süreçler:"
            ps aux | grep node
            echo ""
            echo "🌐 Port durumu:"
            netstat -tlnp | grep :3000
            echo ""
            echo "💾 Disk kullanımı:"
            df -h
            echo ""
            echo "🧠 RAM kullanımı:"
            free -h
EOF
        ;;
    "logs")
        echo "📋 Backend logları görüntüleniyor..."
        sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
            cd /var/www/okuz
            echo "📁 Backend klasörü: $(pwd)"
            echo "📋 Son loglar:"
            tail -f logs/*.log 2>/dev/null || echo "❌ Log dosyası bulunamadı"
EOF
        ;;
    "deploy")
        echo "🚀 Frontend deploy ediliyor..."
        sshpass -p "As270323" ssh -o StrictHostKeyChecking=no root@37.60.224.91 << 'EOF'
            echo "📁 Frontend klasörü oluşturuluyor..."
            mkdir -p /var/www/dashboard
            echo "✅ Frontend klasörü hazır: /var/www/dashboard"
            echo "🌐 Nginx konfigürasyonu gerekli"
EOF
        ;;
    "help")
        echo "🎯 Okuz AI Sunucu Yönetim Komutları:"
        echo ""
        echo "  ./server-management.sh start    - Backend'i başlat"
        echo "  ./server-management.sh stop     - Backend'i durdur"
        echo "  ./server-management.sh status   - Backend durumunu kontrol et"
        echo "  ./server-management.sh logs     - Backend loglarını görüntüle"
        echo "  ./server-management.sh deploy   - Frontend'i deploy et"
        echo "  ./server-management.sh help     - Bu yardımı göster"
        echo ""
        echo "🔗 Sunucu Bilgileri:"
        echo "  IP: 37.60.224.91"
        echo "  Backend: /var/www/okuz"
        echo "  Frontend: /var/www/dashboard"
        ;;
    *)
        echo "❌ Bilinmeyen komut: $COMMAND"
        echo "💡 Yardım için: ./server-management.sh help"
        ;;
esac
