import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OpenAIService } from '../services/openai.service';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    examAnalysis: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    learningPath: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    studyPattern: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OpenAIService,
          useValue: {
            generateContent: jest.fn().mockResolvedValue('Mock AI response'),
          },
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeExamResult', () => {
    it('should analyze exam result successfully', async () => {
      const examData = {
        examData: [
          { questionId: 'q1', studentAnswer: 'A', correctAnswer: 'A', topic: 'Algebra', difficulty: 'medium' }
        ],
        subject: 'Math',
        grade: 9,
        performance: 85,
        userId: 'user1',
      };

      const mockResult = {
        id: 'analysis1',
        userId: 'user1',
        examId: 'exam1',
        analysis: { strengths: [], weaknesses: [] },
        recommendations: [],
        createdAt: new Date(),
      };

      mockPrismaService.examAnalysis.create.mockResolvedValue(mockResult);

      const result = await service.analyzeExamResult(examData);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.examAnalysis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: examData.userId,
        }),
      });
    });

    it('should handle database error', async () => {
      const examData = {
        examData: [
          { questionId: 'q1', studentAnswer: 'A', correctAnswer: 'A', topic: 'Algebra', difficulty: 'medium' }
        ],
        subject: 'Math',
        grade: 9,
        performance: 85,
        userId: 'user1',
      };

      mockPrismaService.examAnalysis.create.mockRejectedValue(new Error('Database error'));

      await expect(service.analyzeExamResult(examData)).rejects.toThrow('Database error');
    });
  });

  describe('analyzeLearningPath', () => {
    it('should analyze learning path successfully', async () => {
      const pathData = {
        pathId: 'path1',
        progress: [
          { stepId: 'step1', title: 'Step 1', completionPercentage: 100, completedAt: '2023-01-01' },
          { stepId: 'step2', title: 'Step 2', completionPercentage: 50 }
        ],
        userId: 'user1',
        subjects: ['Math', 'Science'],
        currentLevel: 'Intermediate',
        targetLevel: 'Advanced',
        timeAvailable: 120,
      };

      const mockResult = {
        id: 'path1',
        userId: 'user1',
        analysis: { recommendations: [] },
        createdAt: new Date(),
      };

      mockPrismaService.learningPath.create.mockResolvedValue(mockResult);

      const result = await service.analyzeLearningPath(pathData);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.learningPath.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: pathData.userId,
          pathId: pathData.pathId,
        }),
      });
    });

    it('should handle invalid data', async () => {
      const pathData = {
        pathId: 'path1',
        progress: [
          { stepId: 'step1', title: 'Step 1', completionPercentage: 100, completedAt: '2023-01-01' },
          { stepId: 'step2', title: 'Step 2', completionPercentage: 50 }
        ],
        userId: 'user1',
        subjects: [],
        currentLevel: 'Intermediate',
        targetLevel: 'Advanced',
        timeAvailable: 0,
      };

      await expect(service.analyzeLearningPath(pathData)).rejects.toThrow('Invalid data');
    });
  });

  describe('analyzeStudyPattern', () => {
    it('should analyze study pattern successfully', async () => {
      const patternData = {
        studySessions: [
          { subject: 'Math', duration: 60, effectiveness: 0.8 },
        ],
        timeRange: 'morning',
      };

      const mockResult = {
        id: 'pattern1',
        analysis: { patterns: [] },
        createdAt: new Date(),
      };

      mockPrismaService.studyPattern.create.mockResolvedValue(mockResult);

      const result = await service.analyzeStudyPattern(patternData);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.studyPattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          studySessions: patternData.studySessions,
          timeRange: patternData.timeRange,
        }),
      });
    });

    it('should handle no data to analyze', async () => {
      const patternData = {
        studySessions: [],
        timeRange: 'morning',
      };

      mockPrismaService.studyPattern.create.mockRejectedValue(new Error('No data to analyze'));

      await expect(service.analyzeStudyPattern(patternData)).rejects.toThrow('No data to analyze');
    });
  });

  describe('getUserAnalysis', () => {
    it('should get user analysis successfully', async () => {
      const userId = 'user1';
      const mockAnalysis = {
        examAnalyses: [],
        learningPaths: [],
        studyPatterns: [],
      };

      mockPrismaService.examAnalysis.findMany.mockResolvedValue([]);
      mockPrismaService.learningPath.findMany.mockResolvedValue([]);
      mockPrismaService.studyPattern.findMany.mockResolvedValue([]);

      const result = await service.getUserAnalysis(userId);

      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('updateAnalysis', () => {
    it('should update analysis successfully', async () => {
      const analysisId = 'analysis1';
      const updateData = { recommendations: ['Study more'] };

      const mockResult = {
        id: analysisId,
        ...updateData,
      };

      mockPrismaService.examAnalysis.update.mockResolvedValue(mockResult);

      const result = await service.updateAnalysis(analysisId, updateData);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.examAnalysis.update).toHaveBeenCalledWith({
        where: { id: analysisId },
        data: updateData,
      });
    });

    it('should handle update failure', async () => {
      const analysisId = 'analysis1';
      const updateData = { recommendations: ['Study more'] };

      mockPrismaService.examAnalysis.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateAnalysis(analysisId, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete analysis successfully', async () => {
      const analysisId = 'analysis1';

      mockPrismaService.examAnalysis.delete.mockResolvedValue({ id: analysisId });

      const result = await service.deleteAnalysis(analysisId);

      expect(result).toEqual({ id: analysisId });
      expect(mockPrismaService.examAnalysis.delete).toHaveBeenCalledWith({
        where: { id: analysisId },
      });
    });

    it('should handle delete failure', async () => {
      const analysisId = 'analysis1';

      mockPrismaService.examAnalysis.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteAnalysis(analysisId)).rejects.toThrow('Delete failed');
    });
  });
});