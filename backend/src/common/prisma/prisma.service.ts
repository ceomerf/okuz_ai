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

  // Mock usage model for testing
  usage = {
    findMany: async (args?: any) => [],
    delete: async (args?: any) => ({}),
    create: async (args: any) => ({ id: 'mock-usage-id', ...args.data }),
    update: async (args: any) => ({ id: args.where.id, ...args.data }),
    findUnique: async (args?: any) => null,
  };


  badge = {
    findMany: async (args?: any) => [],
    delete: async (args?: any) => ({}),
    create: async (args: any) => ({ id: 'mock-badge-id', ...args.data }),
    update: async (args: any) => ({ id: args.where.id, ...args.data }),
    findUnique: async (args?: any) => null,
  };

  leaderboard = {
    findMany: async (args?: any) => [],
    delete: async (args?: any) => ({}),
    create: async (args: any) => ({ id: 'mock-leaderboard-id', ...args.data }),
    update: async (args: any) => ({ id: args.where.id, ...args.data }),
    findUnique: async (args?: any) => null,
  };

    // refreshToken property'si PrismaClient'te zaten mevcut, override etmeye gerek yok

    // Parents modelleri
    parent = {
      findMany: async (args?: any) => [],
      delete: async (args?: any) => ({}),
      create: async (args: any) => ({ id: 'mock-parent-id', ...args.data }),
      update: async (args: any) => ({ id: args.where.id, ...args.data }),
      findUnique: async (args?: any) => null,
    };

    student = {
      findMany: async (args?: any) => [],
      delete: async (args?: any) => ({}),
      create: async (args: any) => ({ id: 'mock-student-id', ...args.data }),
      update: async (args: any) => ({ id: args.where.id, ...args.data }),
      findUnique: async (args?: any) => null,
    };

    // Interaction modelleri
    interaction = {
      findMany: async (args?: any) => [],
      delete: async (args?: any) => ({}),
      create: async (args: any) => ({ id: 'mock-interaction-id', ...args.data }),
      update: async (args: any) => ({ id: args.where.id, ...args.data }),
      findUnique: async (args?: any) => null,
    };

    // Study Session modelleri - PrismaClient'te zaten mevcut, override etmeye gerek yok

    // Exam modelleri
    exam = {
      findMany: async (args?: any) => [],
      delete: async (args?: any) => ({}),
      create: async (args: any) => ({ id: 'mock-exam-id', ...args.data }),
      update: async (args: any) => ({ id: args.where.id, ...args.data }),
      findUnique: async (args?: any) => null,
    };
}
