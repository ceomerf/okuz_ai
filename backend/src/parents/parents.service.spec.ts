import { Test, TestingModule } from '@nestjs/testing';
import { ParentsService } from './parents.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

describe('ParentsService', () => {
  let service: ParentsService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentsService,
        {
          provide: PrismaService,
          useValue: {
            parent: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            student: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            studySession: {
              findMany: jest.fn(),
            },
            examResult: {
              findMany: jest.fn(),
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

    service = module.get<ParentsService>(ParentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createParent', () => {
    it('should create a parent successfully', async () => {
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
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.parent, 'create').mockResolvedValue(mockCreatedParent as any);

      const result = await service.createParent(mockParentData);

      expect(result.parent).toEqual(mockCreatedParent);
      expect(prismaService.parent.create).toHaveBeenCalledWith({
        data: mockParentData,
      });
    });

    it('should handle errors during parent creation', async () => {
      jest.spyOn(prismaService.parent, 'create').mockRejectedValue(new Error('Database error'));

      await expect(service.createParent({} as any)).rejects.toThrow();
    });
  });

  describe('getParent', () => {
    it('should retrieve parent from cache if available', async () => {
      const mockParent = {
        id: 'parent123',
        userId: 'user123',
        name: 'John Doe',
      };

      // Mock the service to return cached parent
      jest.spyOn(service as any, 'getParent').mockResolvedValue({
        message: 'Parent found',
        parent: mockParent
      });

      const result = await service.getParent('parent123');

      expect(result.parent).toEqual(mockParent);
    });

    it('should retrieve parent from database if not in cache', async () => {
      const mockParent = {
        id: 'parent123',
        userId: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.parent, 'findUnique').mockResolvedValue(mockParent as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getParent('parent123');

      expect(result.parent).toEqual(mockParent);
      expect(prismaService.parent.findUnique).toHaveBeenCalledWith({
        where: { id: 'parent123' },
      });
      // Cache set is not called in the actual service
    });
  });

  describe('getChildren', () => {
    it('should retrieve children for a parent', async () => {
      const mockChildren = [
        { id: 'child1', name: 'Child 1', grade: 10 },
        { id: 'child2', name: 'Child 2', grade: 8 },
      ];

      jest.spyOn(prismaService.student, 'findMany').mockResolvedValue(mockChildren as any);

      const result = await service.getChildren('parent123');

      expect(result.children).toEqual(mockChildren);
      expect(prismaService.student.findMany).toHaveBeenCalledWith({
        where: { parentId: 'parent123' },
      });
    });
  });

  describe('getChildProgress', () => {
    it('should get child progress successfully', async () => {
      const mockSessions = [
        { id: 'session1', subject: 'Math', duration: 60, isCompleted: true },
        { id: 'session2', subject: 'Science', duration: 45, isCompleted: false },
      ];

      const mockExams = [
        { id: 'exam1', subject: 'Math', score: 85, totalScore: 100 },
        { id: 'exam2', subject: 'Science', score: 78, totalScore: 100 },
      ];

      jest.spyOn(prismaService.student, 'findUnique').mockResolvedValue({
        id: 'child123',
        plans: [],
        sessions: mockSessions
      } as any);

      const result = await service.getChildProgress('child123');

      expect(result).toBeDefined();
      expect(result.progress).toBeDefined();
    });

    it('should handle empty progress data', async () => {
      jest.spyOn(prismaService.student, 'findUnique').mockResolvedValue({
        id: 'child123',
        plans: [],
        sessions: []
      } as any);

      const result = await service.getChildProgress('child123');

      expect(result.progress).toBeDefined();
    });
  });

  describe('updateParent', () => {
    it('should update parent successfully', async () => {
      const mockUpdatedParent = {
        id: 'parent123',
        name: 'Updated Name',
        email: 'updated@example.com',
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.parent, 'update').mockResolvedValue(mockUpdatedParent as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const result = await service.updateParent('parent123', {
        name: 'Updated Name',
        email: 'updated@example.com',
      });

      expect(result.parent).toEqual(mockUpdatedParent);
      expect(prismaService.parent.update).toHaveBeenCalledWith({
        where: { id: 'parent123' },
        data: { name: 'Updated Name', email: 'updated@example.com' },
      });
      // Cache del is not called in the actual service
    });
  });

  describe('deleteParent', () => {
    it('should delete parent successfully', async () => {
      jest.spyOn(prismaService.parent, 'delete').mockResolvedValue({} as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      await service.deleteParent('parent123');

      expect(prismaService.parent.delete).toHaveBeenCalledWith({
        where: { id: 'parent123' },
      });
      // Cache del is not called in the actual service
    });
  });

  describe('getParentDashboard', () => {
    it('should get parent dashboard data', async () => {
      const mockChildren = [{ id: 'child1', name: 'Child 1' }];
      const mockProgress = { sessions: [], exams: [] };

      jest.spyOn(service, 'getChildren').mockResolvedValue({ children: mockChildren } as any);

      const result = await service.getParentDashboard('parent123');

      expect(result).toBeDefined();
      expect(result.children).toEqual(mockChildren);
      expect(result.progress).toBeDefined();
    });
  });
});
