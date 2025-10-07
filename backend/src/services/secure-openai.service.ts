import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyService } from './api-key.service';
import OpenAI from 'openai';

@Injectable()
export class SecureOpenAIService implements OnModuleInit {
  private readonly logger = new Logger(SecureOpenAIService.name);
  private openai!: OpenAI;
  private readonly apiKeyService: ApiKeyService;

  constructor(
    private readonly configService: ConfigService,
    apiKeyService: ApiKeyService,
  ) {
    this.apiKeyService = apiKeyService;
  }

  async onModuleInit() {
    await this.initializeOpenAI();
  }

  private async initializeOpenAI(): Promise<void> {
    try {
      // API key'i güvenli şekilde al
      const apiKey = await this.getSecureApiKey('openai');
      
      if (!apiKey) {
        this.logger.error('OpenAI API key not found or invalid');
        return;
      }

      this.openai = new OpenAI({
        apiKey,
        timeout: 30000, // 30 saniye timeout
        maxRetries: 3,
      });

      this.logger.log('OpenAI service initialized securely');
    } catch (error) {
      this.logger.error(`Failed to initialize OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Güvenli API key alma
   */
  private async getSecureApiKey(service: string): Promise<string | null> {
    try {
      // Environment'tan al
      const envKey = this.configService.get<string>('OPENAI_API_KEY');
      
      if (envKey) {
        // API key service ile doğrula
        const isValid = await this.apiKeyService.validateApiKey(envKey, service);
        if (isValid) {
          return envKey;
        }
      }

      // Vault'tan al (production'da)
      if (this.configService.get('NODE_ENV') === 'production') {
        return await this.getApiKeyFromVault(service);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get secure API key for ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Vault'tan API key alma (production için)
   */
  private async getApiKeyFromVault(service: string): Promise<string | null> {
    try {
      // HashiCorp Vault entegrasyonu
      const vaultUrl = this.configService.get<string>('VAULT_URL');
      const vaultToken = this.configService.get<string>('VAULT_TOKEN');
      
      if (!vaultUrl || !vaultToken) {
        this.logger.warn('Vault configuration not found');
        return null;
      }

      // Vault API call
      const response = await fetch(`${vaultUrl}/v1/secret/data/${service}`, {
        headers: {
          'X-Vault-Token': vaultToken,
        },
      });

      if (response.ok) {
        const data: any = await response.json();
        return data.data.data.api_key;
      }

      return null;
    } catch (error) {
      this.logger.error(`Vault integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Güvenli OpenAI çağrısı
   */
  async secureChatCompletion(messages: any[], options: any = {}): Promise<any> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI service not initialized');
      }

      // Rate limiting kontrolü
      const isAllowed = await this.checkRateLimit();
      if (!isAllowed) {
        throw new Error('Rate limit exceeded for OpenAI API');
      }

      // Request logging
      this.logger.log(`OpenAI API call: ${messages.length} messages`);

      const response = await this.openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        ...options,
      });

      // Response logging
      this.logger.log(`OpenAI API response: ${response.usage?.total_tokens} tokens used`);

      return response;
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Rate limiting kontrolü
   */
  private async checkRateLimit(): Promise<boolean> {
    // API key service ile rate limiting kontrolü
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      return await this.apiKeyService.validateApiKey(apiKey, 'openai');
    }
    return false;
  }

  /**
   * API key rotasyonu
   */
  async rotateApiKey(): Promise<void> {
    try {
      const apiKeys = await this.apiKeyService.listApiKeys();
      const openaiKey = apiKeys.find(k => k.service === 'openai');
      
      if (openaiKey) {
        const newKey = await this.apiKeyService.rotateApiKey(openaiKey.id);
        this.logger.log(`OpenAI API key rotated: ${newKey.name}`);
        
        // Yeni key ile OpenAI'yi yeniden initialize et
        await this.initializeOpenAI();
      }
    } catch (error) {
      this.logger.error(`Failed to rotate OpenAI API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * API kullanım istatistikleri
   */
  async getUsageStats(): Promise<any> {
    try {
      const stats = await this.apiKeyService.getApiKeyStats();
      return {
        ...stats,
        service: 'openai',
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
}
