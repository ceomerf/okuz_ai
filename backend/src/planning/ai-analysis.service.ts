import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../services/openai.service';
import { MetricsService } from '../monitoring/metrics.service';

@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly openaiService: OpenAIService,
    private readonly metrics: MetricsService,
  ) {}

  async generateContentWithRetry(prompt: string, maxRetries = 2, initialDelayMs = 1000): Promise<string> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: any;
    let success = false;

    while (attempt <= maxRetries) {
      try {
        const result = await this.openaiService.generateContent(prompt);
        success = true;
        return result;
      } catch (err: any) {
        lastError = err;
        const status = (err && err.status) || (err && err.response && err.response.status);
        const isTransient = status ? (status >= 500 || status === 429) : true;
        if (!isTransient || attempt === maxRetries) {
          break;
        }
        const backoff = initialDelayMs * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, backoff));
        attempt++;
      }
    }

    const duration = Date.now() - startTime;
    this.metrics.recordAiApiCall('openai', duration, success);

    throw lastError || new Error('OpenAIService request failed');
  }

  cleanAiJsonResponse(text: string): string {
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    if (cleaned.includes('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  extractFirstJsonBlock(text: string): string | null {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      return null;
    }
    
    return text.substring(jsonStart, jsonEnd + 1);
  }

  async analyzeUser(userContext: any, data: any): Promise<any> {
    const prompt = `
    Kullanıcı profil analizi yap:
    
    Profil: ${JSON.stringify(userContext)}
    Plan verileri: ${JSON.stringify(data)}
    
    Analiz et:
    1. Öğrenme stili
    2. Güçlü/zayıf alanlar
    3. Hedefler
    4. Zaman kısıtları
    5. Tercihler
    
    JSON formatında döndür.
    `;

    const response = await this.generateContentWithRetry(prompt);
    const cleaned = this.cleanAiJsonResponse(response);
    
    try {
      return JSON.parse(cleaned);
    } catch {
      const block = this.extractFirstJsonBlock(response);
      return block ? JSON.parse(block) : null;
    }
  }
}
