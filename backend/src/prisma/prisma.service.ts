import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleInit {
  // Mock storage for testing
  private mockUsers: any[] = [];
  private mockGamificationProfiles: any[] = [];
  private mockStudySessions: any[] = [];
  private mockPlans: any[] = [];
  private mockAchievements: any[] = [];
  private mockQuizzes: any[] = [];
  private mockToolUsages: any[] = [];
  private mockFlashcards: any[] = [];
  private mockExamResults: any[] = [];
  private mockLearningPaths: any[] = [];
  private mockStudyGoals: any[] = [];

  // Mock Prisma models - gerçek Prisma generate edilene kadar
  user = {
    findUnique: async (args?: any) => {
      if (args?.where?.email) {
        return this.mockUsers.find(u => u.email === args.where.email) || null;
      }
      if (args?.where?.id) {
        const user = this.mockUsers.find(u => u.id === args.where.id);
        if (user && args?.include?.studentProfile) {
          return {
            ...user,
            studentProfile: {
              grade: '10',
              field: 'MF'
            }
          };
        }
        return user || null;
      }
      return null;
    },
    findMany: async (args?: any) => this.mockUsers,
    create: async (args: any) => {
      // Email kontrolü
      const existingUser = this.mockUsers.find(u => u.email === args.data.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }
      
      const newUser = { 
        id: `user-${Date.now()}`, 
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.mockUsers.push(newUser);
      console.log('✅ Mock user created:', newUser.email);
      return newUser;
    },
    update: async (args: any) => {
      const index = this.mockUsers.findIndex(u => u.id === args.where.id);
      if (index !== -1) {
        this.mockUsers[index] = { ...this.mockUsers[index], ...args.data };
        return this.mockUsers[index];
      }
      return null;
    },
    delete: async (args: any) => {
      const index = this.mockUsers.findIndex(u => u.id === args.where.id);
      if (index !== -1) {
        const deleted = this.mockUsers[index];
        this.mockUsers.splice(index, 1);
        return deleted;
      }
      return null;
    },
    count: async (args?: any) => this.mockUsers.length,
  };

  gamificationProfile = {
    findUnique: async (args?: any) => {
      if (args?.where?.userId) {
        return this.mockGamificationProfiles.find(p => p.userId === args.where.userId) || null;
      }
      return null;
    },
    findMany: async (args?: any) => {
      let profiles = [...this.mockGamificationProfiles];
      
      // Ordering
      if (args?.orderBy) {
        profiles.sort((a, b) => {
          for (const order of args.orderBy) {
            if (order.experience === 'desc') {
              if (b.experience !== a.experience) {
                return b.experience - a.experience;
              }
            }
            if (order.level === 'desc') {
              if (b.level !== a.level) {
                return b.level - a.level;
              }
            }
          }
          return 0;
        });
      }
      
      // Take limit
      if (args?.take) {
        profiles = profiles.slice(0, args.take);
      }
      
      // Include user data
      if (args?.include?.user) {
        profiles = profiles.map(profile => {
          const user = this.mockUsers.find(u => u.id === profile.userId);
          return {
            ...profile,
            user: user ? {
              id: user.id,
              name: user.name,
              studentProfile: {
                grade: '10',
                field: 'MF'
              }
            } : null
          };
        });
      }
      
      return profiles;
    },
    create: async (args: any) => {
      const newProfile = { 
        id: `profile-${Date.now()}`, 
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.mockGamificationProfiles.push(newProfile);
      return newProfile;
    },
    update: async (args: any) => {
      const index = this.mockGamificationProfiles.findIndex(p => p.userId === args.where.userId);
      if (index !== -1) {
        this.mockGamificationProfiles[index] = { ...this.mockGamificationProfiles[index], ...args.data };
        return this.mockGamificationProfiles[index];
      }
      return null;
    },
    delete: async (args: any) => {
      const index = this.mockGamificationProfiles.findIndex(p => p.userId === args.where.userId);
      if (index !== -1) {
        const deleted = this.mockGamificationProfiles[index];
        this.mockGamificationProfiles.splice(index, 1);
        return deleted;
      }
      return null;
    },
    count: async (args?: any) => {
      if (args?.where?.experience?.gt) {
        return this.mockGamificationProfiles.filter(p => p.experience > args.where.experience.gt).length;
      }
      return this.mockGamificationProfiles.length;
    },
  };

  studySession = {
    findUnique: async (args?: any) => null,
    findMany: async (args?: any) => this.mockStudySessions,
    findFirst: async (args?: any) => {
      if (args?.where?.userId) {
        return this.mockStudySessions.find(s => s.userId === args.where.userId) || null;
      }
      return null;
    },
    create: async (args: any) => {
      const newSession = { 
        id: `session-${Date.now()}`, 
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.mockStudySessions.push(newSession);
      return newSession;
    },
    update: async (args: any) => {
      const index = this.mockStudySessions.findIndex(s => s.id === args.where.id);
      if (index !== -1) {
        this.mockStudySessions[index] = { ...this.mockStudySessions[index], ...args.data };
        return this.mockStudySessions[index];
      }
      return null;
    },
    delete: async (args: any) => {
      const index = this.mockStudySessions.findIndex(s => s.id === args.where.id);
      if (index !== -1) {
        const deleted = this.mockStudySessions[index];
        this.mockStudySessions.splice(index, 1);
        return deleted;
      }
      return null;
    },
    deleteMany: async (args?: any) => ({ count: 0 }),
    aggregate: async (args?: any) => ({ _sum: { duration: 0 } }),
    count: async (args?: any) => this.mockStudySessions.length,
  };

  plan = {
    findUnique: async (args?: any) => {
      if (args?.where?.id) {
        const plan = this.mockPlans.find(p => p.id === args.where.id);
        if (plan && args?.include?.sessions) {
          return {
            ...plan,
            sessions: this.mockStudySessions.filter(s => s.planId === plan.id)
          };
        }
        if (plan && args?.include?.user) {
          const user = this.mockUsers.find(u => u.id === plan.userId);
          return {
            ...plan,
            user: user ? {
              id: user.id,
              name: user.name,
              studentProfile: {
                grade: '10',
                field: 'MF'
              }
            } : null
          };
        }
        return plan || null;
      }
      return null;
    },
    findMany: async (args?: any) => {
      let plans = [...this.mockPlans];
      
      // Filter by userId
      if (args?.where?.userId) {
        plans = plans.filter(p => p.userId === args.where.userId);
      }
      
      // Order by
      if (args?.orderBy?.createdAt === 'desc') {
        plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      // Include sessions
      if (args?.include?.sessions) {
        plans = plans.map(plan => ({
          ...plan,
          sessions: this.mockStudySessions.filter(s => s.planId === plan.id)
        }));
      }
      
      return plans;
    },
    create: async (args: any) => {
      const newPlan = { 
        id: `plan-${Date.now()}`, 
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.mockPlans.push(newPlan);
      return newPlan;
    },
    update: async (args: any) => {
      const index = this.mockPlans.findIndex(p => p.id === args.where.id);
      if (index !== -1) {
        this.mockPlans[index] = { ...this.mockPlans[index], ...args.data };
        return this.mockPlans[index];
      }
      return null;
    },
    delete: async (args: any) => {
      const index = this.mockPlans.findIndex(p => p.id === args.where.id);
      if (index !== -1) {
        const deleted = this.mockPlans[index];
        this.mockPlans.splice(index, 1);
        return deleted;
      }
      return null;
    },
    count: async (args?: any) => this.mockPlans.length,
  };

  achievement = {
    findUnique: async (args?: any) => null,
    findMany: async (args?: any) => this.mockAchievements,
    create: async (args: any) => {
      const newAchievement = { 
        id: `achievement-${Date.now()}`, 
        ...args.data,
        createdAt: new Date()
      };
      this.mockAchievements.push(newAchievement);
      return newAchievement;
    },
    findFirst: async (args?: any) => {
      if (args?.where?.userId && args?.where?.title) {
        return this.mockAchievements.find(a => a.userId === args.where.userId && a.title === args.where.title) || null;
      }
      return null;
    },
  };

  quiz = {
    findMany: async (args?: any) => this.mockQuizzes,
    count: async (args?: any) => this.mockQuizzes.length,
  };

  toolUsage = {
    create: async (args: any) => {
      const newUsage = { 
        id: `usage-${Date.now()}`, 
        ...args.data,
        createdAt: new Date()
      };
      this.mockToolUsages.push(newUsage);
      return newUsage;
    },
    count: async (args?: any) => this.mockToolUsages.length,
  };

  flashcard = {
    count: async (args?: any) => this.mockFlashcards.length,
  };

  examResult = {
    findMany: async (args?: any) => this.mockExamResults,
    create: async (args: any) => {
      const newResult = { 
        id: `exam-${Date.now()}`, 
        ...args.data,
        createdAt: new Date()
      };
      this.mockExamResults.push(newResult);
      return newResult;
    },
    count: async (args?: any) => this.mockExamResults.length,
  };

  learningPath = {
    findUnique: async (args?: any) => null,
    update: async (args: any) => {
      const index = this.mockLearningPaths.findIndex(l => l.id === args.where.id);
      if (index !== -1) {
        this.mockLearningPaths[index] = { ...this.mockLearningPaths[index], ...args.data };
        return this.mockLearningPaths[index];
      }
      return null;
    },
  };

  studyGoal = {
    findMany: async (args?: any) => this.mockStudyGoals,
  };

  async onModuleInit() {
    console.log('PrismaService initialized (mock mode with storage)');
    
    // Test için mock data ekle
    this.mockUsers.push({
      id: 'user-1753052679951',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STUDENT',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Test için gamification profile ekle
    this.mockGamificationProfiles.push({
      id: 'profile-1753052679951',
      userId: 'user-1753052679951',
      level: 5,
      experience: 2500,
      energy: 85,
      maxEnergy: 100,
      coins: 150,
      lastEnergyRefill: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 saat önce
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Test için plan ekle
    this.mockPlans.push({
      id: 'plan-1753052679951',
      userId: 'user-1753052679951',
      title: 'Matematik Öğrenme Planı',
      description: 'Matematik dersi için kişiselleştirilmiş plan',
      type: 'MONTHLY',
      subjects: ['Matematik'],
      goals: ['Temel konuları öğren', 'Problem çözme becerisi geliştir'],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      metadata: {
        learningStyle: 'visual',
        availableTime: 120,
        preferences: {
          studyTimes: ['morning', 'afternoon'],
          sessionDuration: 45,
          breakDuration: 15,
          difficulty: 'medium',
          focusAreas: ['algebra', 'geometry']
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Test için study session ekle
    this.mockStudySessions.push({
      id: 'session-2',
      userId: 'user-1753052679951',
      planId: 'plan-1753052679951',
      subject: 'Matematik',
      topic: 'Cebir',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Yarın
      duration: 45,
      difficulty: 'medium',
      type: 'study',
      isCompleted: false,
      performance: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Test için achievements ekle
    this.mockAchievements.push({
      id: 'achievement-1',
      userId: 'user-1753052679951',
      title: 'İlk Adım',
      description: 'İlk çalışma oturumunu tamamladın',
      type: 'MILESTONE',
      icon: '🎯',
      points: 100,
      unlockedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Mock storage ready for testing');
  }

  async onModuleDestroy() {
    console.log('PrismaService destroyed');
  }
}
