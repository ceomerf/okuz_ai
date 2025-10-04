import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
// @ts-ignore
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Güvenlik ve performans middleware'leri - ENTERPRISE GRADE
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
  
  // compression import'u CJS olduğundan namespace import ile çağırıyoruz
  app.use((compression as unknown as () => void)());

  // CORS configuration (yalnızca izinli origin'ler) - ENTERPRISE GRADE
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];
  
  if (allowedOrigins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS environment variable is required and must contain at least one origin');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Development ortamında localhost'a izin ver
      if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
        return callback(null, true);
      }
      
      // Origin header yoksa reddet (production'da)
      if (!origin) {
        return callback(new Error('Not allowed by CORS - No origin header'), false);
      }
      
      // Origin listede varsa izin ver
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Origin listede yoksa reddet
      return callback(new Error(`Not allowed by CORS - Origin: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: ['Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe - ENTERPRISE GRADE
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    validateCustomDecorators: true,
    disableErrorMessages: process.env.NODE_ENV === 'production',
    exceptionFactory: (errors) => {
      const result = errors.map((error) => ({
        property: error.property,
        value: error.value,
        constraints: error.constraints,
      }));
      return new Error(`Validation failed: ${JSON.stringify(result)}`);
    },
  }));

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Okuz AI API')
    .setDescription('AI-powered learning platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Smart Tools', 'AI-powered learning tools')
    .addTag('Gamification', 'Learning gamification system')
    .addTag('Planning', 'Study planning and scheduling')
    .addTag('Analysis', 'Performance and learning analysis')
    .addTag('Health', 'Health check endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Okuz AI API Documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: '/swagger-ui-custom.css',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Reverse proxy arkasında doğru client IP ve forwarded header'ları kullanmak için
  app.set('trust proxy', 1);

  // Rate limiting middleware - ENTERPRISE GRADE
  const rateLimit = require('express-rate-limit');
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // IP başına maksimum 100 istek
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => {
      // Health check endpoint'lerini skip et
      return req.path === '/health' || req.path === '/health/detailed';
    }
  }));

  const port = process.env.PORT || 3002; // Port 3002'ye değiştirdik
  await app.listen(port);
  
  console.log(`🚀 Okuz AI Backend is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
