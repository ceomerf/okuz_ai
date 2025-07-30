import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
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

  const port = process.env.PORT || 3002; // Port 3002'ye değiştirdik
  await app.listen(port);
  
  console.log(`🚀 Okuz AI Backend is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api`);
  console.log(`💾 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
