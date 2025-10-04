import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../monitoring/metrics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from './cache.service';
import * as crypto from 'crypto';

@Injectable()
export class OpenAIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY')!;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  async generateContent(
    prompt: string,
    opts?: { userId?: string; endpoint?: string; cacheTtlSeconds?: number; modelOverride?: string }
  ): Promise<string> {
    const userId = opts?.userId;
    const model = opts?.modelOverride || 'gpt-3.5-turbo';
    
    // Cache kontrolü
    if (userId) {
      const cacheKey = `openai:${crypto.createHash('md5').update(prompt).digest('hex')}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.metrics.recordCacheHit('openai', true);
        return cached;
      }
    }

    // Quota kontrolü - userUsageControl modeli mevcut değil, bu yüzden kaldırıldı
    // if (userId) {
    //   const usage = await this.prisma.userUsageControl?.findUnique({
    //     where: { userId },
    //   });

    //   if (usage && usage.monthlyTokenUsed >= usage.monthlyTokenLimit) {
    //     throw new ForbiddenException('Monthly token limit exceeded');
    //   }
    // }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // Cache'e kaydet
      if (userId && content) {
        const cacheKey = `openai:${crypto.createHash('md5').update(prompt).digest('hex')}`;
        await this.cache.set(cacheKey, content, opts?.cacheTtlSeconds || 3600);
      }

      // Metrics kaydet
      this.metrics.recordGeminiUsage(userId, 'openai', 'gpt-3.5-turbo', 'generateContent', content.length);
      if (userId) {
        this.metrics.recordGeminiRequest('success', 'generateContent', 'gpt-3.5-turbo');
      }

      return content;

    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API failed: ${error.message}`);
    }
  }

  async generateContentStream(
    prompt: string,
    opts?: { userId?: string; modelOverride?: string }
  ): Promise<ReadableStream> {
    const userId = opts?.userId;
    const model = opts?.modelOverride || 'gpt-3.5-turbo';

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return response.body as ReadableStream;

    } catch (error: any) {
      console.error('OpenAI Stream API Error:', error);
      throw new Error(`OpenAI Stream API failed: ${error.message}`);
    }
  }
}
