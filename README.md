# Okuz AI NestJS Backend API

Bu proje Okuz AI uygulamasının NestJS tabanlı backend API'sidir.

## 🚀 CI/CD Pipeline

Bu proje GitHub Actions ile otomatik deployment sistemine sahiptir. Her push sonrası VPS'e otomatik deploy edilir.

## 🛠️ Kurulum

```bash
npm install
npm run build
npm run start:prod
```

## 📊 PM2 ile Çalıştırma

```bash
pm2 start ecosystem.config.js --env production
```

## 🏥 Health Check

```bash
curl http://localhost:3000/health
```

## 🔄 Otomatik Deployment

Her `git push origin master` sonrası otomatik olarak:
1. VPS'e SSH ile bağlanır
2. Kodu günceller (`git pull`)
3. Bağımlılıkları yükler (`npm install`)
4. Build eder (`npm run build`)
5. PM2'yi restart eder (`pm2 restart okuz-api`)

**Son güncelleme: 20 Temmuz 2025 - CI/CD Pipeline aktif!** 🎯
