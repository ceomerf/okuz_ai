import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIController } from './ai.controller';
import { AIOrchestrator } from './ai-orchestrator.service';
import { PromptVersioningService } from './prompt-versioning.service';
import { AIRateLimitService } from './ai-rate-limit.service';
import { PromptTestingService } from './prompt-testing.service';
import { AIMonitoringService } from './ai-monitoring.service';

describe('AIController', () => {
  let controller: AIController;
  let aiOrchestrator: AIOrchestrator;
  let promptVersioning: PromptVersioningService;
  let rateLimit: AIRateLimitService;
  let promptTesting: PromptTestingService;
  let monitoring: AIMonitoringService;

  const mockAIOrchestrator = {
    generateContent: jest.fn(),
    generateWithPrompt: jest.fn(),
    checkHealth: jest.fn(),
    getUsageStatistics: jest.fn(),
  };

  const mockPromptVersioning = {
    createTemplate: jest.fn(),
    getTemplate: jest.fn(),
    listTemplates: jest.fn(),
    updateTemplate: jest.fn(),
    testTemplate: jest.fn(),
  };

  const mockRateLimit = {
    getRateLimitStatistics: jest.fn(),
  };

  const mockPromptTesting = {
    createTestSuite: jest.fn(),
    runTestSuite: jest.fn(),
    getTestReports: jest.fn(),
  };

  const mockMonitoring = {
    collectAIMetrics: jest.fn(),
    getAIDashboard: jest.fn(),
    analyzeCosts: jest.fn(),
    analyzePerformance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIController],
      providers: [
        {
          provide: AIOrchestrator,
          useValue: mockAIOrchestrator,
        },
        {
          provide: PromptVersioningService,
          useValue: mockPromptVersioning,
        },
        {
          provide: AIRateLimitService,
          useValue: mockRateLimit,
        },
        {
          provide: PromptTestingService,
          useValue: mockPromptTesting,
        },
        {
          provide: AIMonitoringService,
          useValue: mockMonitoring,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                NODE_ENV: 'test',
                JWT_SECRET: 'test-secret',
                OPENAI_API_KEY: 'test-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AIController>(AIController);
    aiOrchestrator = module.get<AIOrchestrator>(AIOrchestrator);
    promptVersioning = module.get<PromptVersioningService>(PromptVersioningService);
    rateLimit = module.get<AIRateLimitService>(AIRateLimitService);
    promptTesting = module.get<PromptTestingService>(PromptTestingService);
    monitoring = module.get<AIMonitoringService>(AIMonitoringService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockRequest = {
        prompt: 'Test prompt',
        context: { test: 'data' },
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const mockResponse = {
        content: 'Generated content',
        model: 'gpt-4',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        duration: 1000,
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.01,
      };

      mockAIOrchestrator.generateContent.mockResolvedValue(mockResponse);

      const result = await controller.generateContent(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAIOrchestrator.generateContent).toHaveBeenCalledWith(mockRequest, {
        cache: undefined,
        cacheTTL: undefined,
        rateLimit: undefined,
        fallback: undefined,
      });
    });

    it('should handle generation errors', async () => {
      const mockRequest = {
        prompt: 'Test prompt',
        context: { test: 'data' },
      };

      const error = new Error('AI service error');
      mockAIOrchestrator.generateContent.mockRejectedValue(error);

      await expect(controller.generateContent(mockRequest)).rejects.toThrow('AI service error');
    });
  });

  describe('generateWithPrompt', () => {
    it('should generate content with prompt template', async () => {
      const mockRequest = {
        promptType: 'plan_generation',
        context: { studentName: 'Test Student' },
        version: '1.0',
      };

      const mockResponse = {
        content: 'Generated with template',
        model: 'gpt-4',
        usage: {
          promptTokens: 15,
          completionTokens: 25,
          totalTokens: 40,
        },
        duration: 1200,
        requestId: 'req-124',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.015,
      };

      mockAIOrchestrator.generateWithPrompt.mockResolvedValue(mockResponse);

      const result = await controller.generateWithPrompt(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAIOrchestrator.generateWithPrompt).toHaveBeenCalledWith(
        mockRequest.promptType,
        mockRequest.context,
        {
          cache: undefined,
          cacheTTL: undefined,
          rateLimit: true,
          fallback: true,
        }
      );
    });
  });

  describe('createTemplate', () => {
    it('should create prompt template successfully', async () => {
      const mockTemplate = {
        name: 'Test Template',
        content: 'Test content with {{variable}}',
        variables: ['variable'],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const mockResponse = {
        id: 'template-123',
        ...mockTemplate,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockPromptVersioning.createTemplate.mockResolvedValue(mockResponse);

      const result = await controller.createTemplate(mockTemplate);

      expect(result).toEqual(mockResponse);
      expect(mockPromptVersioning.createTemplate).toHaveBeenCalledWith(mockTemplate);
    });
  });

  describe('getTemplate', () => {
    it('should get template by ID', async () => {
      const templateId = 'template-123';
      const version = '1.0';

      const mockTemplate = {
        id: templateId,
        name: 'Test Template',
        content: 'Test content',
        version: version,
      };

      mockPromptVersioning.getTemplate.mockResolvedValue(mockTemplate);

      const result = await controller.getTemplate(templateId, version);

      expect(result).toEqual(mockTemplate);
      expect(mockPromptVersioning.getTemplate).toHaveBeenCalledWith(templateId, version);
    });
  });

  describe('listTemplates', () => {
    it('should list templates with filters', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          isActive: true,
        },
        {
          id: 'template-2',
          name: 'Template 2',
          isActive: false,
        },
      ];

      mockPromptVersioning.listTemplates.mockResolvedValue(mockTemplates);

      const result = await controller.listTemplates(10, 0, true);

      expect(result).toEqual(mockTemplates);
      expect(mockPromptVersioning.listTemplates).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        isActive: true,
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const templateId = 'template-123';
      const updateData = {
        content: 'Updated content',
        temperature: 0.8,
      };

      const mockResponse = {
        id: templateId,
        ...updateData,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockPromptVersioning.updateTemplate.mockResolvedValue(mockResponse);

      const result = await controller.updateTemplate(templateId, updateData);

      expect(result).toEqual(mockResponse);
      expect(mockPromptVersioning.updateTemplate).toHaveBeenCalledWith(templateId, updateData);
    });
  });

  describe('testTemplate', () => {
    it('should test template with test cases', async () => {
      const templateId = 'template-123';
      const testCases = [
        {
          name: 'Test Case 1',
          input: { variable: 'test' },
          expectedOutput: 'Expected output',
        },
      ];

      const mockTestResult = {
        templateId,
        testResults: [
          {
            testCase: testCases[0],
            passed: true,
            actualOutput: 'Expected output',
            duration: 1000,
          },
        ],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
        },
      };

      mockPromptVersioning.testTemplate.mockResolvedValue(mockTestResult);

      const result = await controller.testTemplate(templateId, testCases);

      expect(result).toEqual(mockTestResult);
      expect(mockPromptVersioning.testTemplate).toHaveBeenCalledWith(templateId, testCases, undefined);
    });
  });

  describe('createTestSuite', () => {
    it('should create test suite successfully', async () => {
      const mockTestSuite = {
        name: 'Test Suite',
        description: 'Test suite description',
        templateId: 'template-123',
        testCases: [
          {
            name: 'Test Case 1',
            description: 'Test case description',
            input: { variable: 'test' },
            expectedOutput: 'Expected output',
          },
        ],
      };

      const mockResponse = {
        id: 'suite-123',
        ...mockTestSuite,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockPromptTesting.createTestSuite.mockResolvedValue(mockResponse);

      const result = await controller.createTestSuite(mockTestSuite);

      expect(result).toEqual(mockResponse);
      expect(mockPromptTesting.createTestSuite).toHaveBeenCalledWith(mockTestSuite);
    });
  });

  describe('runTestSuite', () => {
    it('should run test suite successfully', async () => {
      const suiteId = 'suite-123';
      const version = '1.0';

      const mockTestResult = {
        suiteId,
        version,
        testResults: [
          {
            testCase: 'Test Case 1',
            passed: true,
            duration: 1000,
          },
        ],
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          duration: 1000,
        },
      };

      mockPromptTesting.runTestSuite.mockResolvedValue(mockTestResult);

      const result = await controller.runTestSuite(suiteId, version);

      expect(result).toEqual(mockTestResult);
      expect(mockPromptTesting.runTestSuite).toHaveBeenCalledWith(suiteId, version);
    });
  });

  describe('getTestReports', () => {
    it('should get test reports with filters', async () => {
      const mockReports = [
        {
          id: 'report-1',
          testSuiteId: 'suite-123',
          templateId: 'template-123',
          results: { passed: 5, failed: 1 },
        },
      ];

      mockPromptTesting.getTestReports.mockResolvedValue(mockReports);

      const result = await controller.getTestReports('suite-123', 'template-123', 10, 0);

      expect(result).toEqual(mockReports);
      expect(mockPromptTesting.getTestReports).toHaveBeenCalledWith({
        testSuiteId: 'suite-123',
        templateId: 'template-123',
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('getRateLimitStatus', () => {
    it('should get rate limit status', async () => {
      const mockStatus = {
        userId: 'user-123',
        requestsPerMinute: 45,
        requestsPerHour: 1200,
        requestsPerDay: 10000,
        limitPerMinute: 60,
        limitPerHour: 1500,
        limitPerDay: 15000,
        resetTime: '2024-01-01T01:00:00Z',
      };

      mockRateLimit.getRateLimitStatistics.mockResolvedValue(mockStatus);

      const result = await controller.getRateLimitStatus();

      expect(result).toEqual(mockStatus);
      expect(mockRateLimit.getRateLimitStatistics).toHaveBeenCalledWith('current-user-id');
    });
  });

  describe('getAIMetrics', () => {
    it('should get AI metrics for time range', async () => {
      const timeRange = '24h';
      const mockMetrics = {
        requests: 1500,
        tokens: 50000,
        cost: 25.50,
        averageResponseTime: 1200,
        successRate: 0.98,
        errorRate: 0.02,
      };

      mockMonitoring.collectAIMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getAIMetrics(timeRange);

      expect(result).toEqual(mockMetrics);
      expect(mockMonitoring.collectAIMetrics).toHaveBeenCalledWith(timeRange);
    });
  });

  describe('getAIDashboard', () => {
    it('should get AI dashboard data', async () => {
      const mockDashboard = {
        metrics: {
          totalRequests: 10000,
          totalCost: 150.75,
          averageResponseTime: 1100,
        },
        alerts: [
          {
            type: 'high_cost',
            message: 'Cost exceeded threshold',
            severity: 'warning',
          },
        ],
        recommendations: [
          {
            type: 'optimization',
            message: 'Consider using gpt-3.5-turbo for simple tasks',
          },
        ],
      };

      mockMonitoring.getAIDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getAIDashboard();

      expect(result).toEqual(mockDashboard);
      expect(mockMonitoring.getAIDashboard).toHaveBeenCalled();
    });
  });

  describe('getCostAnalysis', () => {
    it('should get cost analysis', async () => {
      const timeRange = '7d';
      const mockCostAnalysis = {
        totalCost: 150.75,
        costByModel: {
          'gpt-4': 120.50,
          'gpt-3.5-turbo': 30.25,
        },
        costTrend: [
          { date: '2024-01-01', cost: 20.00 },
          { date: '2024-01-02', cost: 25.50 },
        ],
        recommendations: [
          'Use gpt-3.5-turbo for simple tasks',
          'Implement caching for repeated requests',
        ],
      };

      mockMonitoring.analyzeCosts.mockResolvedValue(mockCostAnalysis);

      const result = await controller.getCostAnalysis(timeRange);

      expect(result).toEqual(mockCostAnalysis);
      expect(mockMonitoring.analyzeCosts).toHaveBeenCalledWith(timeRange);
    });
  });

  describe('getPerformanceAnalysis', () => {
    it('should get performance analysis', async () => {
      const timeRange = '24h';
      const mockPerformanceAnalysis = {
        averageResponseTime: 1200,
        p95ResponseTime: 2500,
        p99ResponseTime: 5000,
        successRate: 0.98,
        errorRate: 0.02,
        throughput: 100,
        bottlenecks: [
          {
            service: 'OpenAI API',
            impact: 'high',
            recommendation: 'Implement retry logic',
          },
        ],
      };

      mockMonitoring.analyzePerformance.mockResolvedValue(mockPerformanceAnalysis);

      const result = await controller.getPerformanceAnalysis(timeRange);

      expect(result).toEqual(mockPerformanceAnalysis);
      expect(mockMonitoring.analyzePerformance).toHaveBeenCalledWith(timeRange);
    });
  });

  describe('checkHealth', () => {
    it('should check AI service health', async () => {
      const mockHealth = {
        status: 'healthy',
        services: {
          openai: { status: 'up', responseTime: 200 },
          cache: { status: 'up', responseTime: 50 },
        },
        lastChecked: '2024-01-01T00:00:00Z',
      };

      mockAIOrchestrator.checkHealth.mockResolvedValue(mockHealth);

      const result = await controller.checkHealth();

      expect(result).toEqual(mockHealth);
      expect(mockAIOrchestrator.checkHealth).toHaveBeenCalled();
    });
  });

  describe('getUsageStatistics', () => {
    it('should get usage statistics', async () => {
      const userId = 'user-123';
      const timeRange = '30d';
      const mockStats = {
        userId,
        timeRange,
        totalRequests: 5000,
        totalTokens: 150000,
        totalCost: 75.25,
        requestsByDay: [
          { date: '2024-01-01', requests: 100 },
          { date: '2024-01-02', requests: 150 },
        ],
        topModels: [
          { model: 'gpt-4', requests: 3000, cost: 60.00 },
          { model: 'gpt-3.5-turbo', requests: 2000, cost: 15.25 },
        ],
      };

      mockAIOrchestrator.getUsageStatistics.mockResolvedValue(mockStats);

      const result = await controller.getUsageStatistics(userId, timeRange);

      expect(result).toEqual(mockStats);
      expect(mockAIOrchestrator.getUsageStatistics).toHaveBeenCalledWith(userId, timeRange);
    });
  });
});
