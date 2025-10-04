import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Planning Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test'],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.refreshToken.deleteMany();
    await prismaService.user.deleteMany();
    await prismaService.plan.deleteMany();

    // Create a test user
    const userData = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
      accountType: 'STUDENT'
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData);

    accessToken = registerResponse.body.access_token;
    userId = registerResponse.body.user.id;
  });

  describe('POST /planning/generate', () => {
    it('should generate a basic plan successfully', async () => {
      const planData = {
        mode: 'BASIC',
        planDurationWeeks: 4,
        planFocus: 'YKS hazırlık',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1']
      };

      const response = await request(app.getHttpServer())
        .post('/planning/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(planData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('plan');
      expect(response.body.plan).toHaveProperty('id');
    });

    it('should generate an AI plan successfully', async () => {
      const planData = {
        mode: 'AI',
        planDurationWeeks: 4,
        planFocus: 'YKS hazırlık',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1']
      };

      const response = await request(app.getHttpServer())
        .post('/planning/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(planData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('plan');
    });

    it('should reject plan generation without authentication', async () => {
      const planData = {
        mode: 'BASIC',
        planDurationWeeks: 4,
        planFocus: 'YKS hazırlık',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1']
      };

      await request(app.getHttpServer())
        .post('/planning/generate')
        .send(planData)
        .expect(401);
    });

    it('should reject plan generation with invalid data', async () => {
      const invalidPlanData = {
        mode: 'INVALID',
        planDurationWeeks: -1,
        subjects: [],
        goals: []
      };

      await request(app.getHttpServer())
        .post('/planning/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidPlanData)
        .expect(400);
    });
  });

  describe('GET /planning/plans', () => {
    beforeEach(async () => {
      // Create a test plan
      await prismaService.plan.create({
        data: {
          title: 'Test Plan',
          description: 'Test Description',
          type: 'basic',
          subjects: ['Matematik', 'Fizik'],
          goals: ['Hedef 1'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000),
          isActive: true,
          userId: userId
        }
      });
    });

    it('should get user plans successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/planning/plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans')
        .expect(401);
    });
  });

  describe('GET /planning/plans/:id', () => {
    let planId: string;

    beforeEach(async () => {
      // Create a test plan
      const plan = await prismaService.plan.create({
        data: {
          title: 'Test Plan',
          description: 'Test Description',
          type: 'basic',
          subjects: ['Matematik', 'Fizik'],
          goals: ['Hedef 1'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000),
          isActive: true,
          userId: userId
        }
      });
      planId = plan.id;
    });

    it('should get specific plan successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', planId);
      expect(response.body).toHaveProperty('title', 'Test Plan');
    });

    it('should reject request for non-existent plan', async () => {
      await request(app.getHttpServer())
        .get('/planning/plans/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/planning/plans/${planId}`)
        .expect(401);
    });
  });

  describe('PUT /planning/plans/:id', () => {
    let planId: string;

    beforeEach(async () => {
      // Create a test plan
      const plan = await prismaService.plan.create({
        data: {
          title: 'Test Plan',
          description: 'Test Description',
          type: 'basic',
          subjects: ['Matematik', 'Fizik'],
          goals: ['Hedef 1'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000),
          isActive: true,
          userId: userId
        }
      });
      planId = plan.id;
    });

    it('should update plan successfully', async () => {
      const updateData = {
        title: 'Updated Plan',
        description: 'Updated Description'
      };

      const response = await request(app.getHttpServer())
        .put(`/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', planId);
      expect(response.body).toHaveProperty('title', 'Updated Plan');
    });

    it('should reject update for non-existent plan', async () => {
      const updateData = {
        title: 'Updated Plan',
        description: 'Updated Description'
      };

      await request(app.getHttpServer())
        .put('/planning/plans/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /planning/plans/:id', () => {
    let planId: string;

    beforeEach(async () => {
      // Create a test plan
      const plan = await prismaService.plan.create({
        data: {
          title: 'Test Plan',
          description: 'Test Description',
          type: 'basic',
          subjects: ['Matematik', 'Fizik'],
          goals: ['Hedef 1'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000),
          isActive: true,
          userId: userId
        }
      });
      planId = plan.id;
    });

    it('should delete plan successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify plan is deleted
      const response = await request(app.getHttpServer())
        .get(`/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject deletion of non-existent plan', async () => {
      await request(app.getHttpServer())
        .delete('/planning/plans/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
