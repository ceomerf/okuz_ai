# ⚡ Okuz AI - Hızlı Başlangıç Rehberi

## 🎯 5 Dakikada Çalıştırma

### 1. Backend Başlatma
```bash
# Backend dizinine git
cd backend

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp env.example .env

# .env dosyasını düzenle (gerekli değerleri doldur)
nano .env

# Veritabanı migrasyonları
npx prisma migrate dev

# Backend'i başlat
npm run start:dev
```

### 2. Frontend Başlatma
```bash
# Yeni terminal aç
cd frontend/executive-dashboard

# Bağımlılıkları yükle
npm install

# Frontend'i başlat
npm start
```

### 3. Tarayıcıda Aç
```
http://localhost:3000
```

## 🔧 Hızlı Konfigürasyon

### Backend .env Örneği
```env
DATABASE_URL="postgresql://username:password@localhost:5432/okuz_ai_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-here"
OPENAI_API_KEY="sk-your-openai-key-here"
CORS_ALLOWED_ORIGINS="http://localhost:3000"
NODE_ENV="development"
PORT=3000
```

### Frontend .env Örneği
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=development
```

## 🚀 Production Deployment

### Tek Komutla Deploy
```bash
# Deployment script'i çalıştır
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Manuel Deploy
```bash
# Backend
cd backend
npm run build
pm2 start ecosystem.config.js

# Frontend
cd frontend/executive-dashboard
npm run build
# Nginx ile serve et
```

## 📊 Admin Panel Özellikleri

### ✅ Gerçek Verilerle Çalışan Özellikler
- **Kullanıcı Yönetimi**: CRUD işlemleri, filtreleme, arama
- **Öğrenci Yönetimi**: Performans takibi, devam durumu
- **Öğretmen Yönetimi**: Deneyim, puanlama sistemi
- **Kurs Yönetimi**: İlerleme takibi, öğrenci sayısı
- **Sistem Sağlığı**: Real-time monitoring
- **Analitik**: Detaylı raporlar ve grafikler
- **Hızlı İşlemler**: Speed dial ile tek tıkla işlemler

### 🎨 UI/UX Özellikleri
- **Responsive Design**: Mobil uyumlu
- **Dark/Light Mode**: Tema değiştirme
- **Real-time Updates**: Canlı veri güncellemeleri
- **Advanced Tables**: Sıralama, filtreleme, sayfalama
- **Interactive Charts**: Grafik ve analitik
- **Speed Dial**: Hızlı erişim butonları

## 🔍 API Endpoints

### Executive Dashboard
```
GET /executive/dashboard - Ana dashboard verileri
GET /executive/health-check - Sistem sağlığı
GET /executive/alerts - Aktif uyarılar
POST /executive/quick-action - Hızlı işlemler
```

### Kullanıcı Yönetimi
```
GET /api/users - Kullanıcı listesi
POST /api/users - Yeni kullanıcı
PUT /api/users/:id - Kullanıcı güncelle
DELETE /api/users/:id - Kullanıcı sil
```

### Öğrenci Yönetimi
```
GET /students - Öğrenci listesi
GET /students/:id/progress - Öğrenci ilerlemesi
GET /students/:id/dashboard - Öğrenci dashboard'u
```

## 🛠️ Geliştirme

### Yeni Özellik Ekleme
1. Backend'de API endpoint oluştur
2. Frontend'de component oluştur
3. API service'e method ekle
4. UI'da entegre et

### Veritabanı Değişiklikleri
```bash
# Yeni migration oluştur
npx prisma migrate dev --name feature-name

# Schema'yı güncelle
npx prisma generate
```

## 📱 Mobil Uyumluluk

Admin paneli tamamen responsive olarak tasarlanmıştır:
- **Desktop**: Tam özellikli deneyim
- **Tablet**: Optimize edilmiş layout
- **Mobile**: Touch-friendly interface

## 🔐 Güvenlik

### Authentication
- JWT token tabanlı kimlik doğrulama
- Role-based access control
- Session management

### API Security
- Rate limiting
- CORS protection
- Input validation
- SQL injection koruması

## 📈 Monitoring

### Sistem Metrikleri
- CPU kullanımı
- Memory kullanımı
- Disk alanı
- Network trafiği

### Application Metrikleri
- API response times
- Error rates
- User activity
- Performance metrics

## 🚨 Troubleshooting

### Yaygın Sorunlar

#### Backend Başlamıyor
```bash
# Port kontrolü
netstat -tulpn | grep :3000

# Log kontrolü
pm2 logs

# Servis restart
pm2 restart all
```

#### Frontend Build Hatası
```bash
# Cache temizle
rm -rf node_modules package-lock.json
npm install

# Build tekrar
npm run build
```

#### Database Bağlantı Hatası
```bash
# PostgreSQL durumu
sudo systemctl status postgresql

# Bağlantı testi
psql -h localhost -U username -d database_name
```

## 📞 Destek

### Log Dosyaları
```bash
# Backend logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx
```

### Debug Mode
```bash
# Backend debug
NODE_ENV=development npm run start:dev

# Frontend debug
REACT_APP_DEBUG=true npm start
```

## 🎉 Başarılı Kurulum Kontrolü

Kurulum başarılı olduğunda şunları görebilmelisiniz:

1. **Backend**: `http://localhost:3000` - API çalışıyor
2. **Frontend**: `http://localhost:3000` - Admin panel açılıyor
3. **Database**: PostgreSQL bağlantısı başarılı
4. **Redis**: Cache servisi çalışıyor
5. **Admin Panel**: Gerçek verilerle dolu tablolar

## 🚀 Sonraki Adımlar

1. **Production Deploy**: `DEPLOYMENT_GUIDE.md` dosyasını takip edin
2. **SSL Sertifikası**: Let's Encrypt ile HTTPS aktifleştirin
3. **Monitoring**: Prometheus + Grafana kurun
4. **Backup**: Otomatik yedekleme sistemi kurun
5. **Scaling**: Load balancer ve cluster kurun

Bu rehberi takip ederek Okuz AI admin panelini hızlıca çalıştırabilirsiniz! 🎯
