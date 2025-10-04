import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from './openai.service';
import { MetricsService } from '../monitoring/metrics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from './cache.service';

describe('OpenAIService', () => {
  let service: OpenAIService;
  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'test_openai_key';
      if (key === 'OPENAI_MODEL') return 'gpt-3.5-turbo';
      return 'test_openai_key';
    }),
  } as any as ConfigService;

  const mockMetrics = {
    recordOpenAIRequest: jest.fn(),
    recordOpenAICallDuration: jest.fn(),
    recordCacheHit: jest.fn(),
    recordGeminiRequest: jest.fn(),
  } as any as MetricsService;

  const mockPrisma = {
    userUsageControl: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  } as any as PrismaService;

  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  } as any as CacheService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: MetricsService, useValue: mockMetrics },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const prompt = 'Test prompt';
      const mockResponse = 'Generated content';

      // Mock OpenAI response
      jest.spyOn(service as any, 'callOpenAI').mockResolvedValue(mockResponse);

      const result = await service.generateContent(prompt);

      expect(result).toBe(mockResponse);
      expect(mockMetrics.recordOpenAIRequest).toHaveBeenCalled();
    });

    it('should use cache when available', async () => {
      const prompt = 'Test prompt';
      const cachedResponse = 'Cached content';

      mockCache.get.mockResolvedValue(cachedResponse);

      const result = await service.generateContent(prompt);

      expect(result).toBe(cachedResponse);
      expect(mockMetrics.recordCacheHit).toHaveBeenCalledWith('openai');
    });
  });
});
