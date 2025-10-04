import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { PlanGenerationService } from './plan-generation.service';
import { PlanValidationService } from './plan-validation.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { TopicManagementService } from './topic-management.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { AssessmentService } from './assessment.service';
import { CoachingService } from './coaching.service';
import { DigitalDossierService } from './digital-dossier.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AiAnalysisService } from './ai-analysis.service';

describe('PlanningService Integration Tests', () => {
  let service: PlanningService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'STUDENT',
    studentProfile: {
      id: 'profile-1',
      userId: 'user-1',
      grade: 12,
      field: 'SAY',
      goals: ['YKS Hazırlık'],
      learningStyle: 'visual',
      strengths: ['Matematik'],
      weaknesses: ['Fizik'],
      interests: ['Bilim'],
    },
  };

  const mockPlanData = {
    subjects: ['Matematik', 'Fizik'],
    goals: ['YKS Hazırlık'],
    availableTime: 120,
    learningStyle: 'visual',
    currentLevel: 'intermediate',
    userId: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            plan: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            studySession: {
              findMany: jest.fn(),
              create: jest.fn(),
              createMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            examResult: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delPattern: jest.fn(),
            getUserKey: jest.fn(),
            getUserProfileKey: jest.fn(),
            getPlanKey: jest.fn(),
            getUserPlansKey: jest.fn(),
            getStudySessionsKey: jest.fn(),
            getProgressKey: jest.fn(),
            invalidateUserCache: jest.fn(),
            invalidatePlanCache: jest.fn(),
            invalidateProgressCache: jest.fn(),
          },
        },
        {
          provide: PlanGenerationService,
          useValue: {
            generatePlan: jest.fn(),
            generateContentWithRetry: jest.fn(),
          },
        },
        {
          provide: PlanValidationService,
          useValue: {
            validatePlan: jest.fn(),
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
          provide: TopicManagementService,
          useValue: {
            getMebTopics: jest.fn(),
            getYksSubjectRecommendations: jest.fn(),
            buildCurriculumTopicPool: jest.fn(),
            generateSyntheticTopics: jest.fn(),
          },
        },
        {
          provide: ProgressTrackingService,
          useValue: {
            getProgressOverview: jest.fn(),
            trackProgress: jest.fn(),
          },
        },
        {
          provide: AssessmentService,
          useValue: {
            startAssessment: jest.fn(),
            getAssessmentStatus: jest.fn(),
            submitAssessment: jest.fn(),
            getMebTopics: jest.fn(),
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
            generateDossier: jest.fn(),
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
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('Plan Generation Flow', () => {
    it('should generate a complete plan with all components', async () => {
      // Mock user data
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.examResult, 'findMany').mockResolvedValue([]);

      // Mock plan generation
      const mockPlan = {
        id: 'plan-1',
        title: 'Test Plan',
        description: 'Test Description',
        type: 'STUDY',
        subjects: ['Matematik', 'Fizik'],
        goals: ['YKS Hazırlık'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      const mockSessions = [
        {
          id: 'session-1',
          subject: 'Matematik',
          topic: 'Denklemler',
          startTime: new Date(),
          duration: 60,
          difficulty: 'medium',
          type: 'study',
        },
      ];

      jest.spyOn(service['planGeneration'], 'generatePlan').mockResolvedValue({
        plan: mockPlan,
        sessions: mockSessions,
      });

      jest.spyOn(service['planValidation'], 'validatePlan').mockReturnValue({
        isValid: true,
        errors: [],
      });

      jest.spyOn(service['planPersistence'], 'createPlan').mockResolvedValue(mockPlan);
      jest.spyOn(service['planPersistence'], 'createStudySessions').mockResolvedValue(mockSessions);

      // Execute
      const result = await service.generatePlan(mockPlanData);

      // Assertions
      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.sessions).toBeDefined();
      expect(service['planGeneration'].generatePlan).toHaveBeenCalled();
      expect(service['planValidation'].validatePlan).toHaveBeenCalled();
      expect(service['planPersistence'].createPlan).toHaveBeenCalled();
      expect(service['planPersistence'].createStudySessions).toHaveBeenCalled();
    });

    it('should handle plan generation errors gracefully', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(service['planGeneration'], 'generatePlan').mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(service.generatePlan(mockPlanData)).rejects.toThrow(
        'Plan generation failed: AI service unavailable'
      );
    });
  });

  describe('User Context Analysis', () => {
    it('should analyze user context with study sessions', async () => {
      const mockStudySessions = [
        {
          id: 'session-1',
          subject: 'Matematik',
          topic: 'Denklemler',
          startTime: new Date(),
          duration: 60,
          isCompleted: true,
          performance: 85,
        },
        {
          id: 'session-2',
          subject: 'Fizik',
          topic: 'Mekanik',
          startTime: new Date(),
          duration: 45,
          isCompleted: true,
          performance: 65,
        },
      ];

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        studySessions: mockStudySessions,
      } as any);

      jest.spyOn(prismaService.examResult, 'findMany').mockResolvedValue([
        {
          id: 'exam-1',
          subject: 'Matematik',
          score: 85,
          createdAt: new Date(),
        },
        {
          id: 'exam-2',
          subject: 'Fizik',
          score: 65,
          createdAt: new Date(),
        },
      ] as any);

      const result = await service['analyzeUserContext']('user-1');

      expect(result).toBeDefined();
      expect(result.weakAreas).toContain('Fizik');
      expect(result.strongAreas).toContain('Matematik');
      expect(result.subjectPerformance).toBeDefined();
      expect(result.preferredStudyHours).toBeDefined();
    });

    it('should handle missing student profile', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        studentProfile: null,
      } as any);

      const result = await service['analyzeUserContext']('user-1');

      expect(result).toEqual({
        weakAreas: [],
        strongAreas: [],
        topicSuccessRates: {},
        subjectPerformance: {},
        preferredStudyHours: [],
        subjectTimeAllocation: {},
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress and update metrics', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        subject: 'Matematik',
        topic: 'Denklemler',
        startTime: new Date(),
        duration: 60,
        isCompleted: false,
        performance: null,
      };

      jest.spyOn(prismaService.studySession, 'findFirst').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.studySession, 'update').mockResolvedValue({
        ...mockSession,
        isCompleted: true,
        performance: 85,
        endTime: new Date(),
      } as any);

      jest.spyOn(service['progressTracking'], 'trackProgress').mockResolvedValue({
        ...mockSession,
        isCompleted: true,
        performance: 85,
      } as any);

      const result = await service.trackProgress('user-1', 'session-1', {
        score: 85,
        timeSpent: 60,
        notes: 'Great progress!',
      });

      expect(result).toBeDefined();
      expect(service['progressTracking'].trackProgress).toHaveBeenCalledWith(
        'user-1',
        'session-1',
        {
          score: 85,
          timeSpent: 60,
          notes: 'Great progress!',
        }
      );
    });
  });

  describe('Assessment Flow', () => {
    it('should start assessment and return status', async () => {
      const mockAssessment = {
        id: 'assessment-1',
        userId: 'user-1',
        subjects: ['Matematik', 'Fizik'],
        grade: 12,
        learningGoals: ['YKS Hazırlık'],
        status: 'PENDING',
        metadata: { questions: [] },
      };

      jest.spyOn(service['assessment'], 'startAssessment').mockResolvedValue({
        message: 'Assessment started',
        assessmentId: 'assessment-1',
        status: 'PENDING',
      });

      const result = await service.startAssessment('user-1', {
        subjects: ['Matematik', 'Fizik'],
        grade: 12,
        learningGoals: ['YKS Hazırlık'],
      });

      expect(result).toBeDefined();
      expect(service['assessment'].startAssessment).toHaveBeenCalledWith('user-1', {
        subjects: ['Matematik', 'Fizik'],
        grade: 12,
        learningGoals: ['YKS Hazırlık'],
      });
    });

    it('should get assessment status', async () => {
      const mockStatus = {
        assessmentId: 'assessment-1',
        status: 'IN_PROGRESS',
        subjects: ['Matematik', 'Fizik'],
        grade: 12,
        learningGoals: ['YKS Hazırlık'],
        results: null,
        metadata: { questions: [] },
      };

      jest.spyOn(service['assessment'], 'getAssessmentStatus').mockResolvedValue(mockStatus);

      const result = await service.getAssessmentStatus('user-1');

      expect(result).toEqual(mockStatus);
      expect(service['assessment'].getAssessmentStatus).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Coaching and Recommendations', () => {
    it('should provide smart coaching', async () => {
      const mockCoaching = {
        motivation: ['Great job!', 'Keep it up!'],
        advice: ['Focus on weak areas', 'Practice regularly'],
        goals: ['Improve Fizik scores'],
        strategies: ['Use visual learning', 'Practice problems'],
        progressOverview: {
          overallCompletionRate: 75,
          averagePerformance: 80,
          weakAreas: ['Fizik'],
          strongAreas: ['Matematik'],
        },
      };

      jest.spyOn(service['coaching'], 'getSmartCoaching').mockResolvedValue(mockCoaching);

      const result = await service.getSmartCoaching('user-1');

      expect(result).toEqual(mockCoaching);
      expect(service['coaching'].getSmartCoaching).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Plan Management', () => {
    it('should get user plans', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          title: 'Test Plan 1',
          description: 'Test Description 1',
          type: 'STUDY',
          subjects: ['Matematik'],
          goals: ['YKS Hazırlık'],
          startDate: new Date(),
          endDate: new Date(),
          isActive: true,
          sessions: [],
        },
      ];

      jest.spyOn(service['planPersistence'], 'getUserPlans').mockResolvedValue(mockPlans);

      const result = await service.getUserPlans('user-1');

      expect(result).toEqual(mockPlans);
      expect(service['planPersistence'].getUserPlans).toHaveBeenCalledWith('user-1');
    });

    it('should get specific plan', async () => {
      const mockPlan = {
        id: 'plan-1',
        title: 'Test Plan',
        description: 'Test Description',
        type: 'STUDY',
        subjects: ['Matematik'],
        goals: ['YKS Hazırlık'],
        startDate: new Date(),
        endDate: new Date(),
        isActive: true,
        sessions: [],
        user: mockUser,
      };

      jest.spyOn(service['planPersistence'], 'getPlan').mockResolvedValue(mockPlan);

      const result = await service.getPlan('user-1', 'plan-1');

      expect(result).toEqual(mockPlan);
      expect(service['planPersistence'].getPlan).toHaveBeenCalledWith('user-1', 'plan-1');
    });

    it('should update plan', async () => {
      const updateData = {
        title: 'Updated Plan',
        description: 'Updated Description',
      };

      const mockUpdatedPlan = {
        id: 'plan-1',
        title: 'Updated Plan',
        description: 'Updated Description',
        type: 'STUDY',
        subjects: ['Matematik'],
        goals: ['YKS Hazırlık'],
        startDate: new Date(),
        endDate: new Date(),
        isActive: true,
      };

      jest.spyOn(service['planPersistence'], 'updatePlan').mockResolvedValue(mockUpdatedPlan);

      const result = await service.updatePlan('user-1', 'plan-1', updateData);

      expect(result).toEqual(mockUpdatedPlan);
      expect(service['planPersistence'].updatePlan).toHaveBeenCalledWith('plan-1', updateData);
    });

    it('should delete plan', async () => {
      jest.spyOn(service['planPersistence'], 'deletePlan').mockResolvedValue({
        success: true,
        message: 'Plan başarıyla silindi',
      });

      const result = await service.deletePlan('user-1', 'plan-1');

      expect(result.success).toBe(true);
      expect(service['planPersistence'].deletePlan).toHaveBeenCalledWith('plan-1');
    });
  });

  describe('Topic Management', () => {
    it('should get MEB topics', async () => {
      const mockTopics = [
        { id: 'topic-1', subject: 'Matematik', topic: 'Denklemler', grade: 12 },
        { id: 'topic-2', subject: 'Fizik', topic: 'Mekanik', grade: 12 },
      ];

      jest.spyOn(service['assessment'], 'getMebTopics').mockResolvedValue(mockTopics);

      const result = await service.getMebTopics('Matematik', '12');

      expect(result).toEqual(mockTopics);
      expect(service['assessment'].getMebTopics).toHaveBeenCalledWith('Matematik', '12');
    });

    it('should get YKS subject recommendations', async () => {
      const mockRecommendations = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];

      jest.spyOn(service['topicManagement'], 'getYksSubjectRecommendations').mockResolvedValue(
        mockRecommendations
      );

      const result = await service.getYksSubjectRecommendations('SAY');

      expect(result).toEqual(mockRecommendations);
      expect(service['topicManagement'].getYksSubjectRecommendations).toHaveBeenCalledWith('SAY');
    });
  });

  describe('Cache Integration', () => {
    it('should use cache for progress overview', async () => {
      const mockProgress = {
        overallCompletionRate: 75,
        averagePerformance: 80,
        weakAreas: ['Fizik'],
        strongAreas: ['Matematik'],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(service['progressTracking'], 'getProgressOverview').mockResolvedValue(mockProgress);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await service.getProgressOverview('user-1');

      expect(result).toEqual(mockProgress);
      expect(cacheService.get).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should return cached data when available', async () => {
      const mockCachedProgress = {
        overallCompletionRate: 80,
        averagePerformance: 85,
        weakAreas: [],
        strongAreas: ['Matematik', 'Fizik'],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockCachedProgress);

      const result = await service.getProgressOverview('user-1');

      expect(result).toEqual(mockCachedProgress);
      expect(service['progressTracking'].getProgressOverview).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.generatePlan(mockPlanData)).rejects.toThrow(
        'Plan generation failed: Database connection failed'
      );
    });

    it('should handle validation errors', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(service['planGeneration'], 'generatePlan').mockResolvedValue({
        plan: { title: 'Test Plan' },
        sessions: [],
      });
      jest.spyOn(service['planValidation'], 'validatePlan').mockReturnValue({
        isValid: false,
        errors: ['Invalid plan structure', 'Missing required fields'],
      });

      await expect(service.generatePlan(mockPlanData)).rejects.toThrow(
        'Plan validation failed: Invalid plan structure, Missing required fields'
      );
    });
  });
});
