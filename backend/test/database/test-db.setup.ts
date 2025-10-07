import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/okuz_ai_test';

export class TestDatabaseSetup {
  private static prisma: PrismaClient;
  
  static async initialize(): Promise<PrismaClient> {
    if (!this.prisma) {
      console.log('🔧 Initializing test database...');
      
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: TEST_DATABASE_URL,
          },
        },
        log: ['error'],
      });
      
      await this.prisma.$connect();
      
      // Run migrations
      await this.runMigrations();
      
      // Seed test data
      await this.seedTestData();
    }
    
    return this.prisma;
  }
  
  static async cleanup(): Promise<void> {
    if (this.prisma) {
      console.log('🧹 Cleaning up test database...');
      
      // Clean up all test data
      await this.prisma.aiRequestLog.deleteMany();
      await this.prisma.aiUsageAnalytics.deleteMany();
      await this.prisma.aiPromptTemplate.deleteMany();
      await this.prisma.studySession.deleteMany();
      await this.prisma.plan.deleteMany();
      await this.prisma.user.deleteMany();
      
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }
  
  static async reset(): Promise<void> {
    if (this.prisma) {
      await this.cleanup();
      await this.initialize();
    }
  }
  
  private static async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdio: 'pipe',
      });
    } catch (error) {
      console.warn('⚠️ Migration failed, continuing with existing schema:', error.message);
    }
  }
  
  private static async seedTestData(): Promise<void> {
    try {
      console.log('🌱 Seeding test data...');
      
      // Create test users
      const testUsers = await this.createTestUsers();
      
      // Create test plans
      const testPlans = await this.createTestPlans(testUsers);
      
      // Create test sessions
      await this.createTestSessions(testPlans, testUsers);
      
      // Create test AI templates
      await this.createTestAITemplates();
      
      console.log('✅ Test data seeded successfully');
    } catch (error) {
      console.warn('⚠️ Seeding failed, continuing without seed data:', error.message);
    }
  }
  
  private static async createTestUsers() {
    const users = [
      {
        email: 'student@test.com',
        password: '$2b$10$test.hash.for.student',
        name: 'Test Student',
        role: 'STUDENT',
        isActive: true,
      },
      {
        email: 'parent@test.com',
        password: '$2b$10$test.hash.for.parent',
        name: 'Test Parent',
        role: 'PARENT',
        isActive: true,
      },
      {
        email: 'teacher@test.com',
        password: '$2b$10$test.hash.for.teacher',
        name: 'Test Teacher',
        role: 'TEACHER',
        isActive: true,
      },
    ];
    
    const createdUsers = [];
    for (const user of users) {
      try {
        const created = await this.prisma.user.create({
          data: user,
        });
        createdUsers.push(created);
      } catch (error) {
        // User might already exist
        const existing = await this.prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existing) {
          createdUsers.push(existing);
        }
      }
    }
    
    return createdUsers;
  }
  
  private static async createTestPlans(users: any[]) {
    const student = users.find(u => u.role === 'STUDENT');
    if (!student) return [];
    
    const plans = [
      {
        userId: student.id,
        title: 'Test Math Plan',
        description: 'Test plan for mathematics',
        subjects: ['Mathematics', 'Physics'],
        goals: ['Learn algebra', 'Master calculus'],
        planType: 'DAILY',
        isActive: true,
        totalSessions: 10,
        duration: 7,
      },
      {
        userId: student.id,
        title: 'Test Science Plan',
        description: 'Test plan for science subjects',
        subjects: ['Physics', 'Chemistry'],
        goals: ['Understand concepts', 'Practice problems'],
        planType: 'WEEKLY',
        isActive: false,
        totalSessions: 5,
        duration: 14,
      },
    ];
    
    const createdPlans = [];
    for (const plan of plans) {
      try {
        const created = await this.prisma.plan.create({
          data: plan,
        });
        createdPlans.push(created);
      } catch (error) {
        console.warn('Failed to create test plan:', error.message);
      }
    }
    
    return createdPlans;
  }
  
  private static async createTestSessions(plans: any[], users: any[]) {
    const student = users.find(u => u.role === 'STUDENT');
    if (!student || plans.length === 0) return;
    
    const sessions = [
      {
        planId: plans[0].id,
        userId: student.id,
        subject: 'Mathematics',
        topic: 'Algebra',
        startTime: new Date(),
        duration: 60,
        difficulty: 'medium',
        sessionType: 'study',
        isCompleted: false,
        objectives: ['Learn basic algebra'],
        resources: ['Textbook', 'Practice problems'],
        techniques: ['Problem solving', 'Practice'],
      },
      {
        planId: plans[0].id,
        userId: student.id,
        subject: 'Physics',
        topic: 'Mechanics',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration: 90,
        difficulty: 'hard',
        sessionType: 'study',
        isCompleted: false,
        objectives: ['Understand mechanics'],
        resources: ['Physics textbook', 'Lab manual'],
        techniques: ['Conceptual learning', 'Problem solving'],
      },
    ];
    
    for (const session of sessions) {
      try {
        await this.prisma.studySession.create({
          data: session,
        });
      } catch (error) {
        console.warn('Failed to create test session:', error.message);
      }
    }
  }
  
  private static async createTestAITemplates() {
    const templates = [
      {
        name: 'Test Plan Generation',
        version: '1.0.0',
        type: 'plan_generation',
        template: 'Generate a plan for {{subject}} with {{goals}}',
        variables: ['subject', 'goals'],
        description: 'Test template for plan generation',
        tags: ['test', 'planning'],
        isActive: true,
      },
      {
        name: 'Test Content Generation',
        version: '1.0.0',
        type: 'content_generation',
        template: 'Generate content for {{topic}} at {{level}} level',
        variables: ['topic', 'level'],
        description: 'Test template for content generation',
        tags: ['test', 'content'],
        isActive: true,
      },
    ];
    
    for (const template of templates) {
      try {
        await this.prisma.aiPromptTemplate.create({
          data: template,
        });
      } catch (error) {
        console.warn('Failed to create test AI template:', error.message);
      }
    }
  }
  
  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Test database not initialized. Call initialize() first.');
    }
    return this.prisma;
  }
}
