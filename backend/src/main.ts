import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import compression from 'compression';
import { SentryService } from './monitoring/sentry.service';
import { Request, Response, NextFunction } from 'express';
import { sanitizeLogsMiddleware } from './common/middleware';
import { requestContextMiddleware } from './common/logging/request-context.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import rateLimit from 'express-rate-limit';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Compression middleware
  app.use(compression());

  // Request context middleware
  app.use(requestContextMiddleware);

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
    credentials: true,
  });

  // Custom middleware for request sanitization
  app.use(sanitizeLogsMiddleware);

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Okuz AI API')
    .setDescription(`
      Okuz AI Backend API Documentation
      
      ## API Versions
      - **v1**: Current stable version
      - **v2**: Enhanced version with new features
      - **v3**: Future version (in development)
      
      ## Authentication
      Most endpoints require JWT authentication. Include the token in the Authorization header:
      \`Authorization: Bearer <your-token>\`
      
      ## Rate Limiting
      - General API: 100 requests per 15 minutes
      - Smart Tools: 2-10 requests per minute (depending on tool)
      
      ## Versioning
      API versions are specified in the URL path:
      - \`/api/v1/users\` - Version 1
      - \`/api/v2/users\` - Version 2
      
      ## Error Handling
      All errors follow a consistent format:
      \`\`\`json
      {
        "statusCode": 400,
        "message": "Error description",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "path": "/api/v1/endpoint"
      }
      \`\`\`
    `)
    .setVersion('2.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for external services',
      },
      'API-Key',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Planning', 'Study planning endpoints')
    .addTag('Smart Tools', 'AI-powered tools endpoints')
    .addTag('Analysis', 'Analytics and reporting endpoints')
    .addTag('Subscription', 'Subscription management endpoints')
    .addTag('Webhook', 'Webhook endpoints for external services')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'Okuz AI API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6; }
    `,
  });

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req: any, res: any) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API version info endpoint
  app.getHttpAdapter().get('/api/versions', (req: any, res: any) => {
    res.status(200).json({
      versions: [
        {
          version: 'v1',
          status: 'stable',
          deprecationDate: null,
          sunsetDate: null,
        },
        {
          version: 'v2',
          status: 'stable',
          deprecationDate: null,
          sunsetDate: null,
        },
        {
          version: 'v3',
          status: 'beta',
          deprecationDate: null,
          sunsetDate: null,
        },
      ],
      current: 'v2',
      latest: 'v2',
    });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Okuz AI Backend is running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${port}/health`);
  console.log(`📊 API Versions: http://localhost:${port}/api/versions`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});