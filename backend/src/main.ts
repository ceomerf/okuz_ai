import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Güvenlik ve performans middleware'leri
  app.use(helmet());
  // compression import'u CJS olduğundan namespace import ile çağırıyoruz
  app.use((compression as unknown as () => any)());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }) as any,
  );

  // CORS configuration (yalnızca izinli origin'ler)
  const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

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

  const port = process.env.PORT || 3002; // Port 3002'ye değiştirdik
  await app.listen(port);
  
  console.log(`🚀 Okuz AI Backend is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
