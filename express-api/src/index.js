const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const admin = require('firebase-admin');
const { authenticateToken } = require('./utils/auth');

// Firebase admin SDK'yı başlat
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

// Rotaları içe aktar
const profileRoutes = require('./routes/profile');
const inviteRoutes = require('./routes/invite');

// Express uygulamasını oluştur
const app = express();

// Middleware'leri ekle
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Ana rota
app.get('/', (req, res) => {
  res.json({
    message: 'Okuz.ai API',
    version: '1.0.0',
  });
});

// API rotaları
app.use('/api/profile', profileRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/register-student', inviteRoutes);
app.use('/api/register-parent', inviteRoutes);

// Apple App Site Association dosyası
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAM_ID.com.okuz.ai',
          paths: ['/invite/student*', '/invite/parent*']
        }
      ]
    }
  });
});

// Android Asset Links dosyası
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.okuz.ai',
        sha256_cert_fingerprints: ['SHA256_FINGERPRINT']
      }
    }
  ]);
});

// 404 hata yakalayıcı
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Bulunamadı',
    path: req.path,
  });
});

// Genel hata yakalayıcı
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: err.message,
  });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 