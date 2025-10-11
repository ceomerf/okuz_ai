import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  template: string; // Prisma: AiPromptTemplate.template
  variables: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersion {
  id: string;
  templateId: string;
  version: string;
  content: string;
  variables: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptTestResult {
  templateId: string;
  version: string;
  testCase: string;
  input: Record<string, any>;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  duration: number;
  tokens: number;
  cost: number;
  timestamp: Date;
}

@Injectable()
export class PromptVersioningService {
  private readonly logger = new Logger(PromptVersioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cache?: CacheService,
  ) {}

  /**
   * Prompt template oluştur
   */
  async createTemplate(data: {
    name: string;
    content: string;
    variables: string[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<PromptTemplate> {
    try {
      this.logger.log(`Creating prompt template: ${data.name}`);

      const template = await (this.prisma as any).aiPromptTemplate.create({
        data: {
          name: data.name,
          template: data.content,
          type: 'generic',
          variables: data.variables,
          // Prisma şemasında model/temperature/maxTokens alanları bulunmuyor
          version: '1.0.0',
          isActive: true,
        },
      });

      // Cache'i temizle
      await this.cache?.del(`prompt:template:${template.id}`);

      this.logger.log(`Prompt template created: ${template.id}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to create prompt template: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Prompt template güncelle
   */
  async updateTemplate(
    templateId: string,
    data: {
      content?: string;
      variables?: string[];
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<PromptTemplate> {
    try {
      this.logger.log(`Updating prompt template: ${templateId}`);

      // Mevcut template'i al
      const existingTemplate = await (this.prisma as any).aiPromptTemplate.findUnique({
        where: { id: templateId },
      });

      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      // Yeni version oluştur
      const newVersion = this.incrementVersion(existingTemplate.version);

      const updatedTemplate = await (this.prisma as any).aiPromptTemplate.update({
        where: { id: templateId },
        data: {
          ...(data.content !== undefined ? { template: data.content } : {}),
          ...(data.variables !== undefined ? { variables: data.variables } : {}),
          // model/temperature/maxTokens veri tabanında yok; runtime'da varsayılan kullan
          version: newVersion,
          updatedAt: new Date(),
        },
      });

      // Cache'i temizle
      await this.cache?.del(`prompt:template:${templateId}`);

      this.logger.log(`Prompt template updated: ${templateId} to version ${newVersion}`);
      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update prompt template: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Prompt template'i al
   */
  async getTemplate(templateId: string, version?: string): Promise<PromptTemplate | null> {
    try {
      const cacheKey = `prompt:template:${templateId}:${version || 'latest'}`;
      
      // Cache kontrolü
      const cached = await this.cache?.get<PromptTemplate>(cacheKey);
      if (cached) {
        return cached;
      }

      const where: any = { id: templateId };
      if (version) {
        where.version = version;
      }

      const template = await (this.prisma as any).aiPromptTemplate.findFirst({
        where,
        orderBy: version ? undefined : { updatedAt: 'desc' },
      });

      if (template) {
        // Cache'e kaydet
        await this.cache?.set(cacheKey, template, 3600); // 1 saat
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to get prompt template: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Prompt template'i isimle al
   */
  async getTemplateByName(name: string, version?: string): Promise<PromptTemplate | null> {
    try {
      const cacheKey = `prompt:template:name:${name}:${version || 'latest'}`;
      
      // Cache kontrolü
      const cached = await this.cache?.get<PromptTemplate>(cacheKey);
      if (cached) {
        return cached;
      }

      const where: any = { name };
      if (version) {
        where.version = version;
      }

      const template = await (this.prisma as any).aiPromptTemplate.findFirst({
        where,
        orderBy: version ? undefined : { updatedAt: 'desc' },
      });

      if (template) {
        // Cache'e kaydet
        await this.cache?.set(cacheKey, template, 3600); // 1 saat
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to get prompt template by name: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Prompt template'leri listele
   */
  async listTemplates(options: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
  } = {}): Promise<PromptTemplate[]> {
    try {
      const { limit = 50, offset = 0, isActive } = options;

      const templates = await (this.prisma as any).aiPromptTemplate.findMany({
        where: isActive !== undefined ? { isActive } : undefined,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return templates;
    } catch (error) {
      this.logger.error(`Failed to list prompt templates: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Prompt template'i render et
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
    version?: string
  ): Promise<{
    content: string;
    model: string;
    temperature: number;
    maxTokens: number;
    variables: string[];
  }> {
    try {
      const template = await this.getTemplate(templateId, version);
      if (!template) {
        throw new Error('Template not found');
      }

      // Template'i render et
      // Prisma modelinde içerik 'template' alanında tutuluyor
      let renderedContent = (template as any).template ?? '';
      const templateVariables = template.variables;

      // Eksik değişkenleri kontrol et
      const missingVariables = templateVariables.filter(v => !(v in variables));
      if (missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
      }

      // Değişkenleri değiştir
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        renderedContent = renderedContent.replace(new RegExp(placeholder, 'g'), String(value));
      }

      return {
        content: renderedContent,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 512,
        variables: templateVariables,
      };
    } catch (error) {
      this.logger.error(`Failed to render template: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Prompt template'i test et
   */
  async testTemplate(
    templateId: string,
    testCases: Array<{
      name: string;
      input: Record<string, any>;
      expectedOutput: string;
    }>,
    version?: string
  ): Promise<PromptTestResult[]> {
    try {
      this.logger.log(`Testing prompt template: ${templateId}`);

      const results: PromptTestResult[] = [];

      for (const testCase of testCases) {
        try {
          const startTime = Date.now();
          
          // Template'i render et
          const rendered = await this.renderTemplate(templateId, testCase.input, version);
          
          // AI çağrısı yap (test için)
          // Bu kısım gerçek AI çağrısı yapmak yerine mock response döndürebilir
          const mockResponse = `Test response for: ${testCase.name}`;
          
          const duration = Date.now() - startTime;
          const passed = mockResponse.includes(testCase.expectedOutput);

          results.push({
            templateId,
            version: version || 'latest',
            testCase: testCase.name,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: mockResponse,
            passed,
            duration,
            tokens: 100, // Mock token count
            cost: 0.001, // Mock cost
            timestamp: new Date(),
          });
        } catch (error) {
          this.logger.error(`Test case failed: ${testCase.name}`, { error: error instanceof Error ? error.message : String(error) });
          
          results.push({
            templateId,
            version: version || 'latest',
            testCase: testCase.name,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: `Error: ${error instanceof Error ? error.message : String(error)}`,
            passed: false,
            duration: 0,
            tokens: 0,
            cost: 0,
            timestamp: new Date(),
          });
        }
      }

      this.logger.log(`Template testing completed: ${results.length} test cases`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to test template: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Prompt template'i deaktive et
   */
  async deactivateTemplate(templateId: string): Promise<void> {
    try {
      await (this.prisma as any).aiPromptTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
      });

      // Cache'i temizle
      await this.cache?.del(`prompt:template:${templateId}`);

      this.logger.log(`Prompt template deactivated: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate template: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Prompt template'i sil
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await (this.prisma as any).aiPromptTemplate.delete({
        where: { id: templateId },
      });

      // Cache'i temizle
      await this.cache?.del(`prompt:template:${templateId}`);

      this.logger.log(`Prompt template deleted: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete template: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Version numarasını artır
   */
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    parts[2]++; // Patch version
    return parts.join('.');
  }

  /**
   * Template istatistikleri
   */
  async getTemplateStatistics(templateId: string): Promise<{
    totalVersions: number;
    activeVersion: string;
    lastUpdated: Date;
    usageCount: number;
  }> {
    try {
      const template = await (this.prisma as any).aiPromptTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Usage count (AI request logs'dan)
      const usageCount = await (this.prisma as any).aiRequestLog.count({
        where: { promptType: template.name },
      });

      return {
        totalVersions: 1, // Bu kısım gerçek implementasyonda version tablosundan alınacak
        activeVersion: template.version,
        lastUpdated: template.updatedAt,
        usageCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get template statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
