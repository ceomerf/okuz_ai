import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../src/common/prisma/prisma.module';
import { AuthModule } from '../../src/auth/auth.module';
import { PlanningModule } from '../../src/planning/planning.module';
import { PlanningController } from '../../src/planning/planning.controller';
import { PlanningFacade } from '../../src/planning/planning-facade.service';
import { PlanGenerationService } from '../../src/planning/services/plan-generation.service';
import { PlanValidationService } from '../../src/planning/services/plan-validation.service';
import { PlanOptimizationService } from '../../src/planning/services/plan-optimization.service';
import { PlanPersistenceService } from '../../src/planning/services/plan-persistence.service';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { TestDatabaseSetup } from '../database/test-db.setup';
import { testUsers, testPlans, testSessions, testDataGenerators } from '../fixtures/test-data';
import { mockRedisService } from '../mocks/redis.mock';
import { openAIServer, mockOpenAIResponses } from '../mocks/openai.mock';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';

describe('Planning E2E Tests', () => {
  let app: INestApplication;
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
        PlanningModule,
      ],
      providers: [
        {
          provide: CacheService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    await prisma.studySession.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.user.deleteMany();
    await prisma.aiRequestLog.deleteMany();
    
    // Reset mocks
    jest.clearAllMocks();
    
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

  describe('POST /planning/generate-plan', () => {
    it('should generate a plan successfully', async () => {
      const planData = {
        subjects: ['Mathematics', 'Physics'],
        goals: ['Learn algebra', 'Master calculus'],
        availableTime: 120,
        learningStyle: 'Visual',
        currentLevel: 'Intermediate',
        preferences: {
          studyTimes: ['morning', 'evening'],
          difficulty: 'medium',
        },
        planDurationDays: 30,
        planType: 'DAILY',
        targetExam: 'YKS',
      };

      const response = await request(app.getHttpServer())
        .post('/planning/generate-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(planData)
        .expect(201);

      expect(response.body).toHaveProperty('plan');
      expect(response.body).toHaveProperty('sessions');
      expect(response.body.plan).toHaveProperty('title');
      expect(response.body.plan).toHaveProperty('description');
      expect(response.body.plan).toHaveProperty('subjects');
      expect(response.body.plan).toHaveProperty('goals');
      expect(response.body.sessions).toBeInstanceOf(Array);
    });

    it('should fail to generate plan without authentication', async () => {
      const planData = {
        subjects: ['Mathematics'],
        goals: ['Learn basics'],
        availableTime: 60,
      };

      await request(app.getHttpServer())
        .post('/planning/generate-plan')
        .send(planData)
        .expect(401);
    });

    it('should fail to generate plan with invalid data', async () => {
      const planData = {
        subjects: [], // Empty subjects
        goals: [], // Empty goals
        availableTime: -10, // Negative time
      };

      await request(app.getHttpServer())
        .post('/planning/generate-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(planData)
        .expect(400);
    });

    it('should fail to generate plan with missing required fields', async () => {
      const planData = {
        subjects: ['Mathematics'],
        // Missing goals and availableTime
      };

      await request(app.getHttpServer())
        .post('/planning/generate-plan')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(planData)
        .expect(400);
    });
  });

  describe('GET /planning/plans', () => {
    beforeEach(async () => {
      // Create test plans
      const plan1 = testDataGenerators.generatePlan(userId, {
        title: 'Math Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const plan2 = testDataGenerators.generatePlan(userId, {
        title: 'Science Plan',
        subjects: ['Physics', 'Chemistry'],
        goals: ['Master concepts'],
        isActive: false,
      });
      
      await prisma.plan.createMany({
        data: [plan1, plan2],
      });
    });

    it('should get user plans successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('subjects');
      expect(response.body[0]).toHaveProperty('goals');
    });

    it('should get only active plans when includeInactive is false', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/plans?includeInactive=false')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].isActive).toBe(true);
    });

    it('should get all plans when includeInactive is true', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/plans?includeInactive=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
    });

    it('should apply pagination correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/plans?limit=1&offset=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
    });

    it('should fail to get plans without authentication', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans')
        .expect(401);
    });
  });

  describe('GET /planning/plans/:planId', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should get specific plan successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', planId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('subjects');
      expect(response.body).toHaveProperty('goals');
    });

    it('should fail to get non-existent plan', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to get plan without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/planning/plans/${planId}`)
        .expect(401);
    });
  });

  describe('PUT /planning/plans/:planId', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should update plan successfully', async () => {
      const updateData = {
        title: 'Updated Plan',
        description: 'Updated description',
        subjects: ['Mathematics', 'Physics'],
        goals: ['Learn algebra', 'Master physics'],
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.subjects).toEqual(updateData.subjects);
      expect(response.body.goals).toEqual(updateData.goals);
      expect(response.body.isActive).toBe(updateData.isActive);
    });

    it('should fail to update non-existent plan', async () => {
      const updateData = {
        title: 'Updated Plan',
      };

      await request(app.getHttpServer())
        .put('/planning/plans/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should fail to update plan without authentication', async () => {
      const updateData = {
        title: 'Updated Plan',
      };

      await request(app.getHttpServer())
        .put(`/planning/plans/${planId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /planning/plans/:planId', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should delete plan successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify plan is deleted
      const deletedPlan = await prisma.plan.findUnique({
        where: { id: planId },
      });
      expect(deletedPlan).toBeNull();
    });

    it('should fail to delete non-existent plan', async () => {
      await request(app.getHttpServer())
        .delete('/planning/plans/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to delete plan without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/planning/plans/${planId}`)
        .expect(401);
    });
  });

  describe('POST /planning/plans/:planId/optimize', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should optimize plan successfully', async () => {
      const optimizationOptions = {
        focusOnWeakAreas: true,
        balanceSubjects: true,
        optimizeTiming: true,
        adjustDifficulty: true,
        maximizeEfficiency: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/optimize`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(optimizationOptions)
        .expect(200);

      expect(response.body).toHaveProperty('optimized');
      expect(response.body).toHaveProperty('improvements');
      expect(response.body).toHaveProperty('performanceGain');
    });

    it('should fail to optimize non-existent plan', async () => {
      const optimizationOptions = {
        focusOnWeakAreas: true,
      };

      await request(app.getHttpServer())
        .post('/planning/plans/non-existent-id/optimize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(optimizationOptions)
        .expect(404);
    });

    it('should fail to optimize plan without authentication', async () => {
      const optimizationOptions = {
        focusOnWeakAreas: true,
      };

      await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/optimize`)
        .send(optimizationOptions)
        .expect(401);
    });
  });

  describe('GET /planning/plans/:planId/validate', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should validate plan successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/validate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('suggestions');
    });

    it('should fail to validate non-existent plan', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans/non-existent-id/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to validate plan without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/validate`)
        .expect(401);
    });
  });

  describe('GET /planning/plans/:planId/statistics', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan with sessions
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;

      // Create test sessions
      const session1 = testDataGenerators.generateSession(planId, userId, {
        subject: 'Mathematics',
        topic: 'Algebra',
        isCompleted: true,
        score: 85,
      });
      const session2 = testDataGenerators.generateSession(planId, userId, {
        subject: 'Mathematics',
        topic: 'Geometry',
        isCompleted: false,
        score: null,
      });
      
      await prisma.studySession.createMany({
        data: [session1, session2],
      });
    });

    it('should get plan statistics successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/statistics`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSessions');
      expect(response.body).toHaveProperty('completedSessions');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('averageScore');
      expect(response.body).toHaveProperty('timeSpent');
    });

    it('should fail to get statistics for non-existent plan', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans/non-existent-id/statistics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to get statistics without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/statistics`)
        .expect(401);
    });
  });

  describe('POST /planning/plans/:planId/duplicate', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should duplicate plan successfully', async () => {
      const duplicateData = {
        newTitle: 'Duplicated Plan',
      };

      const response = await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/duplicate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(duplicateData.newTitle);
      expect(response.body.id).not.toBe(planId);
    });

    it('should fail to duplicate non-existent plan', async () => {
      const duplicateData = {
        newTitle: 'Duplicated Plan',
      };

      await request(app.getHttpServer())
        .post('/planning/plans/non-existent-id/duplicate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateData)
        .expect(404);
    });

    it('should fail to duplicate plan without authentication', async () => {
      const duplicateData = {
        newTitle: 'Duplicated Plan',
      };

      await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/duplicate`)
        .send(duplicateData)
        .expect(401);
    });
  });

  describe('POST /planning/plans/:planId/archive', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
        isActive: true,
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should archive plan successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('should fail to archive non-existent plan', async () => {
      await request(app.getHttpServer())
        .post('/planning/plans/non-existent-id/archive')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to archive plan without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/archive`)
        .expect(401);
    });
  });

  describe('POST /planning/plans/:planId/activate', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
        isActive: false,
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should activate plan successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });

    it('should fail to activate non-existent plan', async () => {
      await request(app.getHttpServer())
        .post('/planning/plans/non-existent-id/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to activate plan without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/planning/plans/${planId}/activate`)
        .expect(401);
    });
  });

  describe('GET /planning/plans/:planId/suggestions', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should get plan suggestions successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/suggestions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(response.body.suggestions).toBeInstanceOf(Array);
    });

    it('should fail to get suggestions for non-existent plan', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans/non-existent-id/suggestions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to get suggestions without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/suggestions`)
        .expect(401);
    });
  });

  describe('GET /planning/plans/:planId/performance', () => {
    let planId: string;

    beforeEach(async () => {
      // Create test plan
      const plan = testDataGenerators.generatePlan(userId, {
        title: 'Test Plan',
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      });
      const createdPlan = await prisma.plan.create({ data: plan });
      planId = createdPlan.id;
    });

    it('should analyze plan performance successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/performance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('recommendations');
    });

    it('should fail to analyze performance for non-existent plan', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans/non-existent-id/performance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to analyze performance without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/planning/plans/${planId}/performance`)
        .expect(401);
    });
  });

  describe('V2 Endpoints', () => {
    describe('POST /planning/v2/generate-plan', () => {
      it('should generate plan using new modular architecture', async () => {
        const planData = {
          subjects: ['Mathematics', 'Physics'],
          goals: ['Learn algebra', 'Master calculus'],
          availableTime: 120,
          learningStyle: 'Visual',
          currentLevel: 'Intermediate',
          preferences: {
            studyTimes: ['morning', 'evening'],
            difficulty: 'medium',
          },
          planDurationDays: 30,
          planType: 'DAILY',
          targetExam: 'YKS',
          optimize: true,
        };

        const response = await request(app.getHttpServer())
          .post('/planning/v2/generate-plan')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(planData)
          .expect(201);

        expect(response.body).toHaveProperty('plan');
        expect(response.body).toHaveProperty('sessions');
        expect(response.body).toHaveProperty('validation');
        expect(response.body).toHaveProperty('optimization');
        expect(response.body.validation).toHaveProperty('isValid');
        expect(response.body.optimization).toHaveProperty('optimized');
      });
    });

    describe('GET /planning/v2/plans', () => {
      it('should get user plans using new architecture', async () => {
        const response = await request(app.getHttpServer())
          .get('/planning/v2/plans')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });
    });
  });
});
