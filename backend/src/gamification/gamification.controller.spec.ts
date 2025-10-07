import { Test, TestingModule } from '@nestjs/testing';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

describe('GamificationController', () => {
  let controller: GamificationController;
  let gamificationService: GamificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [
        {
          provide: GamificationService,
          useValue: {
            awardAchievement: jest.fn(),
            getUserAchievements: jest.fn(),
            createBadge: jest.fn(),
            getUserBadges: jest.fn(),
            getLeaderboard: jest.fn(),
            updateUserScore: jest.fn(),
            checkAchievements: jest.fn(),
            getUserStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GamificationController>(GamificationController);
    gamificationService = module.get<GamificationService>(GamificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('awardAchievement', () => {
    it('should award achievement to user', async () => {
      const mockAchievement = {
        id: 'achievement123',
        userId: 'user123',
        type: 'STREAK',
        points: 100,
      };

      jest.spyOn(gamificationService, 'awardAchievement').mockResolvedValue(mockAchievement as any);

      const result = await controller.awardAchievement('user123', {
        type: 'STREAK',
        points: 100,
      });

      expect(result).toEqual(mockAchievement);
      expect(gamificationService.awardAchievement).toHaveBeenCalledWith('user-1753052679951', { type: 'STREAK', points: 100 });
    });
  });

  describe('getUserAchievements', () => {
    it('should get user achievements', async () => {
      const mockAchievements = [
        { id: 'achievement1', type: 'STREAK', points: 100 },
        { id: 'achievement2', type: 'STUDY_TIME', points: 50 },
      ];

      jest.spyOn(gamificationService, 'getUserAchievements').mockResolvedValue(mockAchievements as any);

      const result = await controller.getUserAchievements('user123');

      expect(result).toEqual(mockAchievements);
      expect(gamificationService.getUserAchievements).toHaveBeenCalledWith('user-1753052679951');
    });
  });

  describe('createBadge', () => {
    it('should create a new badge', async () => {
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

      jest.spyOn(gamificationService, 'createBadge').mockResolvedValue(mockCreatedBadge as any);

      const mockRequest = { user: { id: 'user123' } };
      const result = await controller.createBadge(mockRequest, mockBadgeData);

      expect(result).toEqual(mockCreatedBadge);
      expect(gamificationService.createBadge).toHaveBeenCalledWith(mockBadgeData);
    });
  });

  describe('getUserBadges', () => {
    it('should get user badges', async () => {
      const mockBadges = [
        { id: 'badge1', name: 'Math Master', description: 'Complete 100 math problems' },
        { id: 'badge2', name: 'Study Streak', description: 'Study for 7 days in a row' },
      ];

      jest.spyOn(gamificationService, 'getUserBadges').mockResolvedValue(mockBadges as any);

      const result = await controller.getUserBadges('user123');

      expect(result).toEqual(mockBadges);
      expect(gamificationService.getUserBadges).toHaveBeenCalledWith('user-1753052679951');
    });
  });

  describe('getLeaderboard', () => {
    it('should get leaderboard', async () => {
      const mockLeaderboard = [
        { userId: 'user1', name: 'User 1', score: 1000 },
        { userId: 'user2', name: 'User 2', score: 950 },
      ];

      jest.spyOn(gamificationService, 'getLeaderboard').mockResolvedValue(mockLeaderboard as any);

      const result = await controller.getLeaderboard('weekly');

      expect(result).toEqual(mockLeaderboard);
      expect(gamificationService.getLeaderboard).toHaveBeenCalledWith('user-1753052679951');
    });
  });

  describe('updateUserScore', () => {
    it('should update user score', async () => {
      jest.spyOn(gamificationService, 'updateUserScore').mockResolvedValue({ id: 'user123', totalScore: 1100 } as any);

      await controller.updateUserScore('user123', { points: 100 });

      expect(gamificationService.updateUserScore).toHaveBeenCalledWith('user-1753052679951', { points: 100 });
    });
  });

  describe('checkAchievements', () => {
    it('should check user achievements', async () => {
      jest.spyOn(gamificationService, 'checkAchievements').mockResolvedValue(undefined);

      await controller.checkAchievements('user123');

      expect(gamificationService.checkAchievements).toHaveBeenCalledWith('user-1753052679951');
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

      jest.spyOn(gamificationService, 'getUserStats').mockResolvedValue(mockStats as any);

      const result = await controller.getUserStats('user123');

      expect(result).toEqual(mockStats);
      expect(gamificationService.getUserStats).toHaveBeenCalledWith('user-1753052679951');
    });
  });
});
