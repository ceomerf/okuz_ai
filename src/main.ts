import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS ayarları
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix - geçici olarak kaldırıldı
  // app.setGlobalPrefix('api');

  // Port ayarı
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📚 API docs: http://localhost:${port}/api-docs`);
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 CI/CD Pipeline Test - ${new Date().toISOString()}`);
}

bootstrap(); 