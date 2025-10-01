import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { MetricsService } from '../monitoring/metrics.service';

describe('QueueService', () => {
  let service: QueueService;
  const mockMetrics = { recordQueueSize: jest.fn() } as any as MetricsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueService, { provide: MetricsService, useValue: mockMetrics }],
    }).compile();

    service = module.get(QueueService);
    // DLQ ve queues sahtele
    (service as any).dlqQueues = { replan: { add: jest.fn() }, 'generate-plan': { add: jest.fn() } };
  });

  it('enqueueToDlq: doğru DLQ kuyruğuna doğru formatta ekler', async () => {
    const payload = { x: 1 };
    await service.enqueueToDlq('replan', payload as any, 'boom', 2);
    expect((service as any).dlqQueues.replan.add).toHaveBeenCalledWith('replan:dlq', expect.objectContaining({ x: 1, _dlq: expect.any(Object) }), { removeOnComplete: 1000, removeOnFail: 1000 });
  });
});


