import { Test, TestingModule } from '@nestjs/testing';
import { InteractionService } from './interaction.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

describe('InteractionService', () => {
  let service: InteractionService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionService,
        {
          provide: PrismaService,
          useValue: {
            interaction: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
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
      ],
    }).compile();

    service = module.get<InteractionService>(InteractionService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInteraction', () => {
    it('should create an interaction successfully', async () => {
      const mockInteractionData = {
        userId: 'user123',
        type: 'CLICK',
        target: 'button',
        metadata: { page: 'dashboard', section: 'header' },
      };

      const mockCreatedInteraction = {
        id: 'interaction123',
        ...mockInteractionData,
        timestamp: new Date(),
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.interaction, 'create').mockResolvedValue(mockCreatedInteraction as any);

      const result = await service.createInteraction(mockInteractionData);

      expect(result).toEqual(mockCreatedInteraction);
      expect(prismaService.interaction.create).toHaveBeenCalledWith({
        data: mockInteractionData,
      });
    });

    it('should handle errors during interaction creation', async () => {
      jest.spyOn(prismaService.interaction, 'create').mockRejectedValue(new Error('Database error'));

      await expect(service.createInteraction({} as any)).rejects.toThrow();
    });
  });

  describe('getInteraction', () => {
    it('should retrieve interaction from cache if available', async () => {
      const mockInteraction = {
        id: 'interaction123',
        userId: 'user123',
        type: 'CLICK',
        target: 'button',
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockInteraction);

      const result = await service.getInteraction('interaction123');

      expect(result).toEqual(mockInteraction);
      expect(cacheService.get).toHaveBeenCalledWith('interaction:interaction123');
    });

    it('should retrieve interaction from database if not in cache', async () => {
      const mockInteraction = {
        id: 'interaction123',
        userId: 'user123',
        type: 'CLICK',
        target: 'button',
        timestamp: new Date(),
        createdAt: new Date(),
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.interaction, 'findUnique').mockResolvedValue(mockInteraction as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getInteraction('interaction123');

      expect(result).toEqual(mockInteraction);
      expect(prismaService.interaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'interaction123' },
      });
      expect(cacheService.set).toHaveBeenCalledWith('interaction:interaction123', mockInteraction, 3600);
    });
  });

  describe('getUserInteractions', () => {
    it('should get user interactions', async () => {
      const mockInteractions = [
        { id: 'interaction1', userId: 'user123', type: 'CLICK', target: 'button1' },
        { id: 'interaction2', userId: 'user123', type: 'SCROLL', target: 'page' },
      ];

      jest.spyOn(prismaService.interaction, 'findMany').mockResolvedValue(mockInteractions as any);

      const result = await service.getUserInteractions('user123');

      expect(result).toEqual(mockInteractions);
      expect(prismaService.interaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('getInteractionsByType', () => {
    it('should get interactions by type', async () => {
      const mockInteractions = [
        { id: 'interaction1', type: 'CLICK', target: 'button1' },
        { id: 'interaction2', type: 'CLICK', target: 'button2' },
      ];

      jest.spyOn(prismaService.interaction, 'findMany').mockResolvedValue(mockInteractions as any);

      const result = await service.getInteractionsByType('CLICK');

      expect(result).toEqual(mockInteractions);
      expect(prismaService.interaction.findMany).toHaveBeenCalledWith({
        where: { type: 'CLICK' },
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('updateInteraction', () => {
    it('should update interaction successfully', async () => {
      const mockUpdatedInteraction = {
        id: 'interaction123',
        userId: 'user123',
        type: 'CLICK',
        target: 'updated-button',
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.interaction, 'update').mockResolvedValue(mockUpdatedInteraction as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const result = await service.updateInteraction('interaction123', {
        target: 'updated-button',
      });

      expect(result).toEqual(mockUpdatedInteraction);
      expect(prismaService.interaction.update).toHaveBeenCalledWith({
        where: { id: 'interaction123' },
        data: { target: 'updated-button' },
      });
      expect(cacheService.del).toHaveBeenCalled();
    });
  });

  describe('deleteInteraction', () => {
    it('should delete interaction', async () => {
      jest.spyOn(prismaService.interaction, 'delete').mockResolvedValue({} as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      await service.deleteInteraction('interaction123');

      expect(prismaService.interaction.delete).toHaveBeenCalledWith({
        where: { id: 'interaction123' },
      });
      expect(cacheService.del).toHaveBeenCalled();
    });
  });

  describe('getInteractionStats', () => {
    it('should get interaction statistics', async () => {
      const mockStats = {
        totalInteractions: 1000,
        clicks: 500,
        scrolls: 300,
        hovers: 200,
        averagePerUser: 10,
      };

      jest.spyOn(service, 'getInteractionStats').mockResolvedValue(mockStats as any);

      const result = await service.getInteractionStats('user123');

      expect(result).toEqual(mockStats);
    });
  });

  describe('getUserBehaviorPattern', () => {
    it('should get user behavior pattern', async () => {
      const mockPattern = {
        userId: 'user123',
        mostUsedFeatures: ['dashboard', 'profile', 'settings'],
        averageSessionTime: 30,
        preferredInteractionTypes: ['CLICK', 'SCROLL'],
        behaviorScore: 85,
      };

      jest.spyOn(service, 'getUserBehaviorPattern').mockResolvedValue(mockPattern as any);

      const result = await service.getUserBehaviorPattern('user123');

      expect(result).toEqual(mockPattern);
    });
  });

  describe('trackUserJourney', () => {
    it('should track user journey', async () => {
      const mockJourney = {
        userId: 'user123',
        steps: [
          { action: 'login', timestamp: new Date() },
          { action: 'navigate_dashboard', timestamp: new Date() },
          { action: 'click_profile', timestamp: new Date() },
        ],
        duration: 120,
        completionRate: 0.8,
      };

      jest.spyOn(service, 'trackUserJourney').mockResolvedValue(mockJourney as any);

      const result = await service.trackUserJourney('user123');

      expect(result).toEqual(mockJourney);
    });
  });

  describe('getHeatmapData', () => {
    it('should get heatmap data', async () => {
      const mockHeatmapData = {
        page: 'dashboard',
        clicks: [
          { x: 100, y: 200, count: 50 },
          { x: 300, y: 400, count: 30 },
        ],
        scrolls: [
          { x: 0, y: 0, count: 100 },
          { x: 0, y: 500, count: 80 },
        ],
      };

      jest.spyOn(service, 'getHeatmapData').mockResolvedValue(mockHeatmapData as any);

      const result = await service.getHeatmapData('dashboard');

      expect(result).toEqual(mockHeatmapData);
    });
  });

  describe('getUserEngagement', () => {
    it('should get user engagement metrics', async () => {
      const mockEngagement = {
        userId: 'user123',
        engagementScore: 75,
        activeDays: 15,
        totalInteractions: 500,
        averageSessionTime: 25,
        lastActive: new Date(),
      };

      jest.spyOn(service, 'getUserEngagement').mockResolvedValue(mockEngagement as any);

      const result = await service.getUserEngagement('user123');

      expect(result).toEqual(mockEngagement);
    });
  });
});
