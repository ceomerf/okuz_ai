import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../src/common/prisma/prisma.module';
import { AuthModule } from '../../src/auth/auth.module';
import { AuthService } from '../../src/auth/auth.service';
import { AuthController } from '../../src/auth/auth.controller';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { TestDatabaseSetup } from '../database/test-db.setup';
import { testUsers, testDataGenerators } from '../fixtures/test-data';
import { mockRedisService } from '../mocks/redis.mock';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let authService: AuthService;
  let prisma: PrismaService;
  let cache: CacheService;
  let testDb: TestDatabaseSetup;

  beforeAll(async () => {
    // Initialize test database
    testDb = new TestDatabaseSetup();
    await testDb.initialize();
    prisma = testDb.getPrisma();

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
            limit: 5,
          },
        ]),
        CacheModule.register({
          isGlobal: true,
          ttl: 300,
        }),
        PrismaModule,
        AuthModule,
      ],
      providers: [
        {
          provide: CacheService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    cache = moduleFixture.get<CacheService>(CacheService);

    // Setup global pipes and guards
    app.useGlobalGuards(new JwtAuthGuard());
    
    await app.init();
  });

  afterAll(async () => {
    await testDb.cleanup();
    await app.close();
  });

  beforeEach(async () => {
    // Clear test data
    await prisma.user.deleteMany();
    await prisma.aiRequestLog.deleteMany();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'testpassword123',
        name: 'New User',
        role: 'STUDENT',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.role).toBe(userData.role);
    });

    it('should fail to register with existing email', async () => {
      // Create existing user
      const existingUser = testDataGenerators.generateUser();
      await prisma.user.create({ data: existingUser });

      const userData = {
        email: existingUser.email,
        password: 'testpassword123',
        name: 'Another User',
        role: 'STUDENT',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(409);
    });

    it('should fail to register with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'testpassword123',
        name: 'Test User',
        role: 'STUDENT',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should fail to register with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
        role: 'STUDENT',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should fail to register with missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing password, name, role
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      const testUser = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: testUser });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should fail to login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'testpassword123',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should fail to login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should fail to login with missing credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        // Missing password
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;
    let user: any;

    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: user });

      // Get refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        });
      
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.access_token).not.toBe(refreshToken);
    });

    it('should fail to refresh with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should fail to refresh with expired refresh token', async () => {
      // Mock expired token
      const expiredToken = 'expired-refresh-token';
      
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let user: any;

    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: user });

      // Get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        });
      
      accessToken = loginResponse.body.access_token;
    });

    it('should logout successfully with valid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should fail to logout without token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });

    it('should fail to logout with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /auth/profile', () => {
    let accessToken: string;
    let user: any;

    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: user });

      // Get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        });
      
      accessToken = loginResponse.body.access_token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('role');
      expect(response.body.email).toBe(user.email);
      expect(response.body.name).toBe(user.name);
      expect(response.body.role).toBe(user.role);
    });

    it('should fail to get profile without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should fail to get profile with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PUT /auth/profile', () => {
    let accessToken: string;
    let user: any;

    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: user });

      // Get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        });
      
      accessToken = loginResponse.body.access_token;
    });

    it('should update user profile with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const response = await request(app.getHttpServer())
        .put('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
    });

    it('should fail to update profile with invalid email', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .put('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should fail to update profile without token', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put('/auth/profile')
        .send(updateData)
        .expect(401);
    });
  });

  describe('POST /auth/change-password', () => {
    let accessToken: string;
    let user: any;

    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      user = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: user });

      // Get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        });
      
      accessToken = loginResponse.body.access_token;
    });

    it('should change password with valid current password', async () => {
      const changePasswordData = {
        currentPassword: 'testpassword123',
        newPassword: 'newpassword123',
      };

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(200);
    });

    it('should fail to change password with invalid current password', async () => {
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(401);
    });

    it('should fail to change password with weak new password', async () => {
      const changePasswordData = {
        currentPassword: 'testpassword123',
        newPassword: '123',
      };

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changePasswordData)
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      const user = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: user });

      // Make multiple login attempts
      for (let i = 0; i < 6; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword', // Wrong password to trigger rate limiting
          });
        
        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429); // Rate limit exceeded
        }
      }
    });

    it('should apply rate limiting to register endpoint', async () => {
      // Make multiple registration attempts
      for (let i = 0; i < 6; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test${i}@example.com`,
            password: 'testpassword123',
            name: 'Test User',
            role: 'STUDENT',
          });
        
        if (i < 5) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(429); // Rate limit exceeded
        }
      }
    });
  });

  describe('Security Tests', () => {
    it('should not expose password in responses', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
        role: 'STUDENT',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should hash passwords before storing', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
        role: 'STUDENT',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2b\$/); // bcrypt hash format
    });

    it('should validate JWT tokens properly', async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('testpassword123', 10);
      const user = testDataGenerators.generateUser({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'STUDENT',
      });
      await prisma.user.create({ data: user });

      // Get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123',
        });
      
      const accessToken = loginResponse.body.access_token;

      // Test protected endpoint
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(user.email);
    });
  });
});
