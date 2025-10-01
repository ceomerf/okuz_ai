import { Test, TestingModule } from '@nestjs/testing';
import { ReplanService } from './replan.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlanningService } from './planning.service';
import { QueueService } from '../services/queue.service';
import { MetricsService } from '../monitoring/metrics.service';

describe('ReplanService', () => {
  let service: ReplanService;
  const mockPrisma = { plan: { findMany: jest.fn() }, studySession: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() } } as any as PrismaService;
  const mockPlanning = { analyzeUserContext: jest.fn() } as any as PlanningService;
  const mockQueue = { addJob: jest.fn(), getConnection: jest.fn() } as any as QueueService;
  const mockMetrics = { recordCronJobDuration: jest.fn(), recordQueueProcessingTime: jest.fn() } as any as MetricsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlanningService, useValue: mockPlanning },
        { provide: QueueService, useValue: mockQueue },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get(ReplanService);
    // Redis mock
    (service as any).redis = { set: jest.fn(), del: jest.fn() };
  });

  it('Cron Lock: NX/EX ile kilit alır, yoksa çıkar; finally del çağrılır', async () => {
    ((service as any).redis.set as jest.Mock).mockResolvedValueOnce('OK');
    ((service as any).redis.del as jest.Mock).mockResolvedValueOnce(1);
    jest.spyOn<any, any>(service as any, 'enqueueReevaluationJobs').mockResolvedValueOnce(undefined);

    await service.dailyReevaluationJob();
    expect((service as any).redis.set).toHaveBeenCalledWith('cron:dailyReevaluationJob:lock', '1', 'EX', 3600, 'NX');
    expect((service as any).redis.del).toHaveBeenCalledWith('cron:dailyReevaluationJob:lock');

    // Kilit zaten varsa
    ((service as any).redis.set as jest.Mock).mockResolvedValueOnce(null);
    await service.dailyReevaluationJob();
  });

  it('Idempotent jobId: scope:userId:planId:bucket', async () => {
    const today = new Date().toISOString().slice(0, 10);
    (mockPrisma as any).plan.findMany = jest.fn().mockResolvedValue([{ id: 'p1', userId: 'u1' }]);
    await service.enqueueReevaluationJobs('daily');
    expect(mockQueue.addJob).toHaveBeenCalledWith('replan', { scope: 'daily', userId: 'u1', planId: 'p1' }, expect.objectContaining({ jobId: `daily:u1:p1:${today}` }));
  });
});


