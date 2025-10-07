import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions } from '../guards/rate-limit.guard';

/**
 * Auth endpoint'ler için özel rate limiting
 */
export const AuthRateLimit = () => SetMetadata('rateLimit', {
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 5 deneme
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: any) => `auth:${req.ip}:${req.path}`,
  onLimitReached: (req: any, res: any) => {
    // Auth rate limit aşıldığında özel işlemler
    console.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
  }
} as RateLimitOptions);

/**
 * API endpoint'ler için rate limiting
 */
export const ApiRateLimit = () => SetMetadata('rateLimit', {
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // 100 istek
  message: 'Too many API requests, please try again later',
  keyGenerator: (req: any) => {
    const userId = req.user?.id;
    return userId ? `api:user:${userId}` : `api:ip:${req.ip}`;
  }
} as RateLimitOptions);

/**
 * AI endpoint'ler için özel rate limiting
 */
export const AIRateLimit = () => SetMetadata('rateLimit', {
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 20, // 20 AI isteği
  message: 'AI request limit exceeded, please try again later',
  keyGenerator: (req: any) => {
    const userId = req.user?.id;
    return userId ? `ai:user:${userId}` : `ai:ip:${req.ip}`;
  }
} as RateLimitOptions);

/**
 * Genel rate limiting
 */
export const GeneralRateLimit = () => SetMetadata('rateLimit', {
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 200, // 200 istek
  message: 'Rate limit exceeded, please try again later'
} as RateLimitOptions);
