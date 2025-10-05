import { Test, TestingModule } from '@nestjs/testing';
import { ProgressTrackingService } from './progress-tracking.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('ProgressTrackingService', () => {
  let service: ProgressTrackingService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressTrackingService,
        {
          provide: PrismaService,
          useValue: {
            studySession: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            studentProfile: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProgressTrackingService>(ProgressTrackingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackProgress', () => {
    it('should track progress successfully for high score', async () => {
      const mockSession = {
        id: 'session123',
        userId: 'user123',
        subject: 'Math',
        topic: 'Algebra',
        startTime: new Date(),
        duration: 60,
      };

      const mockUser = {
        id: 'user123',
        studentProfile: {
          userId: 'user123',
          performanceMetrics: {
            totalSessions: 5,
            averageScore: 75,
            totalTimeSpent: 300,
          },
        },
      };

      jest.spyOn(prismaService.studySession, 'findFirst').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.studySession, 'update').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.studentProfile, 'update').mockResolvedValue({} as any);

      const result = await service.trackProgress('user123', 'session123', {
        score: 90,
        timeSpent: 60,
        notes: 'Great session',
      });

      expect(result.success).toBe(true);
      expect(result.adjustment.action).toBe('increase_difficulty');
      expect(prismaService.studySession.update).toHaveBeenCalledWith({
        where: { id: 'session123' },
        data: expect.objectContaining({
          performance: 90,
          isCompleted: true,
        }),
      });
    });

    it('should track progress for medium score', async () => {
      const mockSession = {
        id: 'session123',
        userId: 'user123',
        subject: 'Math',
        topic: 'Algebra',
        startTime: new Date(),
        duration: 60,
      };

      jest.spyOn(prismaService.studySession, 'findFirst').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.studySession, 'update').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({ studentProfile: null } as any);

      const result = await service.trackProgress('user123', 'session123', {
        score: 75,
        timeSpent: 60,
      });

      expect(result.success).toBe(true);
      expect(result.adjustment.action).toBe('maintain_difficulty');
    });

    it('should track progress for low score', async () => {
      const mockSession = {
        id: 'session123',
        userId: 'user123',
        subject: 'Math',
        topic: 'Algebra',
        startTime: new Date(),
        duration: 60,
      };

      jest.spyOn(prismaService.studySession, 'findFirst').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.studySession, 'update').mockResolvedValue(mockSession as any);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({ studentProfile: null } as any);

      const result = await service.trackProgress('user123', 'session123', {
        score: 45,
        timeSpent: 60,
      });

      expect(result.success).toBe(true);
      expect(result.adjustment.action).toBe('review_fundamentals');
    });

    it('should throw error if session not found', async () => {
      jest.spyOn(prismaService.studySession, 'findFirst').mockResolvedValue(null);

      await expect(
        service.trackProgress('user123', 'session123', {
          score: 80,
          timeSpent: 60,
        })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('calculateDifficultyAdjustment', () => {
    it('should suggest increase for high scores (>= 85)', () => {
      const result = service['calculateDifficultyAdjustment'](90);

      expect(result.action).toBe('increase_difficulty');
      expect(result.newDifficulty).toBe('hard');
    });

    it('should suggest maintain for good scores (70-84)', () => {
      const result = service['calculateDifficultyAdjustment'](75);

      expect(result.action).toBe('maintain_difficulty');
    });

    it('should suggest decrease for moderate scores (50-69)', () => {
      const result = service['calculateDifficultyAdjustment'](60);

      expect(result.action).toBe('decrease_difficulty');
      expect(result.newDifficulty).toBe('easy');
    });

    it('should suggest review for low scores (< 50)', () => {
      const result = service['calculateDifficultyAdjustment'](40);

      expect(result.action).toBe('review_fundamentals');
      expect(result.newDifficulty).toBe('easy');
    });
  });

  describe('generateNextSteps', () => {
    it('should generate next steps for high score', () => {
      const result = service['generateNextSteps'](90, 'Math');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate next steps for medium score', () => {
      const result = service['generateNextSteps'](75, 'Math');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should generate next steps for low score', () => {
      const result = service['generateNextSteps'](40, 'Math');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateUserPerformanceMetrics', () => {
    it('should update performance metrics for existing user', async () => {
      const mockUser = {
        id: 'user123',
        studentProfile: {
          userId: 'user123',
          performanceMetrics: {
            totalSessions: 10,
            averageScore: 75,
            totalTimeSpent: 600,
          },
        },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.studentProfile, 'update').mockResolvedValue({} as any);

      await service['updateUserPerformanceMetrics']('user123', 85, 60);

      expect(prismaService.studentProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        data: expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            totalSessions: 11,
            totalTimeSpent: 660,
          }),
        }),
      });
    });

    it('should handle user without student profile', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({ studentProfile: null } as any);

      await service['updateUserPerformanceMetrics']('user123', 85, 60);

      expect(prismaService.studentProfile.update).not.toHaveBeenCalled();
    });

    it('should initialize metrics for user with no previous metrics', async () => {
      const mockUser = {
        id: 'user123',
        studentProfile: {
          userId: 'user123',
          performanceMetrics: null,
        },
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.studentProfile, 'update').mockResolvedValue({} as any);

      await service['updateUserPerformanceMetrics']('user123', 80, 45);

      expect(prismaService.studentProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        data: expect.objectContaining({
          performanceMetrics: expect.objectContaining({
            totalSessions: 1,
            averageScore: 80,
            totalTimeSpent: 45,
          }),
        }),
      });
    });
  });
});
