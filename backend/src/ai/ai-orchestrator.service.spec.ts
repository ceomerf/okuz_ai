import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIOrchestrator } from './ai-orchestrator.service';
import { PromptVersioningService } from './prompt-versioning.service';
import { AIRateLimitService } from './ai-rate-limit.service';
import { CacheService } from '../common/cache/cache.service';
import { LoggingService } from '../common/logging/logging.service';

describe('AIOrchestrator', () => {
  let service: AIOrchestrator;
  let configService: ConfigService;
  let promptVersioning: PromptVersioningService;
  let rateLimit: AIRateLimitService;
  let cache: CacheService;
  let logging: LoggingService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        NODE_ENV: 'test',
        OPENAI_API_KEY: 'test-openai-key',
        AI_DEFAULT_MODEL: 'gpt-4',
        AI_DEFAULT_TEMPERATURE: '0.7',
        AI_DEFAULT_MAX_TOKENS: '2000',
        AI_DEFAULT_TIMEOUT: '30000',
        AI_DEFAULT_RETRIES: '3',
        AI_DEFAULT_CACHE_TTL: '1800',
        AI_RATE_LIMIT: '100',
      };
      return config[key];
    }),
  };

  const mockPromptVersioning = {
    getTemplate: jest.fn(),
    listTemplates: jest.fn(),
  };

  const mockRateLimit = {
    checkRateLimit: jest.fn(),
    recordRequest: jest.fn(),
    getRateLimitStatistics: jest.fn(),
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
        AIOrchestrator,
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
          provide: CacheService,
          useValue: mockCache,
        },
        {
          provide: LoggingService,
          useValue: mockLogging,
        },
      ],
    }).compile();

    service = module.get<AIOrchestrator>(AIOrchestrator);
    configService = module.get<ConfigService>(ConfigService);
    promptVersioning = module.get<PromptVersioningService>(PromptVersioningService);
    rateLimit = module.get<AIRateLimitService>(AIRateLimitService);
    cache = module.get<CacheService>(CacheService);
    logging = module.get<LoggingService>(LoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const request = {
        prompt: 'Test prompt',
        context: { test: 'data' },
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const options = {
        cache: true,
        cacheTTL: 1800,
        rateLimit: true,
        fallback: true,
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

      // Mock rate limit check
      mockRateLimit.checkRateLimit.mockResolvedValue(true);

      // Mock cache miss
      mockCache.get.mockResolvedValue(null);

      // Mock OpenAI API call (simulated)
      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue(mockResponse);

      // Mock cache set
      mockCache.set.mockResolvedValue(undefined);

      // Mock rate limit record
      mockRateLimit.recordRequest.mockResolvedValue(undefined);

      const result = await service.generateContent(request, options);

      expect(result).toEqual(mockResponse);
      expect(mockRateLimit.checkRateLimit).toHaveBeenCalled();
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockRateLimit.recordRequest).toHaveBeenCalled();
    });

    it('should use cached content when available', async () => {
      const request = {
        prompt: 'Test prompt',
        context: { test: 'data' },
      };

      const options = {
        cache: true,
        cacheTTL: 1800,
      };

      const cachedResponse = {
        content: 'Cached content',
        model: 'gpt-4',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        duration: 100,
        requestId: 'cached-req-123',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.005,
        cached: true,
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const result = await service.generateContent(request, options);

      expect(result).toEqual(cachedResponse);
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('should handle rate limit exceeded', async () => {
      const request = {
        prompt: 'Test prompt',
        context: { test: 'data' },
      };

      const options = {
        rateLimit: true,
      };

      mockRateLimit.checkRateLimit.mockResolvedValue(false);

      await expect(service.generateContent(request, options)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle OpenAI API errors', async () => {
      const request = {
        prompt: 'Test prompt',
        context: { test: 'data' },
      };

      const options = {};

      mockRateLimit.checkRateLimit.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(null);

      const error = new Error('OpenAI API error');
      jest.spyOn(service as any, 'callOpenAI').mockRejectedValue(error);

      await expect(service.generateContent(request, options)).rejects.toThrow('OpenAI API error');
    });

    it('should retry on failure with fallback', async () => {
      const request = {
        prompt: 'Test prompt',
        context: { test: 'data' },
        model: 'gpt-4',
      };

      const options = {
        fallback: true,
      };

      mockRateLimit.checkRateLimit.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(null);

      // First call fails, second succeeds
      const error = new Error('OpenAI API error');
      const successResponse = {
        content: 'Generated content',
        model: 'gpt-3.5-turbo', // Fallback model
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
        duration: 1000,
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.005,
      };

      jest.spyOn(service as any, 'callOpenAI')
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(successResponse);

      const result = await service.generateContent(request, options);

      expect(result).toEqual(successResponse);
      expect(result.model).toBe('gpt-3.5-turbo');
    });
  });

  describe('generateWithPrompt', () => {
    it('should generate content with prompt template', async () => {
      const promptType = 'plan_generation';
      const context = { studentName: 'Test Student', grade: 11 };
      const options = {
        cache: true,
        cacheTTL: 1800,
        rateLimit: true,
        fallback: true,
      };

      const mockTemplate = {
        id: 'template-123',
        name: 'Plan Generation',
        content: 'Generate a study plan for {{studentName}} in grade {{grade}}',
        variables: ['studentName', 'grade'],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
      };

      const mockResponse = {
        content: 'Generated study plan',
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

      mockPromptVersioning.getTemplate.mockResolvedValue(mockTemplate);
      mockRateLimit.checkRateLimit.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(null);
      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue(mockResponse);
      mockCache.set.mockResolvedValue(undefined);
      mockRateLimit.recordRequest.mockResolvedValue(undefined);

      const result = await service.generateWithPrompt(promptType, context, options);

      expect(result).toEqual(mockResponse);
      expect(mockPromptVersioning.getTemplate).toHaveBeenCalledWith(promptType, undefined);
    });

    it('should handle template not found', async () => {
      const promptType = 'nonexistent_template';
      const context = { test: 'data' };
      const options = {};

      mockPromptVersioning.getTemplate.mockResolvedValue(null);

      await expect(service.generateWithPrompt(promptType, context, options)).rejects.toThrow('Template not found');
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

      jest.spyOn(service as any, 'checkOpenAIHealth').mockResolvedValue({
        status: 'up',
        responseTime: 200,
      });

      jest.spyOn(service as any, 'checkCacheHealth').mockResolvedValue({
        status: 'up',
        responseTime: 50,
      });

      const result = await service.checkHealth();

      expect(result).toEqual(mockHealth);
    });

    it('should detect unhealthy services', async () => {
      jest.spyOn(service as any, 'checkOpenAIHealth').mockResolvedValue({
        status: 'down',
        responseTime: null,
        error: 'API key invalid',
      });

      jest.spyOn(service as any, 'checkCacheHealth').mockResolvedValue({
        status: 'up',
        responseTime: 50,
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.openai.status).toBe('down');
    });
  });

  describe('getUsageStatistics', () => {
    it('should get usage statistics for user', async () => {
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

      jest.spyOn(service as any, 'getUserUsageStats').mockResolvedValue(mockStats);

      const result = await service.getUsageStatistics(userId, timeRange);

      expect(result).toEqual(mockStats);
    });

    it('should get usage statistics for all users when no userId provided', async () => {
      const timeRange = '7d';

      const mockStats = {
        totalUsers: 100,
        totalRequests: 50000,
        totalTokens: 1500000,
        totalCost: 750.25,
        averageRequestsPerUser: 500,
        topUsers: [
          { userId: 'user-1', requests: 1000, cost: 15.00 },
          { userId: 'user-2', requests: 800, cost: 12.00 },
        ],
      };

      jest.spyOn(service as any, 'getGlobalUsageStats').mockResolvedValue(mockStats);

      const result = await service.getUsageStatistics(undefined, timeRange);

      expect(result).toEqual(mockStats);
    });
  });

  describe('private methods', () => {
    describe('callOpenAI', () => {
      it('should call OpenAI API with correct parameters', async () => {
        const request = {
          prompt: 'Test prompt',
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

        jest.spyOn(service as any, 'callOpenAI').mockResolvedValue(mockResponse);

        const result = await (service as any).callOpenAI(request);

        expect(result).toEqual(mockResponse);
      });
    });

    describe('calculateCost', () => {
      it('should calculate cost correctly for gpt-4', () => {
        const usage = {
          promptTokens: 1000,
          completionTokens: 500,
        };

        const cost = (service as any).calculateCost('gpt-4', usage);

        expect(cost).toBeGreaterThan(0);
      });

      it('should calculate cost correctly for gpt-3.5-turbo', () => {
        const usage = {
          promptTokens: 1000,
          completionTokens: 500,
        };

        const cost = (service as any).calculateCost('gpt-3.5-turbo', usage);

        expect(cost).toBeGreaterThan(0);
        expect(cost).toBeLessThan((service as any).calculateCost('gpt-4', usage));
      });
    });

    describe('generateRequestId', () => {
      it('should generate unique request IDs', () => {
        const id1 = (service as any).generateRequestId();
        const id2 = (service as any).generateRequestId();

        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toBe(id2);
      });
    });
  });
});
