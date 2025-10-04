import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { MetricsService } from '../monitoring/metrics.service';

// Mock Redis
jest.mock('ioredis', () => {
  const MockIORedis = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    flushall: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    ping: jest.fn(),
  }));
  
  return { default: MockIORedis };
});

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock the events object
const mockEvents = {
  'replan': { 
    on: jest.fn().mockImplementation((event, callback) => {
      // Mock event listener
    })
  },
  'generate-plan': { 
    on: jest.fn().mockImplementation((event, callback) => {
      // Mock event listener
    })
  }
};

describe('QueueService', () => {
  let service: QueueService;
  const mockMetrics = { recordQueueSize: jest.fn() } as any as MetricsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    
    // Mock the QueueService constructor to avoid bindEventListeners
    const originalQueueService = QueueService;
    jest.spyOn(QueueService.prototype as any, 'bindEventListeners').mockImplementation(() => {});
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueService, { provide: MetricsService, useValue: mockMetrics }],
    }).compile();

    service = module.get(QueueService);
    // DLQ ve queues sahtele
    (service as any).dlqQueues = { replan: { add: jest.fn() }, 'generate-plan': { add: jest.fn() } };
    // Mock events
    (service as any).events = mockEvents;
  });

  it('enqueueToDlq: doğru DLQ kuyruğuna doğru formatta ekler', async () => {
    const payload = { x: 1 };
    await service.enqueueToDlq('replan', payload as any, 'boom', 2);
    expect((service as any).dlqQueues.replan.add).toHaveBeenCalledWith('replan:dlq', expect.objectContaining({ x: 1, _dlq: expect.any(Object) }), { removeOnComplete: 1000, removeOnFail: 1000 });
  });
});


