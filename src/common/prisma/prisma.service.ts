import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Bu, modül başlatıldığında veritabanına bağlanmak için isteğe bağlı bir adımdır.
    await this.$connect();
  }
}
