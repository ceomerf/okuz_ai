#!/bin/bash

echo "🔍 Flutter Bundle Analizi Başlatılıyor..."

# Bundle analizi için gerekli paketleri yükle
echo "📦 Bundle analizi paketleri yükleniyor..."
flutter pub add --dev flutter_bundle_analyzer

# APK analizi
echo "📱 APK Bundle Analizi..."
flutter build apk --analyze-size

# Web bundle analizi
echo "🌐 Web Bundle Analizi..."
flutter build web --analyze-size

# Bundle boyutunu kontrol et
echo "📊 Bundle Boyutları:"
echo "APK boyutu:"
ls -lh build/app/outputs/flutter-apk/app-release.apk 2>/dev/null || echo "APK bulunamadı"

echo "Web bundle boyutu:"
du -sh build/web 2>/dev/null || echo "Web build bulunamadı"

# Kullanılmayan dependency'leri tespit et
echo "🔍 Kullanılmayan dependency'ler tespit ediliyor..."
flutter pub deps --json > deps.json
echo "Dependency analizi tamamlandı. deps.json dosyasına bakın."

# Tree shaking analizi
echo "🌳 Tree Shaking Analizi..."
flutter build apk --tree-shake-icons --obfuscate --split-debug-info=build/debug-info

echo "✅ Bundle analizi tamamlandı!"
