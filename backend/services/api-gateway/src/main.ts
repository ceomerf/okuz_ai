import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap() {
  const logger = new Logger('ApiGateway');
  
  // Create the application
  const app = await NestFactory.create(ApiGatewayModule);
  
  // Get configuration
  const configService = app.get(ConfigService);
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Okuz AI API Gateway')
    .setDescription('API Gateway for Okuz AI microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Planning', 'Study planning and scheduling')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('AI', 'AI services and content generation')
    .addTag('Notifications', 'Notification services')
    .addTag('Health', 'Health checks and monitoring')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start the server
  const port = configService.get<number>('API_GATEWAY_PORT', 3000);
  await app.listen(port);
  
  logger.log(`API Gateway is running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('Failed to start API Gateway:', error);
  process.exit(1);
});
