import { Test, TestingModule } from '@nestjs/testing';
import { DigitalDossierService } from './digital-dossier.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('DigitalDossierService', () => {
  let service: DigitalDossierService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalDossierService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            studySession: {
              findMany: jest.fn(),
            },
            examResult: {
              findMany: jest.fn(),
            },
            plan: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DigitalDossierService>(DigitalDossierService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildUserDossier', () => {
    it('should build user dossier successfully', async () => {
      const mockUser = {
        id: 'user123',
        name: 'Test User',
        role: 'STUDENT',
        studentProfile: {
          grade: 10,
          field: 'Science',
          learningStyle: 'Visual',
          goals: ['Get high score'],
          weaknesses: ['Math'],
          interests: ['Physics'],
        },
      };

      const mockSessions = [
        {
          startTime: new Date(),
          endTime: new Date(),
          subject: 'Math',
          topic: 'Algebra',
          duration: 60,
          isCompleted: true,
          metadata: { feedback: 'Good', plannedDuration: 60, avgBreakMinutes: 5 },
        },
      ];

      const mockExams = [
        {
          createdAt: new Date(),
          subject: 'Math',
          examType: 'Quiz',
          score: 85,
          totalScore: 100,
          analysis: { strengths: ['Algebra'], weaknesses: ['Geometry'] },
        },
      ];

      const mockPlans = [
        {
          id: 'plan123',
          createdAt: new Date(),
          isActive: true,
          type: 'Weekly',
          subjects: ['Math'],
          goals: ['Complete Algebra'],
          metadata: { version: '1.0' },
        },
      ];

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.studySession, 'findMany').mockResolvedValue(mockSessions as any);
      jest.spyOn(prismaService.examResult, 'findMany').mockResolvedValue(mockExams as any);
      jest.spyOn(prismaService.plan, 'findMany').mockResolvedValue(mockPlans as any);

      const result = await service.buildUserDossier('user123', 60);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('USER PROFILE');
      expect(result).toContain('Test User');
      expect(result).toContain('STUDY SESSIONS');
      expect(result).toContain('EXAMS');
      expect(result).toContain('PLANS');
    });

    it('should handle missing user data gracefully', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.studySession, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.examResult, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.plan, 'findMany').mockResolvedValue([]);

      const result = await service.buildUserDossier('user123', 60);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle empty sessions, exams, and plans', async () => {
      const mockUser = {
        id: 'user123',
        name: 'Test User',
        role: 'STUDENT',
        studentProfile: null,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.studySession, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.examResult, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.plan, 'findMany').mockResolvedValue([]);

      const result = await service.buildUserDossier('user123', 30);

      expect(result).toBeDefined();
      expect(result).toContain('STUDY SESSIONS');
      expect(result).toContain('EXAMS');
      expect(result).toContain('PLANS');
    });

    it('should use default lookback days of 60', async () => {
      const mockUser = {
        id: 'user123',
        name: 'Test User',
        role: 'STUDENT',
        studentProfile: null,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.studySession, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.examResult, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.plan, 'findMany').mockResolvedValue([]);

      const result = await service.buildUserDossier('user123');

      expect(result).toBeDefined();
      expect(prismaService.studySession.findMany).toHaveBeenCalled();
    });

    it('should handle errors during dossier building', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockRejectedValue(new Error('Database error'));

      await expect(service.buildUserDossier('user123')).rejects.toThrow('Database error');
    });
  });
});
