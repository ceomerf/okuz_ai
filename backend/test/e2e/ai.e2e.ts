import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../src/common/prisma/prisma.module';
import { AuthModule } from '../../src/auth/auth.module';
import { AIModule } from '../../src/ai/ai.module';
import { AIService } from '../../src/ai/ai.service';
import { AIConfigService } from '../../src/ai/ai-config.service';
import { PromptRegistry } from '../../src/ai/prompt-registry.service';
import { AILoggerService } from '../../src/ai/ai-logger.service';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { TestDatabaseSetup } from '../database/test-db.setup';
import { testUsers, testDataGenerators } from '../fixtures/test-data';
import { mockRedisService } from '../mocks/redis.mock';
import { openAIServer, mockOpenAIResponses, mockOpenAIUtils } from '../mocks/openai.mock';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';

describe('AI E2E Tests', () => {
  let app: INestApplication;
  let aiService: AIService;
  let aiConfig: AIConfigService;
  let promptRegistry: PromptRegistry;
  let aiLogger: AILoggerService;
  let prisma: PrismaService;
  let cache: CacheService;
  let testDb: TestDatabaseSetup;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    // Initialize test database
    testDb = new TestDatabaseSetup();
    await testDb.initialize();
    prisma = testDb.getPrisma();

    // Start OpenAI mock server
    openAIServer.listen();

    // Create testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-testing-only',
          signOptions: { expiresIn: '1h' },
        }),
        PassportModule,
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
        CacheModule.register({
          isGlobal: true,
          ttl: 300,
        }),
        PrismaModule,
        AuthModule,
        AIModule,
      ],
      providers: [
        {
          provide: CacheService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    aiService = moduleFixture.get<AIService>(AIService);
    aiConfig = moduleFixture.get<AIConfigService>(AIConfigService);
    promptRegistry = moduleFixture.get<PromptRegistry>(PromptRegistry);
    aiLogger = moduleFixture.get<AILoggerService>(AILoggerService);
    cache = moduleFixture.get<CacheService>(CacheService);

    // Setup global pipes and guards
    app.useGlobalGuards(new JwtAuthGuard());
    
    await app.init();
  });

  afterAll(async () => {
    await testDb.cleanup();
    openAIServer.close();
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data
    await prisma.aiRequestLog.deleteMany();
    await prisma.aiUsageAnalytics.deleteMany();
    await prisma.aiPromptTemplate.deleteMany();
    await prisma.user.deleteMany();
    
    // Reset mocks
    jest.clearAllMocks();
    mockRedisUtils.resetAll();
    
    // Create test user and get access token
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const user = testDataGenerators.generateUser({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      role: 'STUDENT',
    });
    const createdUser = await prisma.user.create({ data: user });
    userId = createdUser.id;

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123',
      });
    
    accessToken = loginResponse.body.access_token;
  });

  describe('AI Service - Direct Tests', () => {
    describe('generateContent', () => {
      it('should generate content successfully', async () => {
        const aiRequest = {
          prompt: 'Generate a study plan for mathematics',
          context: { subject: 'Mathematics', grade: 11 },
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
          userId: userId,
        };

        const response = await aiService.generateContent(aiRequest);

        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        expect(response).toHaveProperty('model');
        expect(response).toHaveProperty('requestId');
        expect(response).toHaveProperty('timestamp');
        expect(response.usage).toHaveProperty('promptTokens');
        expect(response.usage).toHaveProperty('completionTokens');
        expect(response.usage).toHaveProperty('totalTokens');
      });

      it('should handle rate limiting correctly', async () => {
        // Setup rate limit scenario
        mockRedisUtils.setupRateLimit('ai:rate_limit:test-user', 100, 100);

        const aiRequest = {
          prompt: 'Generate content',
          userId: 'test-user',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow('AI rate limit exceeded');
      });

      it('should handle cache hits correctly', async () => {
        const aiRequest = {
          prompt: 'Generate content',
          context: { subject: 'Mathematics' },
        };

        // Setup cache hit
        mockRedisUtils.setupCacheHit('ai:cache:test-key', { content: 'Cached response' });

        const response = await aiService.generateContent(aiRequest);

        expect(response.content).toBe('Cached response');
      });

      it('should handle OpenAI errors correctly', async () => {
        // Setup error response
        mockOpenAIUtils.setErrorResponse({
          status: 429,
          error: { message: 'Rate limit exceeded', type: 'rate_limit_exceeded' },
        });

        const aiRequest = {
          prompt: 'Generate content',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow();
      });
    });

    describe('generateWithPrompt', () => {
      it('should generate content with prompt registry', async () => {
        const context = {
          studentName: 'Test Student',
          grade: 11,
          subjects: ['Mathematics'],
          goals: ['Learn algebra'],
        };

        const response = await aiService.generateWithPrompt(
          'plan_generation_advanced',
          context
        );

        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        expect(response).toHaveProperty('model');
        expect(response).toHaveProperty('requestId');
        expect(response).toHaveProperty('timestamp');
      });

      it('should handle prompt registry errors', async () => {
        const context = {};

        await expect(
          aiService.generateWithPrompt('non-existent-prompt', context)
        ).rejects.toThrow();
      });
    });

    describe('getServiceStatus', () => {
      it('should return service status', async () => {
        const status = await aiService.getServiceStatus();

        expect(status).toHaveProperty('status');
        expect(status).toHaveProperty('totalRequests');
        expect(status).toHaveProperty('averageResponseTime');
        expect(status).toHaveProperty('errorRate');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
      });
    });

    describe('getUsageStats', () => {
      it('should return usage statistics', async () => {
        const stats = await aiService.getUsageStats(userId);

        expect(stats).toHaveProperty('totalRequests');
        expect(stats).toHaveProperty('totalTokens');
        expect(stats).toHaveProperty('averageTokensPerRequest');
        expect(stats).toHaveProperty('mostUsedModel');
        expect(stats).toHaveProperty('requestsToday');
      });
    });
  });

  describe('AI Config Service', () => {
    describe('getDefaultModel', () => {
      it('should return default model', () => {
        const model = aiConfig.getDefaultModel();
        expect(model).toBe('gpt-3.5-turbo');
      });
    });

    describe('getModelForPromptType', () => {
      it('should return model for prompt type', () => {
        const model = aiConfig.getModelForPromptType('plan_generation');
        expect(model).toBe('gpt-4');
      });
    });

    describe('getTemperatureForPromptType', () => {
      it('should return temperature for prompt type', () => {
        const temperature = aiConfig.getTemperatureForPromptType('plan_generation');
        expect(temperature).toBe(0.7);
      });
    });

    describe('getMaxTokensForPromptType', () => {
      it('should return max tokens for prompt type', () => {
        const maxTokens = aiConfig.getMaxTokensForPromptType('plan_generation');
        expect(maxTokens).toBe(4000);
      });
    });

    describe('calculateCost', () => {
      it('should calculate cost correctly', () => {
        const cost = aiConfig.calculateCost('gpt-3.5-turbo', 1000);
        expect(cost).toBe(0.002);
      });
    });

    describe('recommendModel', () => {
      it('should recommend model based on requirements', () => {
        const model = aiConfig.recommendModel('plan_generation', {
          maxTokens: 2000,
          temperature: 0.7,
          speed: 'balanced',
        });
        expect(model).toBe('gpt-3.5-turbo');
      });
    });
  });

  describe('Prompt Registry', () => {
    describe('getPrompt', () => {
      it('should get prompt by type', async () => {
        const prompt = await promptRegistry.getPrompt('plan_generation', {
          studentName: 'Test Student',
          grade: 11,
          subjects: ['Mathematics'],
          goals: ['Learn algebra'],
        });

        expect(prompt).toContain('Test Student');
        expect(prompt).toContain('Mathematics');
        expect(prompt).toContain('Learn algebra');
      });

      it('should handle cache hits', async () => {
        // Setup cache hit
        mockRedisUtils.setupCacheHit('prompt:plan_generation:test-key', 'Cached prompt');

        const prompt = await promptRegistry.getPrompt('plan_generation', {
          studentName: 'Test Student',
        });

        expect(prompt).toBe('Cached prompt');
      });

      it('should handle non-existent prompt type', async () => {
        await expect(
          promptRegistry.getPrompt('non-existent-type', {})
        ).rejects.toThrow();
      });
    });

    describe('registerPrompt', () => {
      it('should register new prompt', () => {
        const template = {
          id: 'test-prompt',
          name: 'Test Prompt',
          version: '1.0.0',
          type: 'test',
          template: 'Test template with {{variable}}',
          variables: ['variable'],
          description: 'Test description',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        promptRegistry.registerPrompt(template);

        const retrieved = promptRegistry.getTemplate('test-prompt');
        expect(retrieved).toEqual(template);
      });
    });

    describe('getTemplatesByType', () => {
      it('should get templates by type', () => {
        const templates = promptRegistry.getTemplatesByType('plan_generation');
        expect(templates).toBeInstanceOf(Array);
        expect(templates.length).toBeGreaterThan(0);
      });
    });

    describe('searchTemplates', () => {
      it('should search templates', () => {
        const results = promptRegistry.searchTemplates({
          type: 'plan_generation',
          tags: ['planning'],
        });
        expect(results).toBeInstanceOf(Array);
      });
    });

    describe('getTemplateStats', () => {
      it('should get template statistics', () => {
        const stats = promptRegistry.getTemplateStats();
        expect(stats).toHaveProperty('totalTemplates');
        expect(stats).toHaveProperty('templatesByType');
        expect(stats).toHaveProperty('templatesByVersion');
        expect(stats).toHaveProperty('averageVariables');
      });
    });

    describe('validateTemplate', () => {
      it('should validate template', () => {
        const template = {
          id: 'test-prompt',
          name: 'Test Prompt',
          version: '1.0.0',
          type: 'test',
          template: 'Test template with {{variable}}',
          variables: ['variable'],
          description: 'Test description',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const validation = promptRegistry.validateTemplate(template);
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('errors');
        expect(validation).toHaveProperty('warnings');
        expect(validation.isValid).toBe(true);
      });
    });
  });

  describe('AI Logger Service', () => {
    describe('logAIRequest', () => {
      it('should log AI request', async () => {
        const logEntry = {
          requestId: 'test-request-1',
          userId: userId,
          promptType: 'plan_generation',
          model: 'gpt-3.5-turbo',
          prompt: 'Generate a study plan',
          response: 'AI generated response',
          usage: {
            promptTokens: 50,
            completionTokens: 200,
            totalTokens: 250,
          },
          duration: 1500,
          success: true,
          timestamp: new Date(),
        };

        await aiLogger.logAIRequest(logEntry);

        const logged = await prisma.aiRequestLog.findUnique({
          where: { requestId: logEntry.requestId },
        });

        expect(logged).toBeTruthy();
        expect(logged.userId).toBe(userId);
        expect(logged.promptType).toBe('plan_generation');
        expect(logged.model).toBe('gpt-3.5-turbo');
        expect(logged.success).toBe(true);
      });
    });

    describe('logAIError', () => {
      it('should log AI error', async () => {
        await aiLogger.logAIError(
          'test-error-1',
          userId,
          'plan_generation',
          'gpt-3.5-turbo',
          'Rate limit exceeded',
          500
        );

        const logged = await prisma.aiRequestLog.findUnique({
          where: { requestId: 'test-error-1' },
        });

        expect(logged).toBeTruthy();
        expect(logged.success).toBe(false);
        expect(logged.error).toBe('Rate limit exceeded');
      });
    });

    describe('getUsageStats', () => {
      it('should get usage statistics', async () => {
        // Create test AI request logs
        await prisma.aiRequestLog.createMany({
          data: [
            {
              requestId: 'test-1',
              userId: userId,
              promptType: 'plan_generation',
              model: 'gpt-3.5-turbo',
              prompt: 'Test prompt 1',
              response: 'Test response 1',
              promptTokens: 50,
              completionTokens: 200,
              totalTokens: 250,
              duration: 1500,
              success: true,
              timestamp: new Date(),
            },
            {
              requestId: 'test-2',
              userId: userId,
              promptType: 'content_generation',
              model: 'gpt-4',
              prompt: 'Test prompt 2',
              response: 'Test response 2',
              promptTokens: 30,
              completionTokens: 150,
              totalTokens: 180,
              duration: 2000,
              success: true,
              timestamp: new Date(),
            },
          ],
        });

        const stats = await aiLogger.getUsageStats(userId);

        expect(stats).toHaveProperty('totalRequests');
        expect(stats).toHaveProperty('totalTokens');
        expect(stats).toHaveProperty('averageResponseTime');
        expect(stats).toHaveProperty('successRate');
        expect(stats).toHaveProperty('costEstimate');
        expect(stats).toHaveProperty('topModels');
        expect(stats).toHaveProperty('topPromptTypes');
        expect(stats.totalRequests).toBe(2);
        expect(stats.totalTokens).toBe(430);
      });
    });

    describe('analyzeModelPerformance', () => {
      it('should analyze model performance', async () => {
        // Create test AI request logs
        await prisma.aiRequestLog.createMany({
          data: [
            {
              requestId: 'test-1',
              userId: userId,
              promptType: 'plan_generation',
              model: 'gpt-3.5-turbo',
              prompt: 'Test prompt 1',
              response: 'Test response 1',
              promptTokens: 50,
              completionTokens: 200,
              totalTokens: 250,
              duration: 1500,
              success: true,
              timestamp: new Date(),
            },
            {
              requestId: 'test-2',
              userId: userId,
              promptType: 'plan_generation',
              model: 'gpt-3.5-turbo',
              prompt: 'Test prompt 2',
              response: 'Test response 2',
              promptTokens: 30,
              completionTokens: 150,
              totalTokens: 180,
              duration: 2000,
              success: false,
              timestamp: new Date(),
            },
          ],
        });

        const performance = await aiLogger.analyzeModelPerformance('gpt-3.5-turbo');

        expect(performance).toHaveProperty('model');
        expect(performance).toHaveProperty('totalRequests');
        expect(performance).toHaveProperty('successRate');
        expect(performance).toHaveProperty('averageResponseTime');
        expect(performance).toHaveProperty('averageTokens');
        expect(performance).toHaveProperty('costEstimate');
        expect(performance).toHaveProperty('errorRate');
        expect(performance.model).toBe('gpt-3.5-turbo');
        expect(performance.totalRequests).toBe(2);
      });
    });

    describe('analyzeUserUsage', () => {
      it('should analyze user usage', async () => {
        // Create test AI request logs
        await prisma.aiRequestLog.createMany({
          data: [
            {
              requestId: 'test-1',
              userId: userId,
              promptType: 'plan_generation',
              model: 'gpt-3.5-turbo',
              prompt: 'Test prompt 1',
              response: 'Test response 1',
              promptTokens: 50,
              completionTokens: 200,
              totalTokens: 250,
              duration: 1500,
              success: true,
              timestamp: new Date(),
            },
            {
              requestId: 'test-2',
              userId: userId,
              promptType: 'content_generation',
              model: 'gpt-4',
              prompt: 'Test prompt 2',
              response: 'Test response 2',
              promptTokens: 30,
              completionTokens: 150,
              totalTokens: 180,
              duration: 2000,
              success: true,
              timestamp: new Date(),
            },
          ],
        });

        const usage = await aiLogger.analyzeUserUsage(userId);

        expect(usage).toHaveProperty('userId');
        expect(usage).toHaveProperty('totalRequests');
        expect(usage).toHaveProperty('totalTokens');
        expect(usage).toHaveProperty('averageResponseTime');
        expect(usage).toHaveProperty('successRate');
        expect(usage).toHaveProperty('costEstimate');
        expect(usage).toHaveProperty('mostUsedModel');
        expect(usage).toHaveProperty('mostUsedPromptType');
        expect(usage).toHaveProperty('usagePattern');
        expect(usage.userId).toBe(userId);
        expect(usage.totalRequests).toBe(2);
      });
    });

    describe('generateUsageReport', () => {
      it('should generate usage report', async () => {
        // Create test AI request logs
        await prisma.aiRequestLog.createMany({
          data: [
            {
              requestId: 'test-1',
              userId: userId,
              promptType: 'plan_generation',
              model: 'gpt-3.5-turbo',
              prompt: 'Test prompt 1',
              response: 'Test response 1',
              promptTokens: 50,
              completionTokens: 200,
              totalTokens: 250,
              duration: 1500,
              success: true,
              timestamp: new Date(),
            },
          ],
        });

        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
        const endDate = new Date();

        const report = await aiLogger.generateUsageReport(startDate, endDate);

        expect(report).toHaveProperty('period');
        expect(report).toHaveProperty('totalRequests');
        expect(report).toHaveProperty('totalTokens');
        expect(report).toHaveProperty('totalCost');
        expect(report).toHaveProperty('successRate');
        expect(report).toHaveProperty('topModels');
        expect(report).toHaveProperty('topPromptTypes');
        expect(report).toHaveProperty('dailyUsage');
        expect(report.totalRequests).toBe(1);
      });
    });

    describe('cleanupOldLogs', () => {
      it('should cleanup old logs', async () => {
        // Create old test AI request log
        await prisma.aiRequestLog.create({
          data: {
            requestId: 'old-test-1',
            userId: userId,
            promptType: 'plan_generation',
            model: 'gpt-3.5-turbo',
            prompt: 'Old test prompt',
            response: 'Old test response',
            promptTokens: 50,
            completionTokens: 200,
            totalTokens: 250,
            duration: 1500,
            success: true,
            timestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
          },
        });

        const deletedCount = await aiLogger.cleanupOldLogs(30); // Keep 30 days

        expect(deletedCount).toBe(1);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('AI Service with Prompt Registry', () => {
      it('should work together seamlessly', async () => {
        const context = {
          studentName: 'Test Student',
          grade: 11,
          subjects: ['Mathematics'],
          goals: ['Learn algebra'],
        };

        const response = await aiService.generateWithPrompt(
          'plan_generation_advanced',
          context
        );

        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('usage');
        expect(response).toHaveProperty('model');
        expect(response).toHaveProperty('requestId');
        expect(response).toHaveProperty('timestamp');
      });
    });

    describe('AI Service with Logger', () => {
      it('should log requests automatically', async () => {
        const aiRequest = {
          prompt: 'Generate a study plan',
          userId: userId,
        };

        const response = await aiService.generateContent(aiRequest);

        // Check if request was logged
        const logged = await prisma.aiRequestLog.findFirst({
          where: { userId: userId },
        });

        expect(logged).toBeTruthy();
        expect(logged.prompt).toBe(aiRequest.prompt);
        expect(logged.success).toBe(true);
      });
    });

    describe('AI Service with Config', () => {
      it('should use config settings', async () => {
        const aiRequest = {
          prompt: 'Generate content',
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 1000,
        };

        const response = await aiService.generateContent(aiRequest);

        expect(response.model).toBe('gpt-4');
        expect(response.usage.totalTokens).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe('Error Handling', () => {
    describe('OpenAI API Errors', () => {
      it('should handle rate limit errors', async () => {
        mockOpenAIUtils.setErrorResponse({
          status: 429,
          error: { message: 'Rate limit exceeded', type: 'rate_limit_exceeded' },
        });

        const aiRequest = {
          prompt: 'Generate content',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow();
      });

      it('should handle quota exceeded errors', async () => {
        mockOpenAIUtils.setErrorResponse({
          status: 429,
          error: { message: 'Quota exceeded', type: 'insufficient_quota' },
        });

        const aiRequest = {
          prompt: 'Generate content',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow();
      });

      it('should handle invalid API key errors', async () => {
        mockOpenAIUtils.setErrorResponse({
          status: 401,
          error: { message: 'Invalid API key', type: 'invalid_request_error' },
        });

        const aiRequest = {
          prompt: 'Generate content',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow();
      });

      it('should handle context length exceeded errors', async () => {
        mockOpenAIUtils.setErrorResponse({
          status: 400,
          error: { message: 'Context length exceeded', type: 'invalid_request_error' },
        });

        const aiRequest = {
          prompt: 'Generate content',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow();
      });
    });

    describe('Network Errors', () => {
      it('should handle timeout errors', async () => {
        mockOpenAIUtils.setDelayResponse(30000); // 30 seconds

        const aiRequest = {
          prompt: 'Generate content',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow();
      });

      it('should handle network errors', async () => {
        mockOpenAIUtils.setErrorResponse({
          status: 500,
          error: { message: 'Internal server error' },
        });

        const aiRequest = {
          prompt: 'Generate content',
        };

        await expect(aiService.generateContent(aiRequest)).rejects.toThrow();
      });
    });

    describe('Validation Errors', () => {
      it('should handle invalid prompt types', async () => {
        await expect(
          aiService.generateWithPrompt('invalid-prompt-type', {})
        ).rejects.toThrow();
      });

      it('should handle missing required context', async () => {
        await expect(
          aiService.generateWithPrompt('plan_generation_advanced', {})
        ).rejects.toThrow();
      });
    });
  });

  describe('Performance Tests', () => {
    describe('Response Time', () => {
      it('should respond within acceptable time', async () => {
        const startTime = Date.now();
        
        const aiRequest = {
          prompt: 'Generate a study plan',
        };

        await aiService.generateContent(aiRequest);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(5000); // 5 seconds
      });
    });

    describe('Concurrent Requests', () => {
      it('should handle concurrent requests', async () => {
        const requests = Array.from({ length: 5 }, (_, i) => ({
          prompt: `Generate content ${i}`,
          userId: userId,
        }));

        const responses = await Promise.all(
          requests.map(request => aiService.generateContent(request))
        );

        expect(responses).toHaveLength(5);
        responses.forEach(response => {
          expect(response).toHaveProperty('content');
          expect(response).toHaveProperty('usage');
        });
      });
    });

    describe('Memory Usage', () => {
      it('should not leak memory', async () => {
        const initialMemory = process.memoryUsage();
        
        // Make multiple requests
        for (let i = 0; i < 10; i++) {
          await aiService.generateContent({
            prompt: `Generate content ${i}`,
          });
        }
        
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      });
    });
  });
});
