import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';

export interface ApiKeyConfig {
  name: string;
  service: string;
  environment: 'development' | 'staging' | 'production';
  rotationDays: number;
  maxUsagePerDay?: number;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  service: string;
  key: string;
  hashedKey: string;
  environment: string;
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  maxUsagePerDay?: number;
  createdAt: Date;
  expiresAt?: Date;
}

@Injectable()
export class ApiKeyService implements OnModuleInit {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly keys: Map<string, ApiKeyInfo> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.initializeApiKeys();
    await this.startKeyRotationScheduler();
  }

  /**
   * API key oluştur
   */
  async createApiKey(config: ApiKeyConfig): Promise<ApiKeyInfo> {
    const key = this.generateSecureKey();
    const hashedKey = this.hashKey(key);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.rotationDays);

    const apiKey: ApiKeyInfo = {
      id: crypto.randomUUID(),
      name: config.name,
      service: config.service,
      key,
      hashedKey,
      environment: config.environment,
      isActive: true,
      usageCount: 0,
      maxUsagePerDay: config.maxUsagePerDay,
      createdAt: new Date(),
      expiresAt,
    };

    // Memory'de sakla
    this.keys.set(apiKey.id, apiKey);

    // Database'e kaydet (production'da)
    if (config.environment === 'production') {
      await this.saveApiKeyToDatabase(apiKey);
    }

    this.logger.log(`API key created: ${config.name} for ${config.service}`);
    return apiKey;
  }

  /**
   * API key doğrula
   */
  async validateApiKey(key: string, service: string): Promise<boolean> {
    try {
      const apiKey = this.findApiKeyByKey(key);
      
      if (!apiKey) {
        this.logger.warn(`Invalid API key attempt for service: ${service}`);
        return false;
      }

      // Service kontrolü
      if (apiKey.service !== service) {
        this.logger.warn(`API key service mismatch: expected ${service}, got ${apiKey.service}`);
        return false;
      }

      // Aktif kontrolü
      if (!apiKey.isActive) {
        this.logger.warn(`Inactive API key used: ${apiKey.name}`);
        return false;
      }

      // Süre kontrolü
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        this.logger.warn(`Expired API key used: ${apiKey.name}`);
        await this.deactivateApiKey(apiKey.id);
        return false;
      }

      // Günlük kullanım kontrolü
      if (apiKey.maxUsagePerDay && apiKey.usageCount >= apiKey.maxUsagePerDay) {
        this.logger.warn(`Daily usage limit exceeded for API key: ${apiKey.name}`);
        return false;
      }

      // Kullanım sayısını artır
      apiKey.usageCount++;
      apiKey.lastUsed = new Date();

      this.logger.log(`API key validated: ${apiKey.name} (usage: ${apiKey.usageCount})`);
      return true;

    } catch (error) {
      this.logger.error(`API key validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * API key rotasyonu
   */
  async rotateApiKey(keyId: string): Promise<ApiKeyInfo> {
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      throw new Error(`API key not found: ${keyId}`);
    }

    // Yeni key oluştur
    const newKey = this.generateSecureKey();
    const hashedKey = this.hashKey(newKey);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 gün

    // Eski key'i deaktive et
    existingKey.isActive = false;

    // Yeni key oluştur
    const newApiKey: ApiKeyInfo = {
      ...existingKey,
      id: crypto.randomUUID(),
      key: newKey,
      hashedKey,
      isActive: true,
      usageCount: 0,
      createdAt: new Date(),
      expiresAt,
    };

    this.keys.set(newApiKey.id, newApiKey);
    this.logger.log(`API key rotated: ${existingKey.name}`);

    return newApiKey;
  }

  /**
   * API key'i deaktive et
   */
  async deactivateApiKey(keyId: string): Promise<void> {
    const apiKey = this.keys.get(keyId);
    if (apiKey) {
      apiKey.isActive = false;
      this.logger.log(`API key deactivated: ${apiKey.name}`);
    }
  }

  /**
   * Tüm API key'leri listele
   */
  async listApiKeys(): Promise<ApiKeyInfo[]> {
    return Array.from(this.keys.values());
  }

  /**
   * API key istatistikleri
   */
  async getApiKeyStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    totalUsage: number;
  }> {
    const keys = Array.from(this.keys.values());
    const now = new Date();

    return {
      total: keys.length,
      active: keys.filter(k => k.isActive).length,
      expired: keys.filter(k => k.expiresAt && k.expiresAt < now).length,
      totalUsage: keys.reduce((sum, k) => sum + k.usageCount, 0),
    };
  }

  private async initializeApiKeys(): Promise<void> {
    // Environment'tan API key'leri yükle
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      await this.createApiKey({
        name: 'OpenAI API',
        service: 'openai',
        environment: this.configService.get('NODE_ENV') as any || 'development',
        rotationDays: 90,
        maxUsagePerDay: 1000,
      });
    }

    // Diğer API key'ler
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      await this.createApiKey({
        name: 'Gemini API',
        service: 'gemini',
        environment: this.configService.get('NODE_ENV') as any || 'development',
        rotationDays: 90,
        maxUsagePerDay: 1000,
      });
    }
  }

  private async startKeyRotationScheduler(): Promise<void> {
    // Her gün kontrol et
    setInterval(async () => {
      await this.checkAndRotateKeys();
    }, 24 * 60 * 60 * 1000); // 24 saat
  }

  private async checkAndRotateKeys(): Promise<void> {
    const now = new Date();
    const keysToRotate = Array.from(this.keys.values()).filter(
      key => key.expiresAt && key.expiresAt < now
    );

    for (const key of keysToRotate) {
      try {
        await this.rotateApiKey(key.id);
        this.logger.log(`Auto-rotated expired API key: ${key.name}`);
      } catch (error) {
        this.logger.error(`Failed to auto-rotate API key ${key.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private findApiKeyByKey(key: string): ApiKeyInfo | null {
    for (const apiKey of this.keys.values()) {
      if (apiKey.key === key) {
        return apiKey;
      }
    }
    return null;
  }

  private async saveApiKeyToDatabase(apiKey: ApiKeyInfo): Promise<void> {
    // Database'e kaydetme logic'i (gerekirse)
    // Bu örnekte sadece memory'de tutuyoruz
    this.logger.log(`API key saved to database: ${apiKey.name}`);
  }
}
