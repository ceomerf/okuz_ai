import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return hello message', () => {
      const result = service.getHello();
      expect(result).toBe('Hello World!');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = service.getHealth();
      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it('should include current timestamp', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
    });

    it('should include uptime', () => {
      const result = service.getHealth();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThan(0);
    });
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = service.getVersion();
      expect(result).toEqual({
        version: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
      });
    });

    it('should have valid version format', () => {
      const result = service.getVersion();
      expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information', () => {
      const result = service.getSystemInfo();
      expect(result).toEqual({
        platform: expect.any(String),
        nodeVersion: expect.any(String),
        memory: expect.any(Object),
        uptime: expect.any(Number),
      });
    });

    it('should include memory information', () => {
      const result = service.getSystemInfo();
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.total).toBe('number');
    });
  });
});
