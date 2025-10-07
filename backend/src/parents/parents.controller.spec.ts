import { Test, TestingModule } from '@nestjs/testing';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';

describe('ParentsController', () => {
  let controller: ParentsController;
  let parentsService: ParentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentsController],
      providers: [
        {
          provide: ParentsService,
          useValue: {
            createParent: jest.fn(),
            getParent: jest.fn(),
            getChildren: jest.fn(),
            getChildProgress: jest.fn(),
            updateParent: jest.fn(),
            deleteParent: jest.fn(),
            getParentDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ParentsController>(ParentsController);
    parentsService = module.get<ParentsService>(ParentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createParent', () => {
    it('should create a new parent', async () => {
      const mockParentData = {
        userId: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      };

      const mockCreatedParent = {
        id: 'parent123',
        ...mockParentData,
        createdAt: new Date(),
      };

      jest.spyOn(parentsService, 'createParent').mockResolvedValue(mockCreatedParent as any);

      const result = await controller.createParent(mockParentData);

      expect(result).toEqual(mockCreatedParent);
      expect(parentsService.createParent).toHaveBeenCalledWith(mockParentData);
    });

    it('should handle creation errors', async () => {
      const mockParentData = {
        userId: 'user123',
        name: 'John Doe',
      };

      jest.spyOn(parentsService, 'createParent').mockRejectedValue(new Error('Creation failed'));

      await expect(controller.createParent(mockParentData)).rejects.toThrow('Creation failed');
    });
  });

  describe('getParent', () => {
    it('should get parent by id', async () => {
      const mockParent = {
        id: 'parent123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      jest.spyOn(parentsService, 'getParent').mockResolvedValue(mockParent as any);

      const result = await controller.getParent('parent123');

      expect(result).toEqual(mockParent);
      expect(parentsService.getParent).toHaveBeenCalledWith('parent123');
    });
  });

  describe('getChildren', () => {
    it('should get children for a parent', async () => {
      const mockChildren = [
        { id: 'child1', name: 'Child 1', grade: 10 },
        { id: 'child2', name: 'Child 2', grade: 8 },
      ];

      jest.spyOn(parentsService, 'getChildren').mockResolvedValue(mockChildren as any);

      const result = await controller.getChildren('parent123');

      expect(result).toEqual(mockChildren);
      expect(parentsService.getChildren).toHaveBeenCalledWith('parent123');
    });
  });

  describe('getChildProgress', () => {
    it('should get child progress', async () => {
      const mockProgress = {
        sessions: [
          { id: 'session1', subject: 'Math', duration: 60, isCompleted: true },
        ],
        exams: [
          { id: 'exam1', subject: 'Math', score: 85, totalScore: 100 },
        ],
      };

      jest.spyOn(parentsService, 'getChildProgress').mockResolvedValue(mockProgress as any);

      const result = await controller.getChildProgress('parent123', 'child123');

      expect(result).toEqual(mockProgress);
      expect(parentsService.getChildProgress).toHaveBeenCalledWith('child123');
    });
  });

  describe('updateParent', () => {
    it('should update parent', async () => {
      const mockUpdateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const mockUpdatedParent = {
        id: 'parent123',
        ...mockUpdateData,
        updatedAt: new Date(),
      };

      jest.spyOn(parentsService, 'updateParent').mockResolvedValue(mockUpdatedParent as any);

      const result = await controller.updateParent('parent123', mockUpdateData);

      expect(result).toEqual(mockUpdatedParent);
      expect(parentsService.updateParent).toHaveBeenCalledWith('parent123', mockUpdateData);
    });
  });

  describe('deleteParent', () => {
    it('should delete parent', async () => {
      jest.spyOn(parentsService, 'deleteParent').mockResolvedValue({ message: 'Parent deleted successfully' });

      await controller.deleteParent('parent123');

      expect(parentsService.deleteParent).toHaveBeenCalledWith('parent123');
    });
  });

  describe('getDashboard', () => {
    it('should get parent dashboard', async () => {
      const mockDashboard = {
        children: [{ id: 'child1', name: 'Child 1' }],
        progress: { sessions: [], exams: [] },
        summary: { totalChildren: 1, activeSessions: 0 },
      };

      jest.spyOn(parentsService, 'getParentDashboard').mockResolvedValue(mockDashboard as any);

      const result = await controller.getDashboard('parent123');

      expect(result).toEqual(mockDashboard);
      expect(parentsService.getParentDashboard).toHaveBeenCalledWith('parent123');
    });
  });
});
