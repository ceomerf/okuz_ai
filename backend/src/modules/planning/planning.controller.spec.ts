import { Test, TestingModule } from '@nestjs/testing';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueService } from '../../services/queue.service';
import { ConfigService } from '@nestjs/config';
// import { GeminiService } from '../../services/gemini.service'; // DEVRE DIŞI - OPENAI KULLANILIYOR

// Mock services
const mockPlanningService = {
  generatePlan: jest.fn(),
  getUserPlans: jest.fn(),
  getPlanById: jest.fn(),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
};

const mockPrismaService = {
  plan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockQueueService = {
  addPlanGenerationJob: jest.fn(),
  getJobStatus: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

// const mockGeminiService = { // DEVRE DIŞI - OPENAI KULLANILIYOR
//   generateContent: jest.fn(),
//   generateContentStream: jest.fn(),
//   callFunction: jest.fn(),
// };

describe('PlanningController', () => {
  let controller: PlanningController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [
        { provide: PlanningService, useValue: mockPlanningService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ConfigService, useValue: mockConfigService },
        // { provide: GeminiService, useValue: mockGeminiService }, // DEVRE DIŞI - OPENAI KULLANILIYOR
      ],
    }).compile();

    controller = module.get<PlanningController>(PlanningController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generatePlan', () => {
    it('should generate a plan', async () => {
      const userId = 'user123';
      const planData = {
        mode: 'AI',
        planDurationWeeks: 4,
        planFocus: 'YKS Hazırlık',
        subjects: ['Matematik'],
        goals: ['Konuları bitir'],
        learningStyle: 'visual',
        dailyMaxMinutes: 180,
        preferredTimes: ['Sabah'],
      };

      const expectedResult = {
        jobId: 'job123',
        message: 'Plan oluşturma isteği alındı.',
      };

      mockPlanningService.generatePlan.mockResolvedValue(expectedResult);

      const result = await controller.generatePlan(userId, planData);

      expect(mockPlanningService.generatePlan).toHaveBeenCalledWith(userId, planData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getUserPlans', () => {
    it('should get user plans', async () => {
      const userId = 'user123';
      const expectedPlans = [
        { id: 'plan1', title: 'Plan 1' },
        { id: 'plan2', title: 'Plan 2' },
      ];

      mockPlanningService.getUserPlans.mockResolvedValue(expectedPlans);

      const result = await controller.getUserPlans(userId);

      expect(mockPlanningService.getUserPlans).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedPlans);
    });
  });
});
