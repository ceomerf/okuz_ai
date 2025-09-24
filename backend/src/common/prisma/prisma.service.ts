import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Swagger üretimi veya test için veritabanı bağlantısını atla
    if (process.env.SKIP_DB === '1') {
      return;
    }
    await this.$connect();
  }
}
