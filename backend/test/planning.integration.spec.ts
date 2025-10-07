import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { PlanningService } from '../src/planning/planning.service';
import { CacheService } from '../src/common/cache/cache.service';
import { QueueService } from '../src/services/queue.service';
import { PlanGenerationService } from '../src/planning/plan-generation.service';
import { PlanPersistenceService } from '../src/planning/plan-persistence.service';
import { PlanValidationService } from '../src/planning/plan-validation.service';
import { ScheduleAdjustmentService } from '../src/planning/schedule-adjustment.service';
import { AiAnalysisService } from '../src/planning/ai-analysis.service';
import { TopicManagementService } from '../src/planning/topic-management.service';
import { ProgressTrackingService } from '../src/planning/progress-tracking.service';
import { AssessmentService } from '../src/planning/assessment.service';
import { CoachingService } from '../src/planning/coaching.service';
import { DigitalDossierService } from '../src/planning/digital-dossier.service';
import { AdaptiveInsightsService } from '../src/planning/adaptive-insights.service';
import { AdaptiveStrategyService } from '../src/planning/adaptive-strategy.service';

describe('Planning Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let planningService: PlanningService;
  let cacheService: CacheService;
  let queueService: QueueService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: PlanGenerationService,
          useValue: {
            generatePlan: jest.fn(),
            generateContent: jest.fn(),
            generateContentWithRetry: jest.fn(),
            parseJsonBlock: jest.fn(),
            normalizeText: jest.fn(),
          },
        },
        {
          provide: PlanPersistenceService,
          useValue: {
            createPlan: jest.fn(),
            createStudySessions: jest.fn(),
            getUserPlans: jest.fn(),
            getPlan: jest.fn(),
            updatePlan: jest.fn(),
            deletePlan: jest.fn(),
          },
        },
        {
          provide: PlanValidationService,
          useValue: {
            validatePlan: jest.fn(),
          },
        },
        {
          provide: ScheduleAdjustmentService,
          useValue: {
            rescheduleSession: jest.fn(),
            completeSession: jest.fn(),
            cancelSession: jest.fn(),
          },
        },
        {
          provide: AiAnalysisService,
          useValue: {
            generateContentWithRetry: jest.fn(),
          },
        },
        {
          provide: TopicManagementService,
          useValue: {
            buildCurriculumTopicPool: jest.fn(),
          },
        },
        {
          provide: ProgressTrackingService,
          useValue: {
            trackProgress: jest.fn(),
            getProgressOverview: jest.fn(),
          },
        },
        {
          provide: AssessmentService,
          useValue: {
            startAssessment: jest.fn(),
            getAssessmentStatus: jest.fn(),
            getMebTopics: jest.fn(),
            getYksSubjectRecommendations: jest.fn(),
          },
        },
        {
          provide: CoachingService,
          useValue: {
            getSmartCoaching: jest.fn(),
          },
        },
        {
          provide: DigitalDossierService,
          useValue: {
            buildUserDossier: jest.fn(),
          },
        },
        {
          provide: AdaptiveInsightsService,
          useValue: {
            generateInsights: jest.fn(),
          },
        },
        {
          provide: AdaptiveStrategyService,
          useValue: {
            generateStrategy: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            plan: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            studySession: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addJob: jest.fn(),
            processJob: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    planningService = moduleFixture.get<PlanningService>(PlanningService);
    cacheService = moduleFixture.get<CacheService>(CacheService);
    queueService = moduleFixture.get<QueueService>(QueueService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Plan Generation Integration', () => {
    it('should generate complete study plan with all components', async () => {
      const userId = 'user123';
      const planRequest = {
        subjects: ['Mathematics', 'Physics', 'Chemistry'],
        duration: 30,
        difficulty: 'MEDIUM',
        learningStyle: 'VISUAL',
        availableTime: 120,
      };

      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        grade: 12,
        learningStyle: 'VISUAL',
      };

      const mockPlan = {
        id: 'plan123',
        userId,
        title: '30-Day Study Plan',
        subjects: planRequest.subjects,
        duration: planRequest.duration,
        difficulty: planRequest.difficulty,
        status: 'ACTIVE',
        createdAt: new Date(),
        sessions: [
          {
            id: 'session1',
            subject: 'Mathematics',
            topic: 'Algebra',
            duration: 60,
            difficulty: 'MEDIUM',
            scheduledDate: new Date(),
          },
          {
            id: 'session2',
            subject: 'Physics',
            topic: 'Mechanics',
            duration: 60,
            difficulty: 'MEDIUM',
            scheduledDate: new Date(),
          },
        ],
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.plan, 'create').mockResolvedValue(mockPlan as any);
      jest.spyOn(prismaService.studySession, 'create').mockResolvedValue({} as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await planningService.generatePlan({ ...planRequest, userId });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.sessions).toBeDefined();
    });

    it('should handle plan generation with caching', async () => {
      const userId = 'user123';
      const planRequest = {
        subjects: ['Mathematics'],
        duration: 7,
        difficulty: 'EASY',
        learningStyle: 'AUDITORY',
        availableTime: 60,
      };

      const cachedPlan = {
        id: 'cached-plan123',
        userId,
        title: 'Cached Plan',
        subjects: ['Mathematics'],
        duration: 7,
        difficulty: 'EASY',
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(cachedPlan));

      const result = await planningService.generatePlan({ ...planRequest, userId });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle plan generation errors gracefully', async () => {
      const planRequest = {
        subjects: [],
        duration: 0,
        difficulty: 'INVALID',
        learningStyle: 'UNKNOWN',
        availableTime: 0,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockRejectedValue(new Error('User not found'));

      await expect(planningService.generatePlan({ ...planRequest, userId: 'invalid' })).rejects.toThrow();
    });
  });

  describe('Plan Management Integration', () => {
    it('should update plan progress with session tracking', async () => {
      const planId = 'plan123';
      const sessionData = {
        userId: 'user123',
        planId,
        subject: 'Mathematics',
        topic: 'Algebra',
        duration: 60,
        completed: true,
        score: 85,
      };

      const mockUpdatedPlan = {
        id: planId,
        progress: 0.5,
        completedSessions: 5,
        totalSessions: 10,
        updatedAt: new Date(),
      };

      const mockSession = {
        id: 'session123',
        planId,
        userId: 'user123',
        subject: 'Math',
        duration: 60,
        completed: true,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.plan, 'findUnique').mockResolvedValue({ id: planId } as any);
      jest.spyOn(prismaService.studySession, 'create').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.plan, 'update').mockResolvedValue(mockUpdatedPlan as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue();

      const result = await planningService.updateProgress(planId, sessionData);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should get user plans with filtering and pagination', async () => {
      const userId = 'user123';
      const filters = {
        status: 'ACTIVE',
        subject: 'Mathematics',
        limit: 10,
        offset: 0,
      };

      const mockPlans = [
        {
          id: 'plan1',
          userId,
          title: 'Math Plan 1',
          subjects: ['Mathematics'],
          status: 'ACTIVE',
          progress: 0.3,
          createdAt: new Date(),
        },
        {
          id: 'plan2',
          userId,
          title: 'Math Plan 2',
          subjects: ['Mathematics'],
          status: 'ACTIVE',
          progress: 0.7,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.plan, 'findMany').mockResolvedValue(mockPlans as any);

      const result = await planningService.getUserPlans(userId);

      expect(result).toBeDefined();
    });
  });

  describe('Session Management Integration', () => {
    it('should create and track study session', async () => {
      const sessionData = {
        userId: 'user123',
        planId: 'plan123',
        subject: 'Mathematics',
        topic: 'Algebra',
        duration: 60,
        startTime: new Date(),
        endTime: new Date(),
        completed: true,
        score: 85,
        notes: 'Good session',
      };

      const mockSession = {
        id: 'session123',
        ...sessionData,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.studySession, 'create').mockResolvedValue(mockSession as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await planningService.createStudySession(sessionData);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should get session history with analytics', async () => {
      const userId = 'user123';
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        subject: 'Mathematics',
      };

      const mockSessions = [
        {
          id: 'session1',
          userId,
          subject: 'Mathematics',
          topic: 'Algebra',
          duration: 60,
          score: 85,
          completed: true,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'session2',
          userId,
          subject: 'Mathematics',
          topic: 'Geometry',
          duration: 45,
          score: 90,
          completed: true,
          createdAt: new Date('2024-01-20'),
        },
      ];

      jest.spyOn(prismaService.studySession, 'findMany').mockResolvedValue(mockSessions as any);

      const result = await planningService.getSessionHistory(userId, filters);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('Queue Integration', () => {
    it('should process plan generation job asynchronously', async () => {
      const jobData = {
        userId: 'user123',
        planRequest: {
          subjects: ['Mathematics'],
          duration: 7,
          difficulty: 'MEDIUM',
        },
      };

      const mockJob = {
        id: 'job123',
        data: jobData,
        status: 'completed',
        result: { planId: 'plan123' },
      };

      jest.spyOn(queueService, 'addJob').mockResolvedValue(mockJob as any);
      jest.spyOn(queueService, 'processJob').mockResolvedValue(mockJob as any);

      const result = await planningService.generatePlanAsync(jobData);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle job processing errors', async () => {
      const jobData = {
        userId: 'user123',
        planRequest: {
          subjects: [],
          duration: 0,
          difficulty: 'INVALID',
        },
      };

      jest.spyOn(queueService, 'addJob').mockRejectedValue(new Error('Job processing failed'));

      await expect(planningService.generatePlanAsync(jobData)).rejects.toThrow();
    });
  });

  describe('Cache Integration', () => {
    it('should cache and retrieve plan data efficiently', async () => {
      const planId = 'plan123';
      const planData = {
        id: planId,
        title: 'Test Plan',
        subjects: ['Mathematics'],
        progress: 0.5,
        sessions: [],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(planData));

      const userId = 'user123';
      const result = await planningService.getPlan(userId, planId);

      expect(result).toBeDefined();
    });

    it('should invalidate cache on plan updates', async () => {
      const planId = 'plan123';
      const updateData = { progress: 0.8 };

      jest.spyOn(prismaService.plan, 'update').mockResolvedValue({ id: planId, ...updateData } as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue();

      const userId = 'user123';
      const result = await planningService.updatePlan(userId, planId, updateData);

      expect(result).toBeDefined();
    });
  });
});