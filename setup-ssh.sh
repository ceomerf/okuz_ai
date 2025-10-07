#!/bin/bash

# SSH Key Kurulum Scripti
# Kullanım: ./setup-ssh.sh

echo "🔑 SSH Key Kurulumu Başlatılıyor..."

# SSH klasörü oluştur
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# SSH config dosyasını kopyala
if [ -f "ssh-config" ]; then
    cp ssh-config ~/.ssh/config
    chmod 600 ~/.ssh/config
    echo "✅ SSH config dosyası kopyalandı"
else
    echo "❌ ssh-config dosyası bulunamadı"
fi

# sshpass kurulumu (macOS için)
if command -v brew &> /dev/null; then
    if ! command -v sshpass &> /dev/null; then
        echo "📦 sshpass kuruluyor..."
        brew install hudochenkov/sshpass/sshpass
    else
        echo "✅ sshpass zaten kurulu"
    fi
else
    echo "⚠️  Homebrew bulunamadı. sshpass'ı manuel olarak kurun:"
    echo "   brew install hudochenkov/sshpass/sshpass"
fi

echo ""
echo "🎯 Kullanım:"
echo "   ./connect-server.sh  # Sunucuya bağlan"
echo "   ssh mezosunucu       # SSH config ile bağlan"
echo ""
echo "🔗 Sunucu Bilgileri:"
echo "   IP: 37.60.224.91"
echo "   Kullanıcı: root"
echo "   Şifre: As270323"
echo "   Backend: /var/www/okuz"
