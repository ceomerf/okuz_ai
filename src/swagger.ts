import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });

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
  const outPath = join(__dirname, '..', 'swagger.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2), { encoding: 'utf-8' });
  await app.close();
  // eslint-disable-next-line no-console
  console.log(`Swagger JSON yazıldı: ${outPath}`);
}

generateSwagger();

