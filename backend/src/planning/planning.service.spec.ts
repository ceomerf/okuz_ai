import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../services/queue.service';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../services/gemini.service';
import { GeminiFunctionCallingService } from '../services/gemini-fc.service';
import { SolverService } from '../services/solver.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MetricsService } from '../monitoring/metrics.service';
import { PlanGenerationService } from './plan-generation.service';
import { PlanValidationService } from './plan-validation.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { CacheService } from '../services/cache.service';

describe('PlanningService', () => {
  let service: PlanningService;
  let prismaService: PrismaService;
  let queueService: QueueService;

  // Mock all dependencies
  const mockPrismaService = {
    plan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    curriculum: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback({
        studySession: { deleteMany: jest.fn() },
        plan: { delete: jest.fn() }
      });
    }),
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockGeminiService = {
    generateContent: jest.fn(),
  };

  const mockGeminiFunctionCallingService = {
    callFunction: jest.fn(),
  };

  const mockSolverService = {
    solve: jest.fn(),
  };

  const mockRealtimeGateway = {
    emit: jest.fn(),
  };

  const mockMetricsService = {
    recordPlanGeneration: jest.fn(),
    recordPlanUpdate: jest.fn(),
    recordPlanDelete: jest.fn(),
  };

  const mockPlanGenerationService = {
    generatePlan: jest.fn(),
    buildScheduleFromTopics: jest.fn().mockResolvedValue({}),
  };

  const mockPlanValidationService = {
    validatePlan: jest.fn(),
  };

  const mockPlanPersistenceService = {
    savePlan: jest.fn(),
    updatePlan: jest.fn(),
    deletePlan: jest.fn(),
  };

  const mockScheduleAdjustmentService = {
    adjustSchedule: jest.fn(),
  };

  const mockAdaptiveInsightsService = {
    generateInsights: jest.fn(),
    computeUserInsights: jest.fn().mockResolvedValue({}),
  };

  const mockAdaptiveStrategyService = {
    adaptStrategy: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GeminiService, useValue: mockGeminiService },
        { provide: GeminiFunctionCallingService, useValue: mockGeminiFunctionCallingService },
        { provide: SolverService, useValue: mockSolverService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: PlanGenerationService, useValue: mockPlanGenerationService },
        { provide: PlanValidationService, useValue: mockPlanValidationService },
        { provide: PlanPersistenceService, useValue: mockPlanPersistenceService },
        { provide: ScheduleAdjustmentService, useValue: mockScheduleAdjustmentService },
        { provide: AdaptiveInsightsService, useValue: mockAdaptiveInsightsService },
        { provide: AdaptiveStrategyService, useValue: mockAdaptiveStrategyService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    prismaService = module.get<PrismaService>(PrismaService);
    queueService = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePlan', () => {
    it('should add job to queue for plan generation', async () => {
      const planData = {
        mode: 'ai' as any,
        planDurationWeeks: 4,
        planFocus: 'YKS hazırlık',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1'],
        userId: 'user-123',
      };

      mockQueueService.addJob.mockResolvedValue({ id: 'job-123' });

      const result = await service.generatePlan(planData);

      expect(result).toHaveProperty('jobId');
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        'generate-plan',
        expect.objectContaining({
          userId: 'user-123',
          planData: planData,
        })
      );
    });
  });

  describe('getUserPlans', () => {
    it('should return user plans successfully', async () => {
      const userId = 'user-123';
      const mockPlans = [
        { id: 'plan-1', title: 'Plan 1', userId },
        { id: 'plan-2', title: 'Plan 2', userId },
      ];

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans);
      mockPrismaService.plan.findFirst.mockResolvedValue({ id: 'plan-1', sessions: [] });
      mockPrismaService.plan.findMany.mockResolvedValueOnce(mockPlans).mockResolvedValueOnce([]);

      const result = await service.getUserPlans(userId);

      expect(result).toEqual(mockPlans);
      expect(mockPrismaService.plan.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no plans found', async () => {
      const userId = 'user-123';

      mockPrismaService.plan.findMany.mockResolvedValue([]);

      const result = await service.getUserPlans(userId);

      expect(result).toEqual([]);
    });
  });

  describe('updatePlan', () => {
    it('should update plan successfully', async () => {
      const planId = 'plan-123';
      const updateData = { title: 'Updated Plan' };
      const mockUpdatedPlan = { id: planId, ...updateData };

      mockPrismaService.plan.findFirst.mockResolvedValue({ id: planId, userId: 'user-123' });
      mockPrismaService.plan.update.mockResolvedValue(mockUpdatedPlan);

      const result = await service.updatePlan('user-123', planId, updateData);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('plan');
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: updateData,
      });
    });

    it('should throw NotFoundException if plan not found', async () => {
      const planId = 'non-existent-plan';
      const updateData = { title: 'Updated Plan' };

      mockPrismaService.plan.update.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(service.updatePlan('user-123', planId, updateData))
        .rejects.toThrow();
    });
  });

  describe('deletePlan', () => {
    it('should delete plan successfully', async () => {
      const planId = 'plan-123';

      mockPrismaService.plan.findFirst.mockResolvedValue({ id: planId, userId: 'user-123' });
      mockPrismaService.plan.delete.mockResolvedValue({ id: planId });

      const result = await service.deletePlan('user-123', planId);

      expect(result).toEqual({ id: planId });
      expect(mockPrismaService.plan.delete).toHaveBeenCalledWith({
        where: { id: planId },
      });
    });

    it('should throw NotFoundException if plan not found', async () => {
      const planId = 'non-existent-plan';

      mockPrismaService.plan.delete.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(service.deletePlan('user-123', planId))
        .rejects.toThrow();
    });
  });
});