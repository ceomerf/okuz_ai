import { Test, TestingModule } from '@nestjs/testing';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GeminiService } from '../../services/gemini.service';

describe('GamificationController', () => {
  let controller: GamificationController;
  let service: GamificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: {
            gamificationProfile: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            achievement: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            studySession: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: GeminiService,
          useValue: {
            generateContent: jest.fn(),
            generateStructuredContent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GamificationController>(GamificationController);
    service = module.get<GamificationService>(GamificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have GamificationService injected', () => {
    expect(service).toBeDefined();
  });
});
