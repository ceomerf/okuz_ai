import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../services/queue.service';
import { ConfigService } from '@nestjs/config';
// import { GeminiService } from '../services/gemini.service'; // DEVRE DIŞI - OPENAI KULLANILIYOR
// import { GeminiFunctionCallingService } from '../services/gemini-fc.service'; // DEVRE DIŞI - OPENAI KULLANILIYOR
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
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GeneratePlanDto, PlanMode } from './dto/generate-plan.dto';

describe('PlanningService', () => {
  let service: PlanningService;
  let prismaService: PrismaService;
  let queueService: QueueService;
  let planGenerationService: PlanGenerationService;
  let planValidationService: PlanValidationService;
  let planPersistenceService: PlanPersistenceService;
  let adaptiveInsightsService: AdaptiveInsightsService;
  let cacheService: CacheService;

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
    studentProfile: {
      findUnique: jest.fn(),
    },
    curriculum: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    studySession: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

  // const mockGeminiService = { // DEVRE DIŞI - OPENAI KULLANILIYOR
  //   generateContent: jest.fn(),
  // };

  // const mockGeminiFunctionCallingService = { // DEVRE DIŞI - OPENAI KULLANILIYOR
  //   callFunction: jest.fn(),
  // };

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
    recordPlanGenerationDuration: jest.fn(),
  };

  const mockPlanGenerationService = {
    generatePlan: jest.fn(),
    buildScheduleFromTopics: jest.fn().mockResolvedValue({
      weeklyPlans: [{
        week: 1,
        focus: 'Test Focus',
        sessions: [{
          subject: 'Matematik',
          topic: 'Test Topic',
          durationInMinutes: 45,
          type: 'study',
          difficulty: 'medium',
          objectives: ['Test Objective'],
          resources: ['Test Resource'],
          techniques: ['Test Technique']
        }]
      }],
      milestones: [{
        week: 1,
        goal: 'Test Goal',
        assessment: 'Test Assessment',
        criteria: 'Test Criteria'
      }],
      adaptiveStrategies: ['Test Strategy']
    }),
    enrichSkeletonWithAI: jest.fn().mockResolvedValue({
      weeklyPlans: [{
        week: 1,
        focus: 'AI Enhanced Focus',
        sessions: []
      }],
      milestones: [],
      adaptiveStrategies: []
    }),
    filterSubjectsForGradeAndTrack: jest.fn().mockReturnValue(['Matematik', 'Fizik']),
  };

  const mockPlanValidationService = {
    validatePlan: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    assertBusinessRules: jest.fn().mockReturnValue({}),
    validateSessions: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  };

  const mockPlanPersistenceService = {
    savePlan: jest.fn(),
    updatePlan: jest.fn(),
    deletePlan: jest.fn(),
    savePlanWithSessions: jest.fn().mockResolvedValue({ id: 'plan-123' }),
  };

  const mockScheduleAdjustmentService = {
    adjustSchedule: jest.fn(),
  };

  const mockAdaptiveInsightsService = {
    generateInsights: jest.fn(),
    computeUserInsights: jest.fn().mockResolvedValue({
      weakAreas: ['Algebra'],
      strongAreas: ['Geometry'],
      topicSuccessRates: { 'Algebra': 0.6, 'Geometry': 0.9 },
      subjectPerformance: { 'Matematik': 0.8 },
      preferredStudyHours: ['morning', 'evening'],
      subjectTimeAllocation: { 'Matematik': 60, 'Fizik': 40 }
    }),
  };

  const mockAdaptiveStrategyService = {
    adaptStrategy: jest.fn(),
    deriveHints: jest.fn().mockResolvedValue({
      hints: ['Focus on weak areas', 'Practice more problems']
    }),
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
        // { provide: GeminiService, useValue: mockGeminiService }, // DEVRE DIŞI - OPENAI KULLANILIYOR
        // { provide: GeminiFunctionCallingService, useValue: mockGeminiFunctionCallingService }, // DEVRE DIŞI - OPENAI KULLANILIYOR
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
    planGenerationService = module.get<PlanGenerationService>(PlanGenerationService);
    planValidationService = module.get<PlanValidationService>(PlanValidationService);
    planPersistenceService = module.get<PlanPersistenceService>(PlanPersistenceService);
    adaptiveInsightsService = module.get<AdaptiveInsightsService>(AdaptiveInsightsService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePlan', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      studentProfile: {
        grade: 12,
        field: 'Sayısal',
        learningStyle: 'Görsel',
        goals: ['YKS hazırlık'],
        strengths: ['Matematik'],
        weaknesses: ['Fizik'],
        selectedSubjects: ['Matematik', 'Fizik', 'Kimya']
      }
    };

    const mockPlanData: GeneratePlanDto & { userId: string } = {
      mode: PlanMode.AI,
      planDurationWeeks: 4,
      planFocus: 'YKS hazırlık',
      subjects: ['Matematik', 'Fizik'],
      goals: ['Hedef 1'],
      userId: 'user-123',
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(mockUser.studentProfile);
      mockPrismaService.curriculum.findMany.mockResolvedValue([
        { subject: 'Matematik', topic: 'Algebra', grade: 12 },
        { subject: 'Fizik', topic: 'Mechanics', grade: 12 }
      ]);
    });

    it('should generate plan successfully with AI mode', async () => {
      const mockPlan = {
        id: 'plan-123',
        title: 'AI Generated Plan',
        description: 'Test plan',
        type: 'ai',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        sessions: []
      };

      mockPlanPersistenceService.savePlanWithSessions.mockResolvedValue(mockPlan);
      mockMetricsService.recordPlanGeneration.mockResolvedValue(undefined);

      const result = await service.generatePlan(mockPlanData);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('plan');
      expect(mockPlanPersistenceService.savePlanWithSessions).toHaveBeenCalled();
      expect(mockMetricsService.recordPlanGeneration).toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.generatePlan(mockPlanData))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle missing student profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);

      await expect(service.generatePlan(mockPlanData))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle AI enrichment failure gracefully', async () => {
      mockPlanGenerationService.enrichSkeletonWithAI.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.generatePlan(mockPlanData);

      expect(result).toHaveProperty('success', true);
      expect(result.plan).toHaveProperty('fallbackReason', 'ai_enrichment_failed');
    });

    it('should handle invalid plan data', async () => {
      const invalidPlanData = {
        mode: 'invalid' as any,
        planDurationWeeks: 4,
        planFocus: 'Test',
        subjects: [],
        goals: [],
        userId: 'user-123',
      };

      await expect(service.generatePlan(invalidPlanData))
        .rejects.toThrow(BadRequestException);
    });

    it('should use cache when available', async () => {
      const cachedPlan = { id: 'cached-plan', title: 'Cached Plan' };
      mockCacheService.get.mockResolvedValue(cachedPlan);

      const result = await service.generatePlan(mockPlanData);

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(result.plan).toEqual(cachedPlan);
    });
  });

  describe('getUserPlans', () => {
    const userId = 'user-123';
    const mockPlans = [
      {
        id: 'plan-1',
        title: 'Plan 1',
        description: 'Test plan 1',
        type: 'ai',
        subjects: ['Matematik'],
        goals: ['Goal 1'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-08'),
        isActive: true,
        sessions: [
          {
            id: 'session-1',
            subject: 'Matematik',
            topic: 'Algebra',
            startTime: new Date('2024-01-01T09:00:00'),
            duration: 45,
            isCompleted: true,
            difficulty: 'medium',
            type: 'study'
          },
          {
            id: 'session-2',
            subject: 'Matematik',
            topic: 'Geometry',
            startTime: new Date('2024-01-02T09:00:00'),
            duration: 60,
            isCompleted: false,
            difficulty: 'hard',
            type: 'practice'
          }
        ]
      },
      {
        id: 'plan-2',
        title: 'Plan 2',
        description: 'Test plan 2',
        type: 'basic',
        subjects: ['Fizik'],
        goals: ['Goal 2'],
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-22'),
        isActive: false,
        sessions: []
      }
    ];

    beforeEach(() => {
      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans);
    });

    it('should return user plans with calculated progress', async () => {
      const result = await service.getUserPlans(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'plan-1');
      expect(result[0]).toHaveProperty('progress');
      expect(result[0]).toHaveProperty('nextSession');
      expect(result[0]).toHaveProperty('stats');
      expect(result[0].stats).toHaveProperty('totalSessions', 2);
      expect(result[0].stats).toHaveProperty('completedSessions', 1);
      expect(result[0].stats).toHaveProperty('totalStudyTime', 105);
      expect(result[0].stats).toHaveProperty('completedStudyTime', 45);
    });

    it('should return empty array when no plans found', async () => {
      mockPrismaService.plan.findMany.mockResolvedValue([]);

      const result = await service.getUserPlans(userId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrismaService.plan.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getUserPlans(userId))
        .rejects.toThrow('Database connection failed');
    });

    it('should calculate progress correctly for plans with no sessions', async () => {
      const plansWithNoSessions = [{
        ...mockPlans[0],
        sessions: []
      }];
      mockPrismaService.plan.findMany.mockResolvedValue(plansWithNoSessions);

      const result = await service.getUserPlans(userId);

      expect(result[0].progress).toBe(0);
      expect(result[0].stats.completedSessions).toBe(0);
    });
  });

  describe('calculatePlanProgress', () => {
    it('should calculate progress correctly for completed sessions', () => {
      const sessions = [
        { isCompleted: true, duration: 60 },
        { isCompleted: true, duration: 45 },
        { isCompleted: false, duration: 30 },
        { isCompleted: true, duration: 90 }
      ];

      const progress = service['calculatePlanProgress'](sessions);

      expect(progress).toBe(75); // 3 out of 4 sessions completed
    });

    it('should return 0 for empty sessions array', () => {
      const progress = service['calculatePlanProgress']([]);

      expect(progress).toBe(0);
    });

    it('should return 0 for sessions with no completed sessions', () => {
      const sessions = [
        { isCompleted: false, duration: 60 },
        { isCompleted: false, duration: 45 }
      ];

      const progress = service['calculatePlanProgress'](sessions);

      expect(progress).toBe(0);
    });

    it('should return 100 for all completed sessions', () => {
      const sessions = [
        { isCompleted: true, duration: 60 },
        { isCompleted: true, duration: 45 }
      ];

      const progress = service['calculatePlanProgress'](sessions);

      expect(progress).toBe(100);
    });
  });

  describe('updatePlan', () => {
    const userId = 'user-123';
    const planId = 'plan-123';
    const updateData = { title: 'Updated Plan', description: 'Updated description' };

    it('should update plan successfully', async () => {
      const mockPlan = { id: planId, userId, title: 'Original Plan' };
      const updatedPlan = { ...mockPlan, ...updateData };

      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);
      mockPrismaService.plan.update.mockResolvedValue(updatedPlan);
      mockMetricsService.recordPlanUpdate.mockResolvedValue(undefined);

      const result = await service.updatePlan(userId, planId, updateData);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('plan', updatedPlan);
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: updateData
      });
      expect(mockMetricsService.recordPlanUpdate).toHaveBeenCalled();
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.plan.findFirst.mockResolvedValue(null);

      await expect(service.updatePlan(userId, planId, updateData))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not own the plan', async () => {
      const mockPlan = { id: planId, userId: 'other-user' };
      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);

      await expect(service.updatePlan(userId, planId, updateData))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle database errors during update', async () => {
      const mockPlan = { id: planId, userId };
      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);
      mockPrismaService.plan.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updatePlan(userId, planId, updateData))
        .rejects.toThrow('Database error');
    });
  });

  describe('deletePlan', () => {
    const userId = 'user-123';
    const planId = 'plan-123';

    it('should delete plan successfully', async () => {
      const mockPlan = { id: planId, userId };
      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);
      mockPrismaService.plan.delete.mockResolvedValue(mockPlan);
      mockMetricsService.recordPlanDelete.mockResolvedValue(undefined);

      const result = await service.deletePlan(userId, planId);

      expect(result).toHaveProperty('success', true);
      expect(mockPrismaService.plan.delete).toHaveBeenCalledWith({
        where: { id: planId }
      });
      expect(mockMetricsService.recordPlanDelete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.plan.findFirst.mockResolvedValue(null);

      await expect(service.deletePlan(userId, planId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not own the plan', async () => {
      const mockPlan = { id: planId, userId: 'other-user' };
      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);

      await expect(service.deletePlan(userId, planId))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle database errors during deletion', async () => {
      const mockPlan = { id: planId, userId };
      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);
      mockPrismaService.plan.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deletePlan(userId, planId))
        .rejects.toThrow('Database error');
    });
  });

  describe('getRelevantTopicsForStudent', () => {
    const mockStudentProfile = {
      grade: 12,
      field: 'Sayısal',
      selectedSubjects: ['Matematik', 'Fizik']
    };

    it('should return relevant topics for student', async () => {
      const mockTopics = [
        { subject: 'Matematik', topic: 'Algebra', grade: 12 },
        { subject: 'Fizik', topic: 'Mechanics', grade: 12 }
      ];

      mockPrismaService.curriculum.findMany.mockResolvedValue(mockTopics);

      const result = await service['getRelevantTopicsForStudent'](mockStudentProfile, new Date());

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrismaService.curriculum.findMany).toHaveBeenCalled();
    });

    it('should handle empty curriculum data', async () => {
      mockPrismaService.curriculum.findMany.mockResolvedValue([]);

      const result = await service['getRelevantTopicsForStudent'](mockStudentProfile, new Date());

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrismaService.curriculum.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service['getRelevantTopicsForStudent'](mockStudentProfile, new Date()))
        .rejects.toThrow('Database error');
    });
  });

  describe('normalizeAiPlanStructure', () => {
    it('should normalize AI plan structure correctly', () => {
      const mockStruct = {
        planTitle: 'Test Plan',
        weeklyPlans: [
          {
            week: 1,
            sessions: [
              {
                subject: 'Matematik',
                topic: 'Algebra',
                durationInMinutes: 45,
                type: 'study',
                difficulty: 'medium'
              }
            ]
          }
        ]
      };

      const result = service['normalizeAiPlanStructure'](mockStruct, 7);

      expect(result).toHaveProperty('planTitle', 'Test Plan');
      expect(result).toHaveProperty('weeklyPlans');
      expect(Array.isArray(result.weeklyPlans)).toBe(true);
    });

    it('should handle missing plan title', () => {
      const mockStruct = {
        weeklyPlans: []
      };

      const result = service['normalizeAiPlanStructure'](mockStruct, 7);

      expect(result.planTitle).toBe('Kişiselleştirilmiş Çalışma Planı');
    });

    it('should handle empty weekly plans', () => {
      const mockStruct = {
        planTitle: 'Test Plan',
        weeklyPlans: []
      };

      const result = service['normalizeAiPlanStructure'](mockStruct, 7);

      expect(result.weeklyPlans).toEqual([]);
    });
  });

  describe('cleanAiJsonResponse', () => {
    it('should clean JSON response correctly', () => {
      const dirtyJson = '```json\n{"test": "value"}\n```';
      const result = service['cleanAiJsonResponse'](dirtyJson);

      expect(result).toBe('{"test": "value"}');
    });

    it('should handle response without code fences', () => {
      const cleanJson = '{"test": "value"}';
      const result = service['cleanAiJsonResponse'](cleanJson);

      expect(result).toBe('{"test": "value"}');
    });

    it('should handle empty response', () => {
      const result = service['cleanAiJsonResponse']('');

      expect(result).toBe('');
    });
  });
});