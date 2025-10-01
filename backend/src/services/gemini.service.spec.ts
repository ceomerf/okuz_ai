import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../monitoring/metrics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from './cache.service';
import { ForbiddenException } from '@nestjs/common';

describe('GeminiService', () => {
  let service: GeminiService;
  const mockConfig = { get: jest.fn((k: string) => (k === 'GEMINI_API_KEY' ? 'key' : 'gemini-2.0-flash')) } as any as ConfigService;
  const mockMetrics = {
    recordGeminiUsage: jest.fn(),
    recordGeminiCallDuration: jest.fn(),
    recordGeminiRequest: jest.fn(),
    recordCacheHit: jest.fn(),
  } as any as MetricsService;
  const mockPrisma = {
    userUsageControl: { findUnique: jest.fn(), upsert: jest.fn() },
    user: { findUnique: jest.fn() },
  } as any as PrismaService;
  const mockCache = { get: jest.fn(), set: jest.fn() } as any as CacheService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: MetricsService, useValue: mockMetrics },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get(GeminiService);
    // Breaker'ı sahtele
    (service as any).breaker = { fire: jest.fn(async () => ({ response: { text: () => 'OK', usageMetadata: { totalTokenCount: 10 } } })) };
  });

  it('Kota kontrolü: limit altı başarılı, limit üstü ForbiddenException', async () => {
    (mockPrisma as any).userUsageControl.findUnique = jest.fn().mockResolvedValue({ monthlyTokenUsed: 0, monthlyTokenLimit: 100 });
    await expect(service.generateContent('hello', { userId: 'u1' })).resolves.toBe('OK');

    (mockPrisma as any).userUsageControl.findUnique = jest.fn().mockResolvedValue({ monthlyTokenUsed: 100, monthlyTokenLimit: 100 });
    await expect(service.generateContent('hello', { userId: 'u1' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Cache: ilk çağrı API, ikinci çağrı cache', async () => {
    (mockPrisma as any).userUsageControl.findUnique = jest.fn().mockResolvedValue(null);
    mockCache.get = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('OK');
    mockCache.set = jest.fn().mockResolvedValue(undefined);

    const breakerFire = jest.spyOn((service as any).breaker, 'fire');
    const first = await service.generateContent('same', { userId: 'u1' });
    const second = await service.generateContent('same', { userId: 'u1' });
    expect(first).toBe('OK');
    expect(second).toBe('OK');
    expect(breakerFire).toHaveBeenCalledTimes(1);
    expect(mockCache.get).toHaveBeenCalledTimes(2);
  });

  it('Circuit breaker: fire çağrılır, fallback simülasyonu', async () => {
    (mockPrisma as any).userUsageControl.findUnique = jest.fn().mockResolvedValue(null);
    const fire = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ response: { text: () => 'FALLBACK', usageMetadata: { totalTokenCount: 5 } } });
    (service as any).breaker = { fire };

    const res = await service.generateContent('x', { userId: 'u1' });
    expect(res).toBe('FALLBACK');
    expect(fire).toHaveBeenCalled();
  });
});


