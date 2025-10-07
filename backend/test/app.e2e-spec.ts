import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CacheService } from '../src/common/cache/cache.service';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('App E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let cacheService: CacheService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        plan: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        studySession: {
          create: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn(),
        $queryRaw: jest.fn(),
      })
      .overrideProvider(CacheService)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        ping: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    cacheService = moduleFixture.get<CacheService>(CacheService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check E2E', () => {
    it('should return health status', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ result: 1 }]);
      jest.spyOn(cacheService, 'ping').mockResolvedValue(true);

      const response = await app.getHttpServer().get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        services: expect.objectContaining({
          database: expect.objectContaining({
            status: 'healthy',
          }),
          cache: expect.objectContaining({
            status: 'healthy',
          }),
        }),
      }));
    });

    it('should return readiness status', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ result: 1 }]);
      jest.spyOn(cacheService, 'ping').mockResolvedValue(true);

      const response = await app.getHttpServer().get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'ready',
        services: expect.objectContaining({
          database: { status: 'ready' },
          cache: { status: 'ready' },
        }),
      }));
    });

    it('should return liveness status', async () => {
      const response = await app.getHttpServer().get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'alive',
        uptime: expect.any(Number),
      }));
    });
  });

  describe('Authentication E2E', () => {
    it('should register new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'STUDENT',
        grade: 12,
        learningStyle: 'VISUAL',
      };

      const mockUser = {
        id: 'user123',
        email: userData.email,
        name: userData.name,
        role: userData.role,
        grade: userData.grade,
        learningStyle: userData.learningStyle,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtService, 'sign').mockReturnValue('access-token-123');

      const response = await app.getHttpServer()
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({
        user: expect.objectContaining({
          id: 'user123',
          email: userData.email,
          name: userData.name,
          role: userData.role,
        }),
        tokens: expect.objectContaining({
          accessToken: 'access-token-123',
        }),
      }));
    });

    it('should login existing user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user123',
        email: loginData.email,
        name: 'Test User',
        role: 'STUDENT',
        password: '$2b$10$hashedpassword',
        isActive: true,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(jwtService, 'sign').mockReturnValue('access-token-123');

      const response = await app.getHttpServer()
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        user: expect.objectContaining({
          id: 'user123',
          email: loginData.email,
          name: 'Test User',
          role: 'STUDENT',
        }),
        tokens: expect.objectContaining({
          accessToken: 'access-token-123',
        }),
      }));
    });

    it('should handle login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user123',
        email: loginData.email,
        password: '$2b$10$hashedpassword',
        isActive: true,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const response = await app.getHttpServer()
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toEqual(expect.objectContaining({
        message: 'Invalid credentials',
      }));
    });
  });

  describe('Planning E2E', () => {
    let accessToken: string;

    beforeEach(() => {
      accessToken = 'valid-access-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({ userId: 'user123', email: 'test@example.com' });
    });

    it('should generate study plan', async () => {
      const planRequest = {
        subjects: ['Mathematics', 'Physics'],
        duration: 30,
        difficulty: 'MEDIUM',
        learningStyle: 'VISUAL',
        availableTime: 120,
      };

      const mockPlan = {
        id: 'plan123',
        userId: 'user123',
        title: '30-Day Study Plan',
        subjects: planRequest.subjects,
        duration: planRequest.duration,
        difficulty: planRequest.difficulty,
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        grade: 12,
        learningStyle: 'VISUAL',
      } as any);
      jest.spyOn(prismaService.plan, 'create').mockResolvedValue(mockPlan as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const response = await app.getHttpServer()
        .post('/planning/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(planRequest);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({
        id: 'plan123',
        userId: 'user123',
        title: '30-Day Study Plan',
        subjects: planRequest.subjects,
        duration: planRequest.duration,
        difficulty: planRequest.difficulty,
        status: 'ACTIVE',
      }));
    });

    it('should get user plans', async () => {
      const mockPlans = [
        {
          id: 'plan1',
          userId: 'user123',
          title: 'Math Plan',
          subjects: ['Mathematics'],
          status: 'ACTIVE',
          progress: 0.3,
          createdAt: new Date(),
        },
        {
          id: 'plan2',
          userId: 'user123',
          title: 'Physics Plan',
          subjects: ['Physics'],
          status: 'COMPLETED',
          progress: 1.0,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.plan, 'findMany').mockResolvedValue(mockPlans as any);

      const response = await app.getHttpServer()
        .get('/planning/plans')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'plan1',
          title: 'Math Plan',
          subjects: ['Mathematics'],
          status: 'ACTIVE',
        }),
        expect.objectContaining({
          id: 'plan2',
          title: 'Physics Plan',
          subjects: ['Physics'],
          status: 'COMPLETED',
        }),
      ]));
    });

    it('should update plan progress', async () => {
      const planId = 'plan123';
      const progressData = {
        sessionData: {
          subject: 'Mathematics',
          topic: 'Algebra',
          duration: 60,
          completed: true,
          score: 85,
        },
      };

      const mockUpdatedPlan = {
        id: planId,
        progress: 0.5,
        completedSessions: 5,
        totalSessions: 10,
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.plan, 'findUnique').mockResolvedValue({ id: planId } as any);
      jest.spyOn(prismaService.studySession, 'create').mockResolvedValue({} as any);
      jest.spyOn(prismaService.plan, 'update').mockResolvedValue(mockUpdatedPlan as any);
      jest.spyOn(cacheService, 'delete').mockResolvedValue();

      const response = await app.getHttpServer()
        .put(`/planning/plans/${planId}/progress`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(progressData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        id: planId,
        progress: 0.5,
        completedSessions: 5,
        totalSessions: 10,
      }));
    });
  });

  describe('Analytics E2E', () => {
    let accessToken: string;

    beforeEach(() => {
      accessToken = 'valid-access-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({ userId: 'user123', email: 'test@example.com' });
    });

    it('should get user analytics', async () => {
      const mockAnalytics = {
        totalStudyTime: 3600,
        completedSessions: 15,
        averageScore: 85.5,
        subjects: {
          Mathematics: { time: 1800, sessions: 8, averageScore: 88 },
          Physics: { time: 1800, sessions: 7, averageScore: 83 },
        },
        weeklyProgress: [
          { week: 1, time: 600, sessions: 3 },
          { week: 2, time: 720, sessions: 4 },
          { week: 3, time: 840, sessions: 5 },
        ],
      };

      jest.spyOn(prismaService.studySession, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(mockAnalytics));

      const response = await app.getHttpServer()
        .get('/analytics/user')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        totalStudyTime: 3600,
        completedSessions: 15,
        averageScore: 85.5,
        subjects: expect.objectContaining({
          Mathematics: expect.objectContaining({
            time: 1800,
            sessions: 8,
            averageScore: 88,
          }),
        }),
      }));
    });

    it('should get study patterns', async () => {
      const mockPatterns = {
        optimalStudyTime: 'morning',
        preferredSubjects: ['Mathematics', 'Physics'],
        averageSessionLength: 60,
        effectivenessScore: 0.85,
        recommendations: [
          'Study Mathematics in the morning',
          'Take breaks every 45 minutes',
        ],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(JSON.stringify(mockPatterns));

      const response = await app.getHttpServer()
        .get('/analytics/patterns')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        optimalStudyTime: 'morning',
        preferredSubjects: ['Mathematics', 'Physics'],
        averageSessionLength: 60,
        effectivenessScore: 0.85,
        recommendations: expect.arrayContaining([
          'Study Mathematics in the morning',
          'Take breaks every 45 minutes',
        ]),
      }));
    });
  });

  describe('Smart Tools E2E', () => {
    let accessToken: string;

    beforeEach(() => {
      accessToken = 'valid-access-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({ userId: 'user123', email: 'test@example.com' });
    });

    it('should handle quick chat', async () => {
      const chatData = {
        message: 'What is the derivative of x^2?',
        context: 'mathematics',
      };

      const mockResponse = {
        id: 'chat123',
        userId: 'user123',
        message: chatData.message,
        response: 'The derivative of x^2 is 2x.',
        context: chatData.context,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.quickChat, 'create').mockResolvedValue(mockResponse as any);

      const response = await app.getHttpServer()
        .post('/smart-tools/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(chatData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({
        id: 'chat123',
        message: chatData.message,
        response: 'The derivative of x^2 is 2x.',
        context: chatData.context,
      }));
    });

    it('should generate summary', async () => {
      const summaryData = {
        content: 'Long text content to summarize...',
        type: 'study_notes',
        length: 'medium',
      };

      const mockSummary = {
        id: 'summary123',
        userId: 'user123',
        originalContent: summaryData.content,
        summary: 'Summarized content...',
        type: summaryData.type,
        length: summaryData.length,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.summaryGenerator, 'create').mockResolvedValue(mockSummary as any);

      const response = await app.getHttpServer()
        .post('/smart-tools/summary')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(summaryData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({
        id: 'summary123',
        originalContent: summaryData.content,
        summary: 'Summarized content...',
        type: summaryData.type,
        length: summaryData.length,
      }));
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle 404 errors', async () => {
      const response = await app.getHttpServer().get('/non-existent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({
        message: 'Not Found',
      }));
    });

    it('should handle 401 errors for protected routes', async () => {
      const response = await app.getHttpServer()
        .get('/planning/plans')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual(expect.objectContaining({
        message: 'Unauthorized',
      }));
    });

    it('should handle 400 errors for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
      };

      const response = await app.getHttpServer()
        .post('/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual(expect.objectContaining({
        message: expect.any(String),
      }));
    });
  });
});