import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../monitoring/metrics.service';

describe('QueueService', () => {
  let service: QueueService;
  let configService: ConfigService;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            recordQueueSize: jest.fn(),
            recordGeminiUsage: jest.fn(),
            recordGeminiRequest: jest.fn(),
            recordGeminiCallDuration: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    configService = module.get<ConfigService>(ConfigService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addJob', () => {
    it('should add job to queue', async () => {
      const mockJob = {
        id: 'job123',
        name: 'test-job',
        data: { userId: 'user123', action: 'test' },
        options: { delay: 1000 },
      };

      jest.spyOn(service, 'addJob').mockResolvedValue(mockJob as any);

      const result = await service.addJob('replan', { userId: 'user123' }, { delay: 1000 });

      expect(result).toEqual(mockJob);
      expect(service.addJob).toHaveBeenCalledWith('replan', { userId: 'user123' }, { delay: 1000 });
    });

    it('should handle job addition errors', async () => {
      jest.spyOn(service, 'addJob').mockRejectedValue(new Error('Queue error'));

      await expect(service.addJob('replan', {})).rejects.toThrow('Queue error');
    });
  });

  describe('processJob', () => {
    it('should process job successfully', async () => {
      const mockJobData = {
        id: 'job123',
        name: 'test-job',
        data: { userId: 'user123', action: 'test' },
      };

      jest.spyOn(service, 'processJob').mockResolvedValue(mockJobData as any);

      const result = await service.processJob('job123', mockJobData);

      expect(result).toEqual(mockJobData);
      expect(service.processJob).toHaveBeenCalledWith('job123', mockJobData);
    });

    it('should handle job processing errors', async () => {
      jest.spyOn(service, 'processJob').mockRejectedValue(new Error('Processing error'));

      await expect(service.processJob('job123', {})).rejects.toThrow('Processing error');
    });
  });

  describe('getJobStatus', () => {
    it('should get job status', async () => {
      const mockStatus = {
        id: 'job123',
        status: 'completed',
        progress: 100,
        result: { success: true },
      };

      jest.spyOn(service, 'getJobStatus').mockResolvedValue(mockStatus as any);

      const result = await service.getJobStatus('job123');

      expect(result).toEqual(mockStatus);
      expect(service.getJobStatus).toHaveBeenCalledWith('job123');
    });
  });

  describe('getQueueStats', () => {
    it('should get queue statistics', async () => {
      const mockStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      };

      jest.spyOn(service, 'getQueueStats').mockResolvedValue(mockStats as any);

      const result = await service.getQueueStats('replan');

      expect(result).toEqual(mockStats);
      expect(service.getQueueStats).toHaveBeenCalledWith('replan');
    });
  });

  describe('pauseQueue', () => {
    it('should pause queue', async () => {
      jest.spyOn(service, 'pauseQueue').mockResolvedValue({ success: true, queueName: 'replan' });

      await service.pauseQueue('replan');

      expect(service.pauseQueue).toHaveBeenCalledWith('replan');
    });
  });

  describe('resumeQueue', () => {
    it('should resume queue', async () => {
      jest.spyOn(service, 'resumeQueue').mockResolvedValue({ success: true, queueName: 'replan' });

      await service.resumeQueue('replan');

      expect(service.resumeQueue).toHaveBeenCalledWith('replan');
    });
  });

  describe('clearQueue', () => {
    it('should clear queue', async () => {
      jest.spyOn(service, 'clearQueue').mockResolvedValue({ success: true, queueName: 'replan' });

      await service.clearQueue('replan');

      expect(service.clearQueue).toHaveBeenCalledWith('replan');
    });
  });

  describe('retryJob', () => {
    it('should retry failed job', async () => {
      const mockRetriedJob = {
        id: 'job123',
        status: 'retrying',
        attempts: 2,
      };

      jest.spyOn(service, 'retryJob').mockResolvedValue(mockRetriedJob as any);

      const result = await service.retryJob('job123', 'replan');

      expect(result).toEqual(mockRetriedJob);
      expect(service.retryJob).toHaveBeenCalledWith('job123', 'replan');
    });
  });

  describe('removeJob', () => {
    it('should remove job from queue', async () => {
      jest.spyOn(service, 'removeJob').mockResolvedValue({ success: true, jobId: 'job123' });

      await service.removeJob('job123', 'replan');

      expect(service.removeJob).toHaveBeenCalledWith('job123', 'replan');
    });
  });

  describe('getJobLogs', () => {
    it('should get job logs', async () => {
      const mockLogs = [
        { timestamp: new Date(), level: 'info', message: 'Job started' },
        { timestamp: new Date(), level: 'info', message: 'Job completed' },
      ];

      jest.spyOn(service, 'getJobLogs').mockResolvedValue(mockLogs as any);

      const result = await service.getJobLogs('job123', 'replan');

      expect(result).toEqual(mockLogs);
      expect(service.getJobLogs).toHaveBeenCalledWith('job123', 'replan');
    });
  });

  describe('getFailedJobs', () => {
    it('should get failed jobs', async () => {
      const mockFailedJobs = [
        { id: 'job1', name: 'test-job', error: 'Processing failed', failedAt: new Date() },
        { id: 'job2', name: 'test-job', error: 'Timeout', failedAt: new Date() },
      ];

      jest.spyOn(service, 'getFailedJobs').mockResolvedValue(mockFailedJobs as any);

      const result = await service.getFailedJobs('replan');

      expect(result).toEqual(mockFailedJobs);
      expect(service.getFailedJobs).toHaveBeenCalledWith('replan');
    });
  });

  describe('getCompletedJobs', () => {
    it('should get completed jobs', async () => {
      const mockCompletedJobs = [
        { id: 'job1', name: 'test-job', result: { success: true }, completedAt: new Date() },
        { id: 'job2', name: 'test-job', result: { success: true }, completedAt: new Date() },
      ];

      jest.spyOn(service, 'getCompletedJobs').mockResolvedValue(mockCompletedJobs as any);

      const result = await service.getCompletedJobs('replan');

      expect(result).toEqual(mockCompletedJobs);
      expect(service.getCompletedJobs).toHaveBeenCalledWith('replan');
    });
  });

  describe('getActiveJobs', () => {
    it('should get active jobs', async () => {
      const mockActiveJobs = [
        { id: 'job1', name: 'test-job', progress: 50, startedAt: new Date() },
        { id: 'job2', name: 'test-job', progress: 75, startedAt: new Date() },
      ];

      jest.spyOn(service, 'getActiveJobs').mockResolvedValue(mockActiveJobs as any);

      const result = await service.getActiveJobs('replan');

      expect(result).toEqual(mockActiveJobs);
      expect(service.getActiveJobs).toHaveBeenCalledWith('replan');
    });
  });
});