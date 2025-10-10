import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const isDev = process.env.NODE_ENV !== 'production';
    super({
      log: isDev ? ['query', 'warn', 'error'] : ['warn', 'error'] as any,
    } as any);
  }

  async onModuleInit() {
    // Swagger üretimi veya test için veritabanı bağlantısını atla
    if (process.env.SKIP_DB === '1') {
      return;
    }
    await this.$connect();
  }
}