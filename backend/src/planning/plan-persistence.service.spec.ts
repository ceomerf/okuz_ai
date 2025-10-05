import { Test, TestingModule } from '@nestjs/testing';
import { PlanPersistenceService } from './plan-persistence.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PlanPersistenceService', () => {
  let service: PlanPersistenceService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanPersistenceService,
        {
          provide: PrismaService,
          useValue: {
            plan: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            studySession: {
              createMany: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prismaService)),
          },
        },
      ],
    }).compile();

    service = module.get<PlanPersistenceService>(PlanPersistenceService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPlans', () => {
    it('should get user plans successfully', async () => {
      const mockPlans = [
        {
          id: 'plan123',
          title: 'Test Plan',
          description: 'Test Description',
          type: 'weekly',
          subjects: ['Math'],
          goals: ['Complete Algebra'],
          startDate: new Date(),
          endDate: new Date(),
          isActive: true,
          sessions: [],
          userId: 'user123',
          createdAt: new Date(),
        },
      ];

      jest.spyOn(prismaService.plan, 'findMany').mockResolvedValue(mockPlans as any);

      const result = await service.getUserPlans('user123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('plan123');
      expect(prismaService.plan.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        orderBy: { createdAt: 'desc' },
        include: {
          sessions: {
            orderBy: { startTime: 'asc' },
          },
        },
      });
    });
  });

  describe('getPlan', () => {
    it('should get a specific plan successfully', async () => {
      const mockPlan = {
        id: 'plan123',
        title: 'Test Plan',
        userId: 'user123',
        sessions: [],
        user: { id: 'user123', name: 'Test User', studentProfile: null },
      };

      jest.spyOn(prismaService.plan, 'findFirst').mockResolvedValue(mockPlan as any);

      const result = await service.getPlan('user123', 'plan123');

      expect(result).toEqual(mockPlan);
      expect(prismaService.plan.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if plan not found', async () => {
      jest.spyOn(prismaService.plan, 'findFirst').mockResolvedValue(null);

      await expect(service.getPlan('user123', 'plan123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPlan', () => {
    it('should create a plan successfully', async () => {
      const mockPlanData = {
        title: 'New Plan',
        userId: 'user123',
        type: 'weekly',
      };

      const mockCreatedPlan = {
        id: 'plan123',
        ...mockPlanData,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.plan, 'create').mockResolvedValue(mockCreatedPlan as any);

      const result = await service.createPlan(mockPlanData);

      expect(result).toEqual(mockCreatedPlan);
      expect(prismaService.plan.create).toHaveBeenCalledWith({
        data: mockPlanData,
      });
    });
  });

  describe('savePlanWithSessions', () => {
    it('should save plan with sessions in a transaction', async () => {
      const mockPlanData = {
        plan: {
          title: 'Plan with Sessions',
          userId: 'user123',
        },
        sessions: [
          { subject: 'Math', topic: 'Algebra', duration: 60 },
        ],
      };

      const mockCreatedPlan = {
        id: 'plan123',
        ...mockPlanData.plan,
      };

      const mockTransaction = {
        plan: {
          create: jest.fn().mockResolvedValue(mockCreatedPlan),
        },
        studySession: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      jest.spyOn(prismaService, '$transaction').mockImplementation((callback: any) => callback(mockTransaction));

      const result = await service.savePlanWithSessions(mockPlanData);

      expect(result).toEqual(mockCreatedPlan);
    });
  });

  describe('updatePlan', () => {
    it('should update a plan successfully', async () => {
      const mockUpdatedPlan = {
        id: 'plan123',
        title: 'Updated Plan',
        updatedAt: new Date(),
      };

      jest.spyOn(prismaService.plan, 'update').mockResolvedValue(mockUpdatedPlan as any);

      const result = await service.updatePlan('plan123', { title: 'Updated Plan' });

      expect(result).toEqual(mockUpdatedPlan);
      expect(prismaService.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan123' },
        data: { title: 'Updated Plan' },
      });
    });
  });

  describe('deletePlan', () => {
    it('should delete a plan with its sessions in a transaction', async () => {
      const mockDeletedPlan = { id: 'plan123' };

      const mockTransaction = {
        studySession: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        plan: {
          delete: jest.fn().mockResolvedValue(mockDeletedPlan),
        },
      };

      jest.spyOn(prismaService, '$transaction').mockImplementation((callback: any) => callback(mockTransaction));

      const result = await service.deletePlan('plan123');

      expect(result).toEqual(mockDeletedPlan);
    });
  });

  describe('verifyPlanOwnership', () => {
    it('should return true if user owns the plan', async () => {
      jest.spyOn(prismaService.plan, 'findFirst').mockResolvedValue({ id: 'plan123' } as any);

      const result = await service.verifyPlanOwnership('user123', 'plan123');

      expect(result).toBe(true);
    });

    it('should return false if user does not own the plan', async () => {
      jest.spyOn(prismaService.plan, 'findFirst').mockResolvedValue(null);

      const result = await service.verifyPlanOwnership('user123', 'plan123');

      expect(result).toBe(false);
    });
  });

  describe('getActivePlan', () => {
    it('should get active plan for user', async () => {
      const mockActivePlan = {
        id: 'plan123',
        isActive: true,
        userId: 'user123',
        sessions: [],
      };

      jest.spyOn(prismaService.plan, 'findFirst').mockResolvedValue(mockActivePlan as any);

      const result = await service.getActivePlan('user123');

      expect(result).toEqual(mockActivePlan);
      expect(prismaService.plan.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user123', isActive: true },
        include: { sessions: { orderBy: { startTime: 'asc' } } },
      });
    });
  });

  describe('setPlanActiveStatus', () => {
    it('should set plan active status', async () => {
      const mockUpdatedPlan = {
        id: 'plan123',
        isActive: true,
      };

      jest.spyOn(prismaService.plan, 'update').mockResolvedValue(mockUpdatedPlan as any);

      const result = await service.setPlanActiveStatus('plan123', true);

      expect(result).toEqual(mockUpdatedPlan);
      expect(prismaService.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan123' },
        data: { isActive: true },
      });
    });
  });

  describe('getPlanStats', () => {
    it('should calculate plan statistics', async () => {
      const mockSessions = [
        { id: 'session1', duration: 60, isCompleted: true, planId: 'plan123' },
        { id: 'session2', duration: 45, isCompleted: false, planId: 'plan123' },
        { id: 'session3', duration: 30, isCompleted: true, planId: 'plan123' },
      ];

      jest.spyOn(prismaService.studySession, 'findMany').mockResolvedValue(mockSessions as any);

      const result = await service.getPlanStats('plan123');

      expect(result.totalSessions).toBe(3);
      expect(result.completedSessions).toBe(2);
      expect(result.totalStudyTime).toBe(135);
      expect(result.completedStudyTime).toBe(90);
      expect(result.completionRate).toBeCloseTo(66.67, 1);
    });
  });
});
