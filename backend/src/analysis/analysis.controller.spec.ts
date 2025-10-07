import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { Request } from 'express';

describe('AnalysisController', () => {
  let controller: AnalysisController;
  let service: AnalysisService;

  const mockAnalysisService = {
    analyzeExamResult: jest.fn(),
    analyzeLearningPath: jest.fn(),
    analyzeStudyPattern: jest.fn(),
    getUserAnalysis: jest.fn(),
    updateAnalysis: jest.fn(),
    deleteAnalysis: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'user123' },
  } as Request & { user: { id: string } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalysisController],
      providers: [
        {
          provide: AnalysisService,
          useValue: mockAnalysisService,
        },
      ],
    }).compile();

    controller = module.get<AnalysisController>(AnalysisController);
    service = module.get<AnalysisService>(AnalysisService);
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
      };

      const mockResult = {
        id: 'analysis1',
        userId: 'user123',
        analysis: { strengths: [], weaknesses: [] },
        recommendations: [],
      };

      mockAnalysisService.analyzeExamResult.mockResolvedValue(mockResult);

      const result = await controller.analyzeExamResult(mockRequest, examData);

      expect(result).toEqual(mockResult);
      expect(mockAnalysisService.analyzeExamResult).toHaveBeenCalledWith({
        ...examData,
        userId: 'user123',
      });
    });

    it('should handle analysis failure', async () => {
      const examData = {
        examData: [
          { questionId: 'q1', studentAnswer: 'A', correctAnswer: 'A', topic: 'Algebra', difficulty: 'medium' }
        ],
        subject: 'Math',
        grade: 9,
        performance: 85,
      };

      mockAnalysisService.analyzeExamResult.mockRejectedValue(new Error('Analysis failed'));

      await expect(controller.analyzeExamResult(mockRequest, examData)).rejects.toThrow('Analysis failed');
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
        subjects: ['Math', 'Science'],
        currentLevel: 'Intermediate',
        targetLevel: 'Advanced',
        timeAvailable: 120,
      };

      const mockResult = {
        id: 'path1',
        userId: 'user123',
        analysis: { recommendations: [] },
      };

      mockAnalysisService.analyzeLearningPath.mockResolvedValue(mockResult);

      const result = await controller.analyzeLearningPath(mockRequest, pathData);

      expect(result).toEqual(mockResult);
      expect(mockAnalysisService.analyzeLearningPath).toHaveBeenCalledWith({
        ...pathData,
        userId: 'user123',
      });
    });
  });

  describe('analyzeStudyPattern', () => {
    it('should analyze study pattern successfully', async () => {
      const patternData = {
        studySessions: [
          { sessionId: 'session1', subject: 'Math', topic: 'Algebra', duration: 60, startTime: '2023-01-01T10:00:00Z', performance: 80 },
        ],
        timeRange: 'morning',
      };

      const mockResult = {
        id: 'pattern1',
        analysis: { patterns: [] },
      };

      mockAnalysisService.analyzeStudyPattern.mockResolvedValue(mockResult);

      const result = await controller.analyzeStudyPattern(mockRequest, patternData);

      expect(result).toEqual(mockResult);
      expect(mockAnalysisService.analyzeStudyPattern).toHaveBeenCalledWith({
        userId: 'user123',
        ...patternData
      });
    });
  });

  describe('getUserAnalysis', () => {
    it('should get user analysis successfully', async () => {
      const userId = 'user123';
      const mockAnalysis = {
        examAnalyses: [],
        learningPaths: [],
        studyPatterns: [],
      };

      mockAnalysisService.getUserAnalysis.mockResolvedValue(mockAnalysis);

      const result = await controller.getUserAnalysis(mockRequest);

      expect(result).toEqual(mockAnalysis);
      expect(mockAnalysisService.getUserAnalysis).toHaveBeenCalledWith(userId);
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

      mockAnalysisService.updateAnalysis.mockResolvedValue(mockResult);

      const result = await controller.updateAnalysis(analysisId, updateData);

      expect(result).toEqual(mockResult);
      expect(mockAnalysisService.updateAnalysis).toHaveBeenCalledWith(analysisId, updateData);
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete analysis successfully', async () => {
      const analysisId = 'analysis1';

      mockAnalysisService.deleteAnalysis.mockResolvedValue({ id: analysisId });

      const result = await controller.deleteAnalysis(analysisId);

      expect(result).toEqual({ id: analysisId });
      expect(mockAnalysisService.deleteAnalysis).toHaveBeenCalledWith(analysisId);
    });
  });
});