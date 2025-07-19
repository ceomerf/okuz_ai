import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import dotenv from 'dotenv';

// Import utilities
import { initializeFirebase } from './utils/firebase';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';

// Import routes
import profileRoutes from './routes/profile';
import planningRoutes from './routes/planning';
import interactionRoutes from './routes/interaction';
import gamificationRoutes from './routes/gamification';
import analysisRoutes from './routes/analysis';
import subscriptionRoutes from './routes/subscription';
import notificationRoutes from './routes/notifications';
import inviteRoutes from './routes/invite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = 'v1';

// Initialize Firebase
initializeFirebase();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// General Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test Route
app.get('/api/v1/test', (req, res) => {
  res.status(200).json({
    message: 'Test route çalışıyor!',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use(`/api/${API_VERSION}/profile`, profileRoutes);
app.use(`/api/${API_VERSION}/planning`, planningRoutes);
app.use(`/api/${API_VERSION}/interaction`, interactionRoutes);
app.use(`/api/${API_VERSION}/gamification`, gamificationRoutes);
app.use(`/api/${API_VERSION}/analysis`, analysisRoutes);
app.use(`/api/${API_VERSION}/subscription`, subscriptionRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/invite`, inviteRoutes); // v1 prefix'i ile de ekle

// Invite routes - API versiyonu olmadan direkt /api/invite olarak kullanılıyor
app.use('/api/invite', inviteRoutes);

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Okuz AI Express API',
    version: process.env.npm_package_version || '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route bulunamadı',
    path: req.originalUrl,
    method: req.method
  });
});

// Error Handler
app.use(errorHandler);

// Start Server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Okuz AI API sunucu başlatıldı!`);
  logger.info(`📡 Port: ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📋 API Version: ${API_VERSION}`);
  logger.info(`🔗 Health Check: http://localhost:${PORT}/health`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} sinyali alındı. Sunucu kapatılıyor...`);
  server.close(() => {
    logger.info('Sunucu başarıyla kapatıldı.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app; 