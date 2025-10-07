import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanningMicroserviceModule } from './planning-microservice.module';

async function bootstrap() {
  const logger = new Logger('PlanningMicroservice');
  
  // Create the microservice
  const app = await NestFactory.create(PlanningMicroserviceModule);
  
  // Get configuration
  const configService = app.get(ConfigService);
  const kafkaBrokers = configService.get<string>('KAFKA_BROKERS', 'localhost:9092').split(',');
  const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
  
  // Connect to Kafka
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'planning-service',
        brokers: kafkaBrokers,
        retry: {
          retries: 5,
          initialRetryTime: 1000,
          maxRetryTime: 30000,
        },
      },
      consumer: {
        groupId: 'planning-service-group',
        allowAutoTopicCreation: true,
      },
      producer: {
        allowAutoTopicCreation: true,
      },
    },
  });

  // Connect to Redis for caching
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: new URL(redisUrl).hostname,
      port: parseInt(new URL(redisUrl).port) || 6379,
      password: new URL(redisUrl).password || undefined,
    },
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Start microservices
  await app.startAllMicroservices();
  
  // Start HTTP server for health checks
  const port = configService.get<number>('PLANNING_SERVICE_PORT', 3003);
  await app.listen(port);
  
  logger.log(`Planning Microservice is running on port ${port}`);
  logger.log(`Kafka brokers: ${kafkaBrokers.join(', ')}`);
  logger.log(`Redis URL: ${redisUrl}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Planning Microservice:', error);
  process.exit(1);
});