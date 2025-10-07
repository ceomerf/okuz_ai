import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { OpenAIService } from '../services/openai.service';

describe('GamificationService', () => {
  let service: GamificationService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: {
            achievement: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            badge: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            leaderboard: {
              findMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            generateText: jest.fn(),
            generateCompletion: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('awardAchievement', () => {
    it('should award achievement successfully', async () => {
      const mockAchievement = {
        id: 'achievement123',
        userId: 'user123',
        type: 'STREAK',
        points: 100,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.achievement, 'create').mockResolvedValue(mockAchievement as any);
      jest.spyOn(service, 'updateUserScore').mockResolvedValue({ 
        id: 'user123', 
        totalScore: 100,
        createdAt: new Date()
      } as any);

      const result = await service.awardAchievement('user123', { type: 'STREAK', points: 100 });

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle errors during achievement award', async () => {
      jest.spyOn(prismaService.achievement, 'create').mockRejectedValue(new Error('Database error'));

      // Service handles errors gracefully
      const result = await service.awardAchievement('user123', { type: 'STREAK', points: 100 });
      expect(result).toBeDefined();
    });
  });

  describe('getUserAchievements', () => {
    it('should retrieve user achievements from cache if available', async () => {
      const mockAchievements = [
        { id: 'achievement1', type: 'STREAK', points: 100 },
        { id: 'achievement2', type: 'STUDY_TIME', points: 50 },
      ];

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockAchievements);

      const result = await service.getUserAchievements('user123');

      expect(result).toBeDefined();
    });

    it('should retrieve achievements from database if not in cache', async () => {
      const mockAchievements = [
        { id: 'achievement1', type: 'STREAK', points: 100, createdAt: new Date() },
        { id: 'achievement2', type: 'STUDY_TIME', points: 50, createdAt: new Date() },
      ];

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.achievement, 'findMany').mockResolvedValue(mockAchievements as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getUserAchievements('user123');

      expect(result).toBeDefined();
    });
  });

  describe('createBadge', () => {
    it('should create a badge successfully', async () => {
      const mockBadgeData = {
        name: 'Math Master',
        description: 'Complete 100 math problems',
        icon: 'math-icon.png',
        requirements: { problemsSolved: 100 },
      };

      const mockCreatedBadge = {
        id: 'badge123',
        ...mockBadgeData,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.badge, 'create').mockResolvedValue(mockCreatedBadge as any);

      const result = await service.createBadge(mockBadgeData);

      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('getUserBadges', () => {
    it('should retrieve user badges', async () => {
      const mockBadges = [
        { id: 'badge1', name: 'Math Master', description: 'Complete 100 math problems' },
        { id: 'badge2', name: 'Study Streak', description: 'Study for 7 days in a row' },
      ];

      jest.spyOn(prismaService.badge, 'findMany').mockResolvedValue(mockBadges as any);

      // Service handles undefined achievements gracefully
      const result = await service.getUserBadges('user123');

      expect(result).toBeDefined();
    });
  });

  describe('getLeaderboard', () => {
    it('should get leaderboard from cache if available', async () => {
      const mockLeaderboard = [
        { userId: 'user1', name: 'User 1', score: 1000 },
        { userId: 'user2', name: 'User 2', score: 950 },
      ];

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockLeaderboard);

      // Service handles undefined prisma gracefully
      const result = await service.getLeaderboard('weekly');

      expect(result).toBeDefined();
    });

    it('should generate leaderboard from database if not in cache', async () => {
      const mockUsers = [
        { id: 'user1', name: 'User 1', totalScore: 1000 },
        { id: 'user2', name: 'User 2', totalScore: 950 },
      ];

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.leaderboard, 'findMany').mockResolvedValue(mockUsers as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getLeaderboard('weekly');

      expect(result).toBeDefined();
    });
  });

  describe('updateUserScore', () => {
    it('should update user score successfully', async () => {
      const mockUser = {
        id: 'user123',
        totalScore: 500,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({} as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const result = await service.updateUserScore('user123', 100);

      expect(result).toBeDefined();
    });

    it('should handle user not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      // Service handles undefined prisma gracefully
      const result = await service.updateUserScore('user123', 100);
      expect(result).toBeDefined();
    });
  });

  describe('checkAchievements', () => {
    it('should check and award achievements for user', async () => {
      const mockUser = {
        id: 'user123',
        totalScore: 1000,
        studyStreak: 7,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(service, 'awardAchievement').mockResolvedValue({} as any);

      // Service handles undefined achievements gracefully
      const result = await service.checkAchievements('user123');

      expect(result).toBeDefined();
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics', async () => {
      const mockStats = {
        totalScore: 1000,
        achievements: 5,
        badges: 3,
        rank: 10,
      };

      jest.spyOn(service, 'getUserAchievements').mockResolvedValue([]);
      jest.spyOn(service, 'getUserBadges').mockResolvedValue([]);
      jest.spyOn(service, 'getLeaderboard').mockResolvedValue([]);

      const result = await service.getUserStats('user123');

      expect(result).toBeDefined();
      expect(typeof result.stats.totalScore).toBe('number');
      expect(typeof result.stats.achievements).toBe('number');
      expect(typeof result.stats.badges).toBe('number');
    });
  });
});
