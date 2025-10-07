import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanningService } from './planning.service.refactored';
import { PlanningFacade } from './planning-facade.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService } from './services/plan-optimization.service';
import { PlanPersistenceService } from './services/plan-persistence.service';
import { ScheduleAdjustmentService } from './schedule-adjustment.service';
import { AiAnalysisService } from './ai-analysis.service';
import { TopicManagementService } from './topic-management.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { AssessmentService } from './assessment.service';
import { CoachingService } from './coaching.service';
import { DigitalDossierService } from './digital-dossier.service';
import { AdaptiveInsightsService } from './adaptive-insights.service';
import { AdaptiveStrategyService } from './adaptive-strategy.service';
import { CacheService } from '../common/cache/cache.service';
import { QueueService } from '../services/queue.service';
import { CurriculumEngineService } from './curriculum-engine.service';
import { PerformanceAnalyzerService } from './performance-analyzer.service';
import { TopicPrioritizerService } from './topic-prioritizer.service';
import { AIService } from '../ai/ai.service';
import { LoggingService } from '../common/logging/logging.service';
import { ExceptionService } from '../common/exceptions/exception.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('PlanningService (Refactored)', () => {
  let service: PlanningService;
  let planningFacade: jest.Mocked<PlanningFacade>;
  let planGeneration: jest.Mocked<PlanGenerationService>;
  let planValidation: jest.Mocked<PlanValidationService>;
  let planOptimization: jest.Mocked<PlanOptimizationService>;
  let planPersistence: jest.Mocked<PlanPersistenceService>;
  let scheduleAdjustment: jest.Mocked<ScheduleAdjustmentService>;
  let aiAnalysis: jest.Mocked<AiAnalysisService>;
  let topicManagement: jest.Mocked<TopicManagementService>;
  let progressTracking: jest.Mocked<ProgressTrackingService>;
  let assessment: jest.Mocked<AssessmentService>;
  let coaching: jest.Mocked<CoachingService>;
  let dossier: jest.Mocked<DigitalDossierService>;
  let adaptiveInsights: jest.Mocked<AdaptiveInsightsService>;
  let adaptiveStrategy: jest.Mocked<AdaptiveStrategyService>;
  let cache: jest.Mocked<CacheService>;
  let queue: jest.Mocked<QueueService>;
  let curriculumEngine: jest.Mocked<CurriculumEngineService>;
  let performanceAnalyzer: jest.Mocked<PerformanceAnalyzerService>;
  let topicPrioritizer: jest.Mocked<TopicPrioritizerService>;
  let aiService: jest.Mocked<AIService>;
  let loggingService: jest.Mocked<LoggingService>;
  let exceptionService: jest.Mocked<ExceptionService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: PlanningFacade,
          useValue: {
            generatePlan: jest.fn(),
            createPlanFromOnboarding: jest.fn(),
            createPremiumPlan: jest.fn(),
            generateYksPlan: jest.fn(),
            generateHolidayPlan: jest.fn(),
            createLongTermPlan: jest.fn(),
            getLongTermPlan: jest.fn(),
          },
        },
        {
          provide: PlanGenerationService,
          useValue: {
            generatePlan: jest.fn(),
          },
        },
        {
          provide: PlanValidationService,
          useValue: {
            validatePlan: jest.fn(),
            validateSession: jest.fn(),
          },
        },
        {
          provide: PlanOptimizationService,
          useValue: {
            optimizePlan: jest.fn(),
          },
        },
        {
          provide: PlanPersistenceService,
          useValue: {
            getUserPlans: jest.fn(),
            getPlan: jest.fn(),
            updatePlan: jest.fn(),
            deletePlan: jest.fn(),
          },
        },
        {
          provide: ScheduleAdjustmentService,
          useValue: {
            rescheduleSession: jest.fn(),
            completeSession: jest.fn(),
            cancelSession: jest.fn(),
            checkHolidayStatus: jest.fn(),
            getDailySchedule: jest.fn(),
            skipSession: jest.fn(),
          },
        },
        {
          provide: AiAnalysisService,
          useValue: {
            analyzeUserPerformance: jest.fn(),
          },
        },
        {
          provide: TopicManagementService,
          useValue: {
            getMebTopics: jest.fn(),
            getYksSubjectRecommendations: jest.fn(),
            assignYksSubjects: jest.fn(),
          },
        },
        {
          provide: ProgressTrackingService,
          useValue: {
            trackProgress: jest.fn(),
            getProgressOverview: jest.fn(),
            updateTaskProgress: jest.fn(),
            getWeeklyOverview: jest.fn(),
            getProgressTracking: jest.fn(),
            getSessionHistory: jest.fn(),
          },
        },
        {
          provide: AssessmentService,
          useValue: {
            startAssessment: jest.fn(),
            getAssessmentStatus: jest.fn(),
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
            createDossier: jest.fn(),
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
            adaptStrategy: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            addJob: jest.fn(),
          },
        },
        {
          provide: CurriculumEngineService,
          useValue: {
            buildPrerequisiteAwareTopicOrder: jest.fn(),
          },
        },
        {
          provide: PerformanceAnalyzerService,
          useValue: {
            analyzeUserPerformance: jest.fn(),
          },
        },
        {
          provide: TopicPrioritizerService,
          useValue: {
            prioritizeTopics: jest.fn(),
          },
        },
        {
          provide: AIService,
          useValue: {
            generateContent: jest.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            logPlanningOperation: jest.fn(),
            logAIOperation: jest.fn(),
            logPerformance: jest.fn(),
            logSecurity: jest.fn(),
            getUserLogs: jest.fn(),
            getServiceLogs: jest.fn(),
            cleanOldLogs: jest.fn(),
          },
        },
        {
          provide: ExceptionService,
          useValue: {
            handlePlanningError: jest.fn(),
            handleAIError: jest.fn(),
            handleDatabaseError: jest.fn(),
            handleValidationError: jest.fn(),
            handleAuthError: jest.fn(),
            handleAuthorizationError: jest.fn(),
            handleRateLimitError: jest.fn(),
            handleCacheError: jest.fn(),
            handleQueueError: jest.fn(),
            handleExternalServiceError: jest.fn(),
            handleGenericError: jest.fn(),
            getErrorStatistics: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            plan: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            session: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            logEntry: {
              create: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    planningFacade = module.get(PlanningFacade);
    planGeneration = module.get(PlanGenerationService);
    planValidation = module.get(PlanValidationService);
    planOptimization = module.get(PlanOptimizationService);
    planPersistence = module.get(PlanPersistenceService);
    scheduleAdjustment = module.get(ScheduleAdjustmentService);
    aiAnalysis = module.get(AiAnalysisService);
    topicManagement = module.get(TopicManagementService);
    progressTracking = module.get(ProgressTrackingService);
    assessment = module.get(AssessmentService);
    coaching = module.get(CoachingService);
    dossier = module.get(DigitalDossierService);
    adaptiveInsights = module.get(AdaptiveInsightsService);
    adaptiveStrategy = module.get(AdaptiveStrategyService);
    cache = module.get(CacheService);
    queue = module.get(QueueService);
    curriculumEngine = module.get(CurriculumEngineService);
    performanceAnalyzer = module.get(PerformanceAnalyzerService);
    topicPrioritizer = module.get(TopicPrioritizerService);
    aiService = module.get(AIService);
    loggingService = module.get(LoggingService);
    exceptionService = module.get(ExceptionService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePlan', () => {
    it('should generate plan successfully', async () => {
      const mockData = {
        userId: 'user1',
        subjects: ['Math', 'Physics'],
        goals: ['Learn calculus'],
        availableTime: 120,
        learningStyle: 'visual',
        currentLevel: 'intermediate',
      };

      const mockResult = {
        plan: {
          id: 'plan1',
          title: 'Math Plan',
          description: 'Learn calculus',
          subjects: ['Math'],
          goals: ['Learn calculus'],
          totalSessions: 5,
          duration: 120,
          createdAt: new Date(),
        },
        sessions: [],
        validation: { isValid: true, errors: [] },
        optimization: { isOptimized: false, suggestions: [] },
      };

      planningFacade.generatePlan.mockResolvedValue(mockResult);

      const result = await service.generatePlan(mockData);

      expect(planningFacade.generatePlan).toHaveBeenCalledWith({
        userId: 'user1',
        subjects: ['Math', 'Physics'],
        goals: ['Learn calculus'],
        availableTime: 120,
        learningStyle: 'visual',
        currentLevel: 'intermediate',
        preferences: undefined,
        planDurationDays: undefined,
        planType: undefined,
        targetExam: undefined,
        optimize: undefined,
        optimizationOptions: undefined,
      });

      expect(result).toEqual(mockResult);
      expect(loggingService.log).toHaveBeenCalledWith('Plan generation started', { userId: 'user1' });
      expect(loggingService.log).toHaveBeenCalledWith('Plan generation completed', { userId: 'user1', planId: 'plan1' });
    });

    it('should handle plan generation error', async () => {
      const mockData = {
        userId: 'user1',
        subjects: ['Math'],
        goals: ['Learn calculus'],
        availableTime: 120,
      };

      const error = new Error('Plan generation failed');
      planningFacade.generatePlan.mockRejectedValue(error);
      exceptionService.handlePlanningError.mockReturnValue(new BadRequestException('Plan generation failed'));

      await expect(service.generatePlan(mockData)).rejects.toThrow(BadRequestException);

      expect(loggingService.error).toHaveBeenCalledWith('Plan generation failed', {
        userId: 'user1',
        error: 'Plan generation failed',
      });
      expect(exceptionService.handlePlanningError).toHaveBeenCalledWith(error, 'Plan generation failed');
    });
  });

  describe('getUserPlans', () => {
    it('should get user plans successfully', async () => {
      const mockPlans = [
        { id: 'plan1', title: 'Math Plan' },
        { id: 'plan2', title: 'Physics Plan' },
      ];

      planPersistence.getUserPlans.mockResolvedValue(mockPlans);

      const result = await service.getUserPlans('user1');

      expect(planPersistence.getUserPlans).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockPlans);
    });

    it('should handle getUserPlans error', async () => {
      const error = new Error('Database error');
      planPersistence.getUserPlans.mockRejectedValue(error);
      exceptionService.handlePlanningError.mockReturnValue(new InternalServerErrorException('Failed to get user plans'));

      await expect(service.getUserPlans('user1')).rejects.toThrow(InternalServerErrorException);

      expect(loggingService.error).toHaveBeenCalledWith('Failed to get user plans', {
        userId: 'user1',
        error: 'Database error',
      });
    });
  });

  describe('getPlan', () => {
    it('should get plan successfully', async () => {
      const mockPlan = {
        id: 'plan1',
        title: 'Math Plan',
        description: 'Learn calculus',
      };

      planPersistence.getPlan.mockResolvedValue(mockPlan);

      const result = await service.getPlan('user1', 'plan1');

      expect(planPersistence.getPlan).toHaveBeenCalledWith('user1', 'plan1');
      expect(result).toEqual(mockPlan);
    });

    it('should handle getPlan error', async () => {
      const error = new Error('Plan not found');
      planPersistence.getPlan.mockRejectedValue(error);
      exceptionService.handlePlanningError.mockReturnValue(new NotFoundException('Failed to get plan'));

      await expect(service.getPlan('user1', 'plan1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePlan', () => {
    it('should update plan successfully', async () => {
      const mockData = { title: 'Updated Plan' };
      const mockResult = { id: 'plan1', ...mockData };

      planPersistence.updatePlan.mockResolvedValue(mockResult);

      const result = await service.updatePlan('user1', 'plan1', mockData);

      expect(planPersistence.updatePlan).toHaveBeenCalledWith('user1', 'plan1', mockData);
      expect(result).toEqual(mockResult);
    });

    it('should handle updatePlan error', async () => {
      const error = new Error('Update failed');
      planPersistence.updatePlan.mockRejectedValue(error);
      exceptionService.handlePlanningError.mockReturnValue(new BadRequestException('Failed to update plan'));

      await expect(service.updatePlan('user1', 'plan1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePlan', () => {
    it('should delete plan successfully', async () => {
      planPersistence.deletePlan.mockResolvedValue(true);

      const result = await service.deletePlan('user1', 'plan1');

      expect(planPersistence.deletePlan).toHaveBeenCalledWith('user1', 'plan1');
      expect(result).toBe(true);
    });

    it('should handle deletePlan error', async () => {
      const error = new Error('Delete failed');
      planPersistence.deletePlan.mockRejectedValue(error);
      exceptionService.handlePlanningError.mockReturnValue(new BadRequestException('Failed to delete plan'));

      await expect(service.deletePlan('user1', 'plan1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('optimizePlan', () => {
    it('should optimize plan successfully', async () => {
      const mockResult = {
        optimized: true,
        improvements: ['Better time distribution'],
      };

      planOptimization.optimizePlan.mockResolvedValue(mockResult);

      const result = await service.optimizePlan('plan1', 'user1');

      expect(planOptimization.optimizePlan).toHaveBeenCalledWith('plan1', 'user1');
      expect(result).toEqual(mockResult);
    });

    it('should handle optimizePlan error', async () => {
      const error = new Error('Optimization failed');
      planOptimization.optimizePlan.mockRejectedValue(error);
      exceptionService.handlePlanningError.mockReturnValue(new BadRequestException('Failed to optimize plan'));

      await expect(service.optimizePlan('plan1', 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('trackProgress', () => {
    it('should track progress successfully', async () => {
      const mockPerformance = {
        score: 85,
        timeSpent: 60,
        notes: 'Good progress',
      };

      progressTracking.trackProgress.mockResolvedValue({ success: true });

      const result = await service.trackProgress('user1', 'session1', mockPerformance);

      expect(progressTracking.trackProgress).toHaveBeenCalledWith('user1', 'session1', mockPerformance);
      expect(result).toEqual({ success: true });
    });

    it('should handle trackProgress error', async () => {
      const error = new Error('Tracking failed');
      progressTracking.trackProgress.mockRejectedValue(error);
      exceptionService.handlePlanningError.mockReturnValue(new BadRequestException('Failed to track progress'));

      await expect(service.trackProgress('user1', 'session1', { score: 85, timeSpent: 60 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProgressOverview', () => {
    it('should get progress overview successfully', async () => {
      const mockOverview = {
        totalSessions: 10,
        completedSessions: 7,
        averageScore: 85,
        progressPercentage: 70,
      };

      progressTracking.getProgressOverview.mockResolvedValue(mockOverview);

      const result = await service.getProgressOverview('user1');

      expect(progressTracking.getProgressOverview).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockOverview);
    });
  });

  describe('startAssessment', () => {
    it('should start assessment successfully', async () => {
      const mockAssessmentData = {
        subjects: ['Math', 'Physics'],
        grade: 11,
        learningGoals: ['Learn calculus'],
      };

      assessment.startAssessment.mockResolvedValue({ assessmentId: 'assess1' });

      const result = await service.startAssessment('user1', mockAssessmentData);

      expect(assessment.startAssessment).toHaveBeenCalledWith('user1', mockAssessmentData);
      expect(result).toEqual({ assessmentId: 'assess1' });
    });
  });

  describe('getAssessmentStatus', () => {
    it('should get assessment status successfully', async () => {
      const mockStatus = {
        status: 'completed',
        score: 85,
        recommendations: ['Focus on algebra'],
      };

      assessment.getAssessmentStatus.mockResolvedValue(mockStatus);

      const result = await service.getAssessmentStatus('user1');

      expect(assessment.getAssessmentStatus).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getSmartCoaching', () => {
    it('should get smart coaching successfully', async () => {
      const mockCoaching = {
        recommendations: ['Study more math'],
        insights: ['You are good at physics'],
      };

      coaching.getSmartCoaching.mockResolvedValue(mockCoaching);

      const result = await service.getSmartCoaching('user1');

      expect(coaching.getSmartCoaching).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockCoaching);
    });
  });

  describe('rescheduleSession', () => {
    it('should reschedule session successfully', async () => {
      const mockData = {
        userId: 'user1',
        sessionId: 'session1',
        newStartTime: new Date('2024-01-01T10:00:00Z'),
        duration: 60,
      };

      scheduleAdjustment.rescheduleSession.mockResolvedValue({ success: true });

      const result = await service.rescheduleSession(mockData);

      expect(scheduleAdjustment.rescheduleSession).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('completeSession', () => {
    it('should complete session successfully', async () => {
      const mockData = {
        userId: 'user1',
        sessionId: 'session1',
        performance: 85,
      };

      scheduleAdjustment.completeSession.mockResolvedValue({ success: true });

      const result = await service.completeSession(mockData);

      expect(scheduleAdjustment.completeSession).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('cancelSession', () => {
    it('should cancel session successfully', async () => {
      const mockData = {
        userId: 'user1',
        sessionId: 'session1',
        reason: 'Emergency',
      };

      scheduleAdjustment.cancelSession.mockResolvedValue({ success: true });

      const result = await service.cancelSession(mockData);

      expect(scheduleAdjustment.cancelSession).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('getMebTopics', () => {
    it('should get MEB topics successfully', async () => {
      const mockTopics = ['Algebra', 'Geometry', 'Calculus'];

      topicManagement.getMebTopics.mockResolvedValue(mockTopics);

      const result = await service.getMebTopics('Math', '11');

      expect(topicManagement.getMebTopics).toHaveBeenCalledWith('Math', '11');
      expect(result).toEqual(mockTopics);
    });
  });

  describe('getYksSubjectRecommendations', () => {
    it('should get YKS recommendations successfully', async () => {
      const mockRecommendations = ['Math', 'Physics', 'Chemistry'];

      topicManagement.getYksSubjectRecommendations.mockResolvedValue(mockRecommendations);

      const result = await service.getYksSubjectRecommendations('Science');

      expect(topicManagement.getYksSubjectRecommendations).toHaveBeenCalledWith('Science');
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('updateTaskProgress', () => {
    it('should update task progress successfully', async () => {
      const mockData = {
        userId: 'user1',
        taskId: 'task1',
        minutes: 30,
      };

      progressTracking.updateTaskProgress.mockResolvedValue({ success: true });

      const result = await service.updateTaskProgress(mockData);

      expect(progressTracking.updateTaskProgress).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('createPlanFromOnboarding', () => {
    it('should create plan from onboarding successfully', async () => {
      const mockData = { subjects: ['Math'], goals: ['Learn calculus'] };

      planningFacade.createPlanFromOnboarding.mockResolvedValue({ planId: 'plan1' });

      const result = await service.createPlanFromOnboarding('user1', mockData);

      expect(planningFacade.createPlanFromOnboarding).toHaveBeenCalledWith('user1', mockData);
      expect(result).toEqual({ planId: 'plan1' });
    });
  });

  describe('createPremiumPlan', () => {
    it('should create premium plan successfully', async () => {
      const mockData = { planType: 'premium', features: ['AI coaching'] };

      planningFacade.createPremiumPlan.mockResolvedValue({ planId: 'plan1' });

      const result = await service.createPremiumPlan('user1', mockData);

      expect(planningFacade.createPremiumPlan).toHaveBeenCalledWith('user1', mockData);
      expect(result).toEqual({ planId: 'plan1' });
    });
  });

  describe('checkHolidayStatus', () => {
    it('should check holiday status successfully', async () => {
      scheduleAdjustment.checkHolidayStatus.mockResolvedValue({ isHoliday: false });

      const result = await service.checkHolidayStatus('user1');

      expect(scheduleAdjustment.checkHolidayStatus).toHaveBeenCalledWith('user1');
      expect(result).toEqual({ isHoliday: false });
    });
  });

  describe('assignYksSubjects', () => {
    it('should assign YKS subjects successfully', async () => {
      const mockData = { subjects: ['Math', 'Physics'] };

      topicManagement.assignYksSubjects.mockResolvedValue({ success: true });

      const result = await service.assignYksSubjects('user1', mockData);

      expect(topicManagement.assignYksSubjects).toHaveBeenCalledWith('user1', mockData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('generateYksPlan', () => {
    it('should generate YKS plan successfully', async () => {
      const mockData = { subjects: ['Math', 'Physics'], examType: 'AYT' };

      planningFacade.generateYksPlan.mockResolvedValue({ planId: 'plan1' });

      const result = await service.generateYksPlan('user1', mockData);

      expect(planningFacade.generateYksPlan).toHaveBeenCalledWith('user1', mockData);
      expect(result).toEqual({ planId: 'plan1' });
    });
  });

  describe('generateHolidayPlan', () => {
    it('should generate holiday plan successfully', async () => {
      const mockData = { duration: 7, subjects: ['Math'] };

      planningFacade.generateHolidayPlan.mockResolvedValue({ planId: 'plan1' });

      const result = await service.generateHolidayPlan(mockData);

      expect(planningFacade.generateHolidayPlan).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ planId: 'plan1' });
    });
  });

  describe('createLongTermPlan', () => {
    it('should create long term plan successfully', async () => {
      const mockData = { duration: 365, goals: ['Graduate'] };

      planningFacade.createLongTermPlan.mockResolvedValue({ planId: 'plan1' });

      const result = await service.createLongTermPlan('user1', mockData);

      expect(planningFacade.createLongTermPlan).toHaveBeenCalledWith('user1', mockData);
      expect(result).toEqual({ planId: 'plan1' });
    });
  });

  describe('getLongTermPlan', () => {
    it('should get long term plan successfully', async () => {
      const mockPlan = { id: 'plan1', type: 'long-term' };

      planningFacade.getLongTermPlan.mockResolvedValue(mockPlan);

      const result = await service.getLongTermPlan('user1');

      expect(planningFacade.getLongTermPlan).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockPlan);
    });
  });

  describe('getWeeklyOverview', () => {
    it('should get weekly overview successfully', async () => {
      const mockOverview = {
        week: '2024-01-01',
        totalSessions: 7,
        completedSessions: 5,
        averageScore: 85,
      };

      progressTracking.getWeeklyOverview.mockResolvedValue(mockOverview);

      const result = await service.getWeeklyOverview('user1');

      expect(progressTracking.getWeeklyOverview).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockOverview);
    });
  });

  describe('getDailySchedule', () => {
    it('should get daily schedule successfully', async () => {
      const mockSchedule = {
        date: '2024-01-01',
        sessions: [
          { id: 'session1', subject: 'Math', time: '10:00' },
        ],
      };

      scheduleAdjustment.getDailySchedule.mockResolvedValue(mockSchedule);

      const result = await service.getDailySchedule('user1', '2024-01-01');

      expect(scheduleAdjustment.getDailySchedule).toHaveBeenCalledWith('user1', '2024-01-01');
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('skipSession', () => {
    it('should skip session successfully', async () => {
      const mockData = {
        userId: 'user1',
        sessionId: 'session1',
        reason: 'Sick',
      };

      scheduleAdjustment.skipSession.mockResolvedValue({ success: true });

      const result = await service.skipSession(mockData);

      expect(scheduleAdjustment.skipSession).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('getProgressTracking', () => {
    it('should get progress tracking successfully', async () => {
      const mockTracking = {
        planId: 'plan1',
        progress: 70,
        sessions: [],
      };

      progressTracking.getProgressTracking.mockResolvedValue(mockTracking);

      const result = await service.getProgressTracking('user1', 'plan1');

      expect(progressTracking.getProgressTracking).toHaveBeenCalledWith('user1', 'plan1');
      expect(result).toEqual(mockTracking);
    });
  });

  describe('getSessionHistory', () => {
    it('should get session history successfully', async () => {
      const mockHistory = [
        { id: 'session1', subject: 'Math', completed: true },
        { id: 'session2', subject: 'Physics', completed: false },
      ];

      progressTracking.getSessionHistory.mockResolvedValue(mockHistory);

      const result = await service.getSessionHistory('user1', {});

      expect(progressTracking.getSessionHistory).toHaveBeenCalledWith('user1', {});
      expect(result).toEqual(mockHistory);
    });
  });

  describe('generatePlanAsync', () => {
    it('should generate plan async successfully', async () => {
      const mockJobData = { userId: 'user1', subjects: ['Math'] };

      queue.addJob.mockResolvedValue({ jobId: 'job1' });

      const result = await service.generatePlanAsync(mockJobData);

      expect(queue.addJob).toHaveBeenCalledWith('plan-generation', mockJobData);
      expect(result).toEqual({ jobId: 'job1' });
    });
  });
});
