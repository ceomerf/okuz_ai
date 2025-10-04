import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { QueueService } from '../services/queue.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PlanningService', () => {
  let service: PlanningService;
  let prismaService: PrismaService;
  let queueService: QueueService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'STUDENT',
  };

  const mockPlan = {
    id: 'plan-123',
    userId: 'user-123',
    title: 'Test Plan',
    description: 'Test Description',
    type: 'WEEKLY',
    subjects: ['Matematik', 'Fizik'],
    goals: ['Hedef 1', 'Hedef 2'],
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    plan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    studySession: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    prismaService = module.get<PrismaService>(PrismaService);
    queueService = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPlans', () => {
    it('should return user plans successfully', async () => {
      const userId = 'user-123';
      const mockPlans = [mockPlan];

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.getUserPlans(userId);

      expect(result).toEqual(mockPlans);
      expect(mockPrismaService.plan.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no plans found', async () => {
      const userId = 'user-123';

      mockPrismaService.plan.findMany.mockResolvedValue([]);

      const result = await service.getUserPlans(userId);

      expect(result).toEqual([]);
    });
  });

  // getPlanById method doesn't exist in PlanningService, skipping this test

  describe('generatePlan', () => {
    it('should add job to queue for plan generation', async () => {
      const userId = 'user-123';
      const planData = {
        mode: 'ai' as any,
        planDurationWeeks: 4,
        planFocus: 'YKS hazırlık',
        subjects: ['Matematik', 'Fizik'],
        goals: ['Hedef 1'],
      };

      mockQueueService.addJob.mockResolvedValue({ id: 'job-123' });

      const result = await service.generatePlan(planData);

      expect(result).toHaveProperty('jobId');
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        'generate-plan',
        expect.objectContaining({
          userId,
          planData,
        }),
      );
    });
  });

  describe('updatePlan', () => {
    it('should update plan successfully', async () => {
      const planId = 'plan-123';
      const updateData = {
        title: 'Updated Plan',
        description: 'Updated Description',
      };

      const updatedPlan = { ...mockPlan, ...updateData };

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.plan.update.mockResolvedValue(updatedPlan);

      const result = await service.updatePlan('user123', planId, updateData);

      expect(result).toEqual(updatedPlan);
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: updateData,
      });
    });

    it('should throw NotFoundException if plan not found', async () => {
      const planId = 'non-existent-plan';
      const updateData = { title: 'Updated Plan' };

      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.updatePlan('user123', planId, updateData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deletePlan', () => {
    it('should delete plan successfully', async () => {
      const planId = 'plan-123';

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.plan.delete.mockResolvedValue(mockPlan);

      const result = await service.deletePlan('user123', planId);

      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.plan.delete).toHaveBeenCalledWith({
        where: { id: planId },
      });
    });

    it('should throw NotFoundException if plan not found', async () => {
      const planId = 'non-existent-plan';

      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.deletePlan('user123', planId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
