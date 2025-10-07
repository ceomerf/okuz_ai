import { Test, TestingModule } from '@nestjs/testing';
import { InteractionController } from './interaction.controller';
import { InteractionService } from './interaction.service';

describe('InteractionController', () => {
  let controller: InteractionController;
  let interactionService: InteractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InteractionController],
      providers: [
        {
          provide: InteractionService,
          useValue: {
            createInteraction: jest.fn(),
            getInteraction: jest.fn(),
            getUserInteractions: jest.fn(),
            getInteractionsByType: jest.fn(),
            updateInteraction: jest.fn(),
            deleteInteraction: jest.fn(),
            getInteractionStats: jest.fn(),
            getUserBehaviorPattern: jest.fn(),
            trackUserJourney: jest.fn(),
            getHeatmapData: jest.fn(),
            getUserEngagement: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InteractionController>(InteractionController);
    interactionService = module.get<InteractionService>(InteractionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInteraction', () => {
    it('should create a new interaction', async () => {
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

      jest.spyOn(interactionService, 'createInteraction').mockResolvedValue(mockCreatedInteraction as any);

      const mockRequest = { user: { id: 'user123' } };
      const result = await controller.createInteraction(mockRequest, mockInteractionData);

      expect(result).toEqual(mockCreatedInteraction);
      expect(interactionService.createInteraction).toHaveBeenCalledWith(mockInteractionData);
    });
  });

  describe('getInteraction', () => {
    it('should get interaction by id', async () => {
      const mockInteraction = {
        id: 'interaction123',
        userId: 'user123',
        type: 'CLICK',
        target: 'button',
        timestamp: new Date(),
      };

      jest.spyOn(interactionService, 'getInteraction').mockResolvedValue(mockInteraction as any);

      const result = await controller.getInteraction('interaction123');

      expect(result).toEqual(mockInteraction);
      expect(interactionService.getInteraction).toHaveBeenCalledWith('interaction123');
    });
  });

  describe('getUserInteractions', () => {
    it('should get user interactions', async () => {
      const mockInteractions = [
        { id: 'interaction1', userId: 'user123', type: 'CLICK', target: 'button1' },
        { id: 'interaction2', userId: 'user123', type: 'SCROLL', target: 'page' },
      ];

      jest.spyOn(interactionService, 'getUserInteractions').mockResolvedValue(mockInteractions as any);

      const result = await controller.getUserInteractions('user123');

      expect(result).toEqual(mockInteractions);
      expect(interactionService.getUserInteractions).toHaveBeenCalledWith('user123');
    });
  });

  describe('getInteractionsByType', () => {
    it('should get interactions by type', async () => {
      const mockInteractions = [
        { id: 'interaction1', type: 'CLICK', target: 'button1' },
        { id: 'interaction2', type: 'CLICK', target: 'button2' },
      ];

      jest.spyOn(interactionService, 'getInteractionsByType').mockResolvedValue(mockInteractions as any);

      const result = await controller.getInteractionsByType('CLICK');

      expect(result).toEqual(mockInteractions);
      expect(interactionService.getInteractionsByType).toHaveBeenCalledWith('CLICK');
    });
  });

  describe('updateInteraction', () => {
    it('should update interaction', async () => {
      const mockUpdateData = {
        target: 'updated-button',
      };

      const mockUpdatedInteraction = {
        id: 'interaction123',
        userId: 'user123',
        type: 'CLICK',
        target: 'updated-button',
        updatedAt: new Date(),
      };

      jest.spyOn(interactionService, 'updateInteraction').mockResolvedValue(mockUpdatedInteraction as any);

      const result = await controller.updateInteraction('interaction123', mockUpdateData);

      expect(result).toEqual(mockUpdatedInteraction);
      expect(interactionService.updateInteraction).toHaveBeenCalledWith('interaction123', mockUpdateData);
    });
  });

  describe('deleteInteraction', () => {
    it('should delete interaction', async () => {
      jest.spyOn(interactionService, 'deleteInteraction').mockResolvedValue({ message: 'Interaction deleted', id: 'interaction123' });

      await controller.deleteInteraction('interaction123');

      expect(interactionService.deleteInteraction).toHaveBeenCalledWith('interaction123');
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

      jest.spyOn(interactionService, 'getInteractionStats').mockResolvedValue(mockStats as any);

      const result = await controller.getInteractionStats('user123');

      expect(result).toEqual(mockStats);
      expect(interactionService.getInteractionStats).toHaveBeenCalledWith('user123');
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

      jest.spyOn(interactionService, 'getUserBehaviorPattern').mockResolvedValue(mockPattern as any);

      const result = await controller.getUserBehaviorPattern('user123');

      expect(result).toEqual(mockPattern);
      expect(interactionService.getUserBehaviorPattern).toHaveBeenCalledWith('user123');
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

      jest.spyOn(interactionService, 'trackUserJourney').mockResolvedValue(mockJourney as any);

      const result = await controller.trackUserJourney('user123');

      expect(result).toEqual(mockJourney);
      expect(interactionService.trackUserJourney).toHaveBeenCalledWith('user123');
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

      jest.spyOn(interactionService, 'getHeatmapData').mockResolvedValue(mockHeatmapData as any);

      const result = await controller.getHeatmapData('dashboard');

      expect(result).toEqual(mockHeatmapData);
      expect(interactionService.getHeatmapData).toHaveBeenCalledWith('dashboard');
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

      jest.spyOn(interactionService, 'getUserEngagement').mockResolvedValue(mockEngagement as any);

      const result = await controller.getUserEngagement('user123');

      expect(result).toEqual(mockEngagement);
      expect(interactionService.getUserEngagement).toHaveBeenCalledWith('user123');
    });
  });
});
