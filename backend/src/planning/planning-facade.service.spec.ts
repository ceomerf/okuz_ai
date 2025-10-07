import { Test, TestingModule } from '@nestjs/testing';
import { PlanningFacade } from './planning-facade.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService } from './services/plan-optimization.service';
import { PlanPersistenceService } from './services/plan-persistence.service';
import { PlanAnalysisService } from './plan-analysis.service';
import { CacheService } from '../common/cache/cache.service';
import { LoggingService } from '../common/logging/logging.service';

describe('PlanningFacade', () => {
  let service: PlanningFacade;
  let planGeneration: PlanGenerationService;
  let planValidation: PlanValidationService;
  let planOptimization: PlanOptimizationService;
  let planPersistence: PlanPersistenceService;
  let planAnalysis: PlanAnalysisService;
  let cache: CacheService;
  let logging: LoggingService;

  const mockPlanGeneration = {
    generatePlan: jest.fn(),
    generateContent: jest.fn(),
    generateContentWithRetry: jest.fn(),
  };

  const mockPlanValidation = {
    validatePlan: jest.fn(),
    validatePlanUpdate: jest.fn(),
    validatePlanData: jest.fn(),
  };

  const mockPlanOptimization = {
    optimizePlan: jest.fn(),
    optimizeSchedule: jest.fn(),
    optimizeDifficulty: jest.fn(),
  };

  const mockPlanPersistence = {
    createPlan: jest.fn(),
    getUserPlans: jest.fn(),
    getPlan: jest.fn(),
    updatePlan: jest.fn(),
    deletePlan: jest.fn(),
    verifyPlanOwnership: jest.fn(),
  };

  const mockPlanAnalysis = {
    calculatePlanProgress: jest.fn(),
    getNextSession: jest.fn(),
    getPlanAnalytics: jest.fn(),
    getPlanRecommendations: jest.fn(),
    analyzeUserContext: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockLogging = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningFacade,
        {
          provide: PlanGenerationService,
          useValue: mockPlanGeneration,
        },
        {
          provide: PlanValidationService,
          useValue: mockPlanValidation,
        },
        {
          provide: PlanOptimizationService,
          useValue: mockPlanOptimization,
        },
        {
          provide: PlanPersistenceService,
          useValue: mockPlanPersistence,
        },
        {
          provide: PlanAnalysisService,
          useValue: mockPlanAnalysis,
        },
        {
          provide: CacheService,
          useValue: mockCache,
        },
        {
          provide: LoggingService,
          useValue: mockLogging,
        },
      ],
    }).compile();

    service = module.get<PlanningFacade>(PlanningFacade);
    planGeneration = module.get<PlanGenerationService>(PlanGenerationService);
    planValidation = module.get<PlanValidationService>(PlanValidationService);
    planOptimization = module.get<PlanOptimizationService>(PlanOptimizationService);
    planPersistence = module.get<PlanPersistenceService>(PlanPersistenceService);
    planAnalysis = module.get<PlanAnalysisService>(PlanAnalysisService);
    cache = module.get<CacheService>(CacheService);
    logging = module.get<LoggingService>(LoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePlan', () => {
    it('should generate plan successfully', async () => {
      const request = {
        userId: 'user-123',
        subjects: ['Mathematics', 'Physics'],
        goals: ['Learn calculus', 'Understand mechanics'],
        availableTime: 120,
        learningStyle: 'visual',
        currentLevel: 'intermediate',
        preferences: {
          studyTimes: ['morning', 'evening'],
          difficulty: 'medium',
        },
        planDurationDays: 7,
        planType: 'DAILY',
        targetExam: 'YKS',
        optimize: true,
        optimizationOptions: {
          focusOnWeakAreas: true,
          balanceSubjects: true,
          optimizeTiming: true,
          adjustDifficulty: true,
          maximizeEfficiency: true,
        },
      };

      const mockGeneratedPlan = {
        id: 'plan-123',
        title: 'Mathematics & Physics Study Plan',
        description: 'Comprehensive study plan for calculus and mechanics',
        subjects: request.subjects,
        goals: request.goals,
        totalSessions: 14,
        duration: 7,
        sessions: [
          {
            id: 'session-1',
            subject: 'Mathematics',
            topic: 'Derivatives',
            duration: 60,
            difficulty: 'medium',
            type: 'study',
            startTime: new Date('2024-01-01T09:00:00Z'),
            objectives: ['Understand derivative concept', 'Practice basic problems'],
            resources: ['Textbook Chapter 3', 'Video Series A'],
            techniques: ['Feynman Technique', 'Spaced Repetition'],
          },
        ],
      };

      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: ['Consider adding more practice problems'],
      };

      const mockOptimization = {
        optimized: true,
        improvements: ['Better time distribution', 'Improved difficulty progression'],
        performanceGain: 0.15,
        originalScore: 0.75,
        optimizedScore: 0.90,
      };

      mockPlanGeneration.generatePlan.mockResolvedValue(mockGeneratedPlan);
      mockPlanValidation.validatePlan.mockResolvedValue(mockValidation);
      mockPlanOptimization.optimizePlan.mockResolvedValue(mockOptimization);
      mockPlanPersistence.createPlan.mockResolvedValue(mockGeneratedPlan);

      const result = await service.generatePlan(request);

      expect(result).toEqual({
        plan: mockGeneratedPlan,
        validation: mockValidation,
        optimization: mockOptimization,
      });
      expect(mockPlanGeneration.generatePlan).toHaveBeenCalledWith(request);
      expect(mockPlanValidation.validatePlan).toHaveBeenCalledWith(mockGeneratedPlan);
      expect(mockPlanOptimization.optimizePlan).toHaveBeenCalledWith(mockGeneratedPlan, request.optimizationOptions);
      expect(mockPlanPersistence.createPlan).toHaveBeenCalledWith(request.userId, mockGeneratedPlan);
    });

    it('should handle validation errors', async () => {
      const request = {
        userId: 'user-123',
        subjects: [],
        goals: [],
        availableTime: 0,
      };

      const mockGeneratedPlan = {
        id: 'plan-123',
        title: 'Invalid Plan',
        subjects: [],
        goals: [],
        totalSessions: 0,
        duration: 0,
        sessions: [],
      };

      const mockValidation = {
        isValid: false,
        errors: ['No subjects specified', 'No goals specified', 'No available time'],
        warnings: [],
        suggestions: [],
      };

      mockPlanGeneration.generatePlan.mockResolvedValue(mockGeneratedPlan);
      mockPlanValidation.validatePlan.mockResolvedValue(mockValidation);

      const result = await service.generatePlan(request);

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toHaveLength(3);
      expect(mockPlanPersistence.createPlan).not.toHaveBeenCalled();
    });

    it('should handle generation errors', async () => {
      const request = {
        userId: 'user-123',
        subjects: ['Mathematics'],
        goals: ['Learn calculus'],
        availableTime: 120,
      };

      const error = new Error('AI service unavailable');
      mockPlanGeneration.generatePlan.mockRejectedValue(error);

      await expect(service.generatePlan(request)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('getUserPlans', () => {
    it('should get user plans with options', async () => {
      const userId = 'user-123';
      const options = {
        includeInactive: false,
        limit: 10,
        offset: 0,
      };

      const mockPlans = [
        {
          id: 'plan-1',
          title: 'Math Study Plan',
          isActive: true,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'plan-2',
          title: 'Physics Study Plan',
          isActive: true,
          createdAt: new Date('2024-01-02T00:00:00Z'),
        },
      ];

      mockPlanPersistence.getUserPlans.mockResolvedValue(mockPlans);

      const result = await service.getUserPlans(userId, options);

      expect(result).toEqual(mockPlans);
      expect(mockPlanPersistence.getUserPlans).toHaveBeenCalledWith(userId, options);
    });

    it('should get user plans without options', async () => {
      const userId = 'user-123';

      const mockPlans = [
        {
          id: 'plan-1',
          title: 'Math Study Plan',
          isActive: true,
        },
      ];

      mockPlanPersistence.getUserPlans.mockResolvedValue(mockPlans);

      const result = await service.getUserPlans(userId);

      expect(result).toEqual(mockPlans);
      expect(mockPlanPersistence.getUserPlans).toHaveBeenCalledWith(userId, {});
    });
  });

  describe('getPlan', () => {
    it('should get specific plan', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        description: 'Comprehensive math study plan',
        subjects: ['Mathematics'],
        goals: ['Learn calculus'],
        totalSessions: 10,
        duration: 7,
        sessions: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);

      const result = await service.getPlan(userId, planId);

      expect(result).toEqual(mockPlan);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
    });

    it('should handle plan not found', async () => {
      const userId = 'user-123';
      const planId = 'nonexistent-plan';

      mockPlanPersistence.getPlan.mockResolvedValue(null);

      const result = await service.getPlan(userId, planId);

      expect(result).toBeNull();
    });
  });

  describe('updatePlan', () => {
    it('should update plan successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';
      const updateData = {
        title: 'Updated Math Study Plan',
        description: 'Updated description',
        subjects: ['Mathematics', 'Statistics'],
        goals: ['Learn calculus', 'Learn statistics'],
        isActive: true,
      };

      const mockUpdatedPlan = {
        id: planId,
        ...updateData,
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };

      mockPlanValidation.validatePlanUpdate.mockResolvedValue(mockValidation);
      mockPlanPersistence.verifyPlanOwnership.mockResolvedValue(true);
      mockPlanPersistence.updatePlan.mockResolvedValue(mockUpdatedPlan);

      const result = await service.updatePlan(userId, planId, updateData);

      expect(result).toEqual(mockUpdatedPlan);
      expect(mockPlanValidation.validatePlanUpdate).toHaveBeenCalledWith(updateData);
      expect(mockPlanPersistence.verifyPlanOwnership).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanPersistence.updatePlan).toHaveBeenCalledWith(planId, updateData);
    });

    it('should handle validation errors on update', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';
      const updateData = {
        title: '', // Invalid empty title
        subjects: [], // Invalid empty subjects
      };

      const mockValidation = {
        isValid: false,
        errors: ['Title cannot be empty', 'At least one subject is required'],
        warnings: [],
        suggestions: [],
      };

      mockPlanValidation.validatePlanUpdate.mockResolvedValue(mockValidation);

      await expect(service.updatePlan(userId, planId, updateData)).rejects.toThrow('Validation failed');
    });

    it('should handle ownership verification failure', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';
      const updateData = {
        title: 'Updated Plan',
      };

      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };

      mockPlanValidation.validatePlanUpdate.mockResolvedValue(mockValidation);
      mockPlanPersistence.verifyPlanOwnership.mockResolvedValue(false);

      await expect(service.updatePlan(userId, planId, updateData)).rejects.toThrow('Plan not found or access denied');
    });
  });

  describe('deletePlan', () => {
    it('should delete plan successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      mockPlanPersistence.verifyPlanOwnership.mockResolvedValue(true);
      mockPlanPersistence.deletePlan.mockResolvedValue(true);

      const result = await service.deletePlan(userId, planId);

      expect(result).toEqual({
        success: true,
        message: 'Plan deleted successfully',
      });
      expect(mockPlanPersistence.verifyPlanOwnership).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanPersistence.deletePlan).toHaveBeenCalledWith(planId);
    });

    it('should handle ownership verification failure on delete', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      mockPlanPersistence.verifyPlanOwnership.mockResolvedValue(false);

      await expect(service.deletePlan(userId, planId)).rejects.toThrow('Plan not found or access denied');
    });
  });

  describe('optimizePlan', () => {
    it('should optimize plan successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';
      const options = {
        focusOnWeakAreas: true,
        balanceSubjects: true,
        optimizeTiming: true,
        adjustDifficulty: true,
        maximizeEfficiency: true,
      };

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        sessions: [],
      };

      const mockOptimizedPlan = {
        ...mockPlan,
        optimized: true,
        improvements: ['Better time distribution', 'Improved difficulty progression'],
        performanceGain: 0.15,
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);
      mockPlanOptimization.optimizePlan.mockResolvedValue(mockOptimizedPlan);
      mockPlanPersistence.updatePlan.mockResolvedValue(mockOptimizedPlan);

      const result = await service.optimizePlan(userId, planId, options);

      expect(result).toEqual(mockOptimizedPlan);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanOptimization.optimizePlan).toHaveBeenCalledWith(mockPlan, options);
      expect(mockPlanPersistence.updatePlan).toHaveBeenCalledWith(planId, mockOptimizedPlan);
    });

    it('should handle plan not found for optimization', async () => {
      const userId = 'user-123';
      const planId = 'nonexistent-plan';
      const options = {};

      mockPlanPersistence.getPlan.mockResolvedValue(null);

      await expect(service.optimizePlan(userId, planId, options)).rejects.toThrow('Plan not found');
    });
  });

  describe('validatePlan', () => {
    it('should validate plan successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        sessions: [],
      };

      const mockValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: ['Consider adding more practice sessions'],
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);
      mockPlanValidation.validatePlan.mockResolvedValue(mockValidation);

      const result = await service.validatePlan(userId, planId);

      expect(result).toEqual(mockValidation);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanValidation.validatePlan).toHaveBeenCalledWith(mockPlan);
    });

    it('should handle plan not found for validation', async () => {
      const userId = 'user-123';
      const planId = 'nonexistent-plan';

      mockPlanPersistence.getPlan.mockResolvedValue(null);

      await expect(service.validatePlan(userId, planId)).rejects.toThrow('Plan not found');
    });
  });

  describe('getPlanStatistics', () => {
    it('should get plan statistics successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        sessions: [
          { id: 'session-1', isCompleted: true, duration: 60 },
          { id: 'session-2', isCompleted: false, duration: 60 },
        ],
      };

      const mockStatistics = {
        totalSessions: 2,
        completedSessions: 1,
        completionRate: 0.5,
        totalStudyTime: 120,
        completedStudyTime: 60,
        averageSessionDuration: 60,
        progress: 0.5,
        nextSession: mockPlan.sessions[1],
        recommendations: ['Focus on completing pending sessions'],
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);
      mockPlanAnalysis.calculatePlanProgress.mockReturnValue(0.5);
      mockPlanAnalysis.getNextSession.mockReturnValue(mockPlan.sessions[1]);
      mockPlanAnalysis.getPlanAnalytics.mockResolvedValue(mockStatistics);

      const result = await service.getPlanStatistics(userId, planId);

      expect(result).toEqual(mockStatistics);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanAnalysis.calculatePlanProgress).toHaveBeenCalledWith(mockPlan.sessions);
      expect(mockPlanAnalysis.getNextSession).toHaveBeenCalledWith(mockPlan.sessions);
      expect(mockPlanAnalysis.getPlanAnalytics).toHaveBeenCalledWith(planId);
    });
  });

  describe('duplicatePlan', () => {
    it('should duplicate plan successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';
      const newTitle = 'Duplicated Math Study Plan';

      const mockOriginalPlan = {
        id: planId,
        title: 'Math Study Plan',
        description: 'Original plan description',
        subjects: ['Mathematics'],
        goals: ['Learn calculus'],
        sessions: [],
      };

      const mockDuplicatedPlan = {
        id: 'plan-124',
        title: newTitle,
        description: mockOriginalPlan.description,
        subjects: mockOriginalPlan.subjects,
        goals: mockOriginalPlan.goals,
        sessions: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockOriginalPlan);
      mockPlanPersistence.createPlan.mockResolvedValue(mockDuplicatedPlan);

      const result = await service.duplicatePlan(userId, planId, newTitle);

      expect(result).toEqual(mockDuplicatedPlan);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanPersistence.createPlan).toHaveBeenCalledWith(userId, {
        ...mockOriginalPlan,
        title: newTitle,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      });
    });

    it('should handle plan not found for duplication', async () => {
      const userId = 'user-123';
      const planId = 'nonexistent-plan';
      const newTitle = 'Duplicated Plan';

      mockPlanPersistence.getPlan.mockResolvedValue(null);

      await expect(service.duplicatePlan(userId, planId, newTitle)).rejects.toThrow('Plan not found');
    });
  });

  describe('archivePlan', () => {
    it('should archive plan successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        isActive: true,
      };

      const mockArchivedPlan = {
        ...mockPlan,
        isActive: false,
        archivedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);
      mockPlanPersistence.updatePlan.mockResolvedValue(mockArchivedPlan);

      const result = await service.archivePlan(userId, planId);

      expect(result).toEqual(mockArchivedPlan);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanPersistence.updatePlan).toHaveBeenCalledWith(planId, {
        isActive: false,
        archivedAt: expect.any(Date),
      });
    });
  });

  describe('activatePlan', () => {
    it('should activate plan successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        isActive: false,
      };

      const mockActivatedPlan = {
        ...mockPlan,
        isActive: true,
        activatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);
      mockPlanPersistence.updatePlan.mockResolvedValue(mockActivatedPlan);

      const result = await service.activatePlan(userId, planId);

      expect(result).toEqual(mockActivatedPlan);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanPersistence.updatePlan).toHaveBeenCalledWith(planId, {
        isActive: true,
        activatedAt: expect.any(Date),
      });
    });
  });

  describe('getPlanSuggestions', () => {
    it('should get plan suggestions successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        sessions: [],
      };

      const mockSuggestions = {
        improvements: [
          'Add more practice problems',
          'Include review sessions',
        ],
        optimizations: [
          'Better time distribution',
          'Improved difficulty progression',
        ],
        resources: [
          'Additional textbook chapters',
          'Online practice tests',
        ],
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);
      mockPlanAnalysis.getPlanRecommendations.mockResolvedValue(mockSuggestions);

      const result = await service.getPlanSuggestions(userId, planId);

      expect(result).toEqual(mockSuggestions);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanAnalysis.getPlanRecommendations).toHaveBeenCalledWith(mockPlan);
    });
  });

  describe('analyzePlanPerformance', () => {
    it('should analyze plan performance successfully', async () => {
      const userId = 'user-123';
      const planId = 'plan-123';

      const mockPlan = {
        id: planId,
        title: 'Math Study Plan',
        sessions: [],
      };

      const mockPerformanceAnalysis = {
        overallScore: 0.85,
        strengths: ['Good time management', 'Effective study techniques'],
        weaknesses: ['Limited practice problems', 'No review sessions'],
        recommendations: [
          'Add more practice sessions',
          'Include weekly reviews',
        ],
        metrics: {
          completionRate: 0.8,
          averageSessionDuration: 60,
          totalStudyTime: 480,
        },
      };

      mockPlanPersistence.getPlan.mockResolvedValue(mockPlan);
      mockPlanAnalysis.analyzeUserContext.mockResolvedValue(mockPerformanceAnalysis);

      const result = await service.analyzePlanPerformance(userId, planId);

      expect(result).toEqual(mockPerformanceAnalysis);
      expect(mockPlanPersistence.getPlan).toHaveBeenCalledWith(userId, planId);
      expect(mockPlanAnalysis.analyzeUserContext).toHaveBeenCalledWith(userId);
    });
  });
});
