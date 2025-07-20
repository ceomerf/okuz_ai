import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './utils/errorHandler';
import { logger } from './utils/logger';
import path from 'path';
import fs from 'fs';

// Routes
import planningRoutes from './routes/planning';
import profileRoutes from './routes/profile';
import interactionRoutes from './routes/interaction';
import gamificationRoutes from './routes/gamification';
import analysisRoutes from './routes/analysis';
import subscriptionRoutes from './routes/subscription';
import notificationsRoutes from './routes/notifications';
import inviteRoutes from './routes/invite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/planning', planningRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/interaction', interactionRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/invite', inviteRoutes); // Invite route'unu ekledim

// Deep Link Yönlendirme - Öğrenci Daveti
app.get('/invite/student/:token', (req, res) => {
  const token = req.params.token;
  
  // Token geçerlilik kontrolü
  if (!token || token.trim() === '') {
    return res.status(400).send('Geçersiz davet bağlantısı');
  }
  
  // Mobil uygulama yönlendirmesi
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Okuz AI - Öğrenci Daveti</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
          text-align: center;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 500px;
          background-color: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c3e50;
          margin-bottom: 20px;
        }
        p {
          color: #34495e;
          margin-bottom: 30px;
          line-height: 1.5;
        }
        .btn {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: bold;
          margin: 10px;
          transition: background-color 0.3s;
        }
        .btn:hover {
          background-color: #2980b9;
        }
        .btn-secondary {
          background-color: #95a5a6;
        }
        .btn-secondary:hover {
          background-color: #7f8c8d;
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="/images/logo.png" alt="Okuz AI Logo" class="logo">
        <h1>Okuz AI Öğrenci Daveti</h1>
        <p>Okuz AI uygulamasına öğrenci olarak davet edildiniz. Devam etmek için aşağıdaki butona tıklayın.</p>
        <a href="okuz://student/${token}" class="btn">Uygulamayı Aç</a>
        <p>Uygulama yüklü değil mi?</p>
        <div>
          <a href="https://play.google.com/store/apps/details?id=com.okuz.ai" class="btn btn-secondary">Google Play</a>
          <a href="https://apps.apple.com/app/okuz-ai/id123456789" class="btn btn-secondary">App Store</a>
        </div>
      </div>
      <script>
        // Otomatik yönlendirme
        setTimeout(function() {
          window.location.href = "okuz://student/${token}";
        }, 500);
      </script>
    </body>
    </html>
  `);
});

// Deep Link Yönlendirme - Veli Daveti
app.get('/invite/parent/:token', (req, res) => {
  const token = req.params.token;
  
  // Token geçerlilik kontrolü
  if (!token || token.trim() === '') {
    return res.status(400).send('Geçersiz davet bağlantısı');
  }
  
  // Mobil uygulama yönlendirmesi
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Okuz AI - Veli Daveti</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
          text-align: center;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 500px;
          background-color: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c3e50;
          margin-bottom: 20px;
        }
        p {
          color: #34495e;
          margin-bottom: 30px;
          line-height: 1.5;
        }
        .btn {
          display: inline-block;
          background-color: #3498db;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: bold;
          margin: 10px;
          transition: background-color 0.3s;
        }
        .btn:hover {
          background-color: #2980b9;
        }
        .btn-secondary {
          background-color: #95a5a6;
        }
        .btn-secondary:hover {
          background-color: #7f8c8d;
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img src="/images/logo.png" alt="Okuz AI Logo" class="logo">
        <h1>Okuz AI Veli Daveti</h1>
        <p>Okuz AI uygulamasına veli olarak davet edildiniz. Devam etmek için aşağıdaki butona tıklayın.</p>
        <a href="okuz://parent/${token}" class="btn">Uygulamayı Aç</a>
        <p>Uygulama yüklü değil mi?</p>
        <div>
          <a href="https://play.google.com/store/apps/details?id=com.okuz.ai" class="btn btn-secondary">Google Play</a>
          <a href="https://apps.apple.com/app/okuz-ai/id123456789" class="btn btn-secondary">App Store</a>
        </div>
      </div>
      <script>
        // Otomatik yönlendirme
        setTimeout(function() {
          window.location.href = "okuz://parent/${token}";
        }, 500);
      </script>
    </body>
    </html>
  `);
});

// Apple App Site Association dosyası
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: "TEAMID.com.okuz.ai",
          paths: ["/invite/student/*", "/invite/parent/*"]
        }
      ]
    }
  });
});

// ACME Challenge için endpoint (Let's Encrypt SSL doğrulama)
app.get('/.well-known/acme-challenge/:token', (req, res) => {
  const token = req.params.token;
  res.send(`${token}.acme-challenge-response`);
});

// Statik dosyalar için public klasörü
app.use(express.static(path.join(__dirname, '../public')));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  
  // Public klasörünü oluştur (yoksa)
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    logger.info('Public directory created');
  }
});

export default app; 