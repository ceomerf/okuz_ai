import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

describe('PlanningController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    await app.init();

    // Create test user and generate auth token
    const testUser = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'STUDENT',
      },
    });

    authToken = jwtService.sign({ 
      sub: testUser.id, 
      email: testUser.email,
      role: testUser.role 
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prismaService.user.deleteMany({
      where: { email: 'test@example.com' },
    });
    await app.close();
  });

  describe('/planning/generate-plan (POST)', () => {
    it('should generate a plan successfully', () => {
      const planData = {
        mode: 'ai',
        planDurationWeeks: 4,
        planFocus: 'YKS hazırlık',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1'],
      };

      return request(app.getHttpServer())
        .post('/planning/generate-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(planData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('jobId');
        });
    });

    it('should return 401 without auth token', () => {
      const planData = {
        mode: 'ai',
        planDurationWeeks: 4,
        planFocus: 'YKS hazırlık',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1'],
      };

      return request(app.getHttpServer())
        .post('/planning/generate-plan')
        .send(planData)
        .expect(401);
    });
  });

  describe('/planning/user-plans (GET)', () => {
    it('should return user plans', () => {
      return request(app.getHttpServer())
        .get('/planning/user-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});