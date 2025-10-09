import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PromptManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getPrompts(options: {
    page: number;
    limit: number;
    category?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const { page, limit, category, isActive, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const prompts = await this.prisma.aiPromptTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const total = await this.prisma.aiPromptTemplate.count({ where });

      return {
        success: true,
        data: {
          prompts,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Promptlar getirilemedi');
    }
  }

  async getPromptById(id: string) {
    try {
      const prompt = await this.prisma.aiPromptTemplate.findUnique({
        where: { id },
      });

      if (!prompt) {
        throw new NotFoundException('Prompt bulunamadı');
      }

      return {
        success: true,
        data: prompt,
      };
    } catch (error) {
      throw new BadRequestException('Prompt detayları getirilemedi');
    }
  }

  async createPrompt(createData: {
    name: string;
    category: string;
    template: string;
    variables: string[];
    description?: string;
    isActive?: boolean;
  }) {
    try {
      const prompt = await this.prisma.aiPromptTemplate.create({
        data: {
          name: createData.name,
          category: createData.category,
          template: createData.template,
          variables: createData.variables,
          description: createData.description,
          isActive: createData.isActive !== undefined ? createData.isActive : true,
          version: 1,
        },
      });

      return {
        success: true,
        message: 'Prompt başarıyla oluşturuldu',
        data: prompt,
      };
    } catch (error) {
      throw new BadRequestException('Prompt oluşturulamadı');
    }
  }

  async updatePrompt(id: string, updateData: {
    name?: string;
    category?: string;
    template?: string;
    variables?: string[];
    description?: string;
    isActive?: boolean;
  }) {
    try {
      const prompt = await this.prisma.aiPromptTemplate.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        message: 'Prompt başarıyla güncellendi',
        data: prompt,
      };
    } catch (error) {
      throw new BadRequestException('Prompt güncellenemedi');
    }
  }

  async deletePrompt(id: string) {
    try {
      await this.prisma.aiPromptTemplate.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Prompt başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Prompt silinemedi');
    }
  }

  async getPromptVersions(id: string) {
    try {
      const prompt = await this.prisma.aiPromptTemplate.findUnique({
        where: { id },
      });

      if (!prompt) {
        throw new NotFoundException('Prompt bulunamadı');
      }

      // Mock version data
      const versions = [
        {
          id: 'v1',
          version: '1.0',
          template: prompt.template,
          description: 'Initial version',
          createdAt: prompt.createdAt,
          isActive: true,
        },
        {
          id: 'v2',
          version: '2.0',
          template: prompt.template + ' (Updated)',
          description: 'Updated version',
          createdAt: new Date(),
          isActive: false,
        },
      ];

      return {
        success: true,
        data: versions,
      };
    } catch (error) {
      throw new BadRequestException('Prompt versiyonları getirilemedi');
    }
  }

  async createPromptVersion(id: string, versionData: {
    version: string;
    template: string;
    description?: string;
  }) {
    try {
      const prompt = await this.prisma.aiPromptTemplate.findUnique({
        where: { id },
      });

      if (!prompt) {
        throw new NotFoundException('Prompt bulunamadı');
      }

      // Mock version creation
      const version = {
        id: `version_${Date.now()}`,
        promptId: id,
        version: versionData.version,
        template: versionData.template,
        description: versionData.description,
        createdAt: new Date(),
        isActive: false,
      };

      return {
        success: true,
        message: 'Prompt versiyonu başarıyla oluşturuldu',
        data: version,
      };
    } catch (error) {
      throw new BadRequestException('Prompt versiyonu oluşturulamadı');
    }
  }

  async getPromptUsage(id: string) {
    try {
      const prompt = await this.prisma.aiPromptTemplate.findUnique({
        where: { id },
      });

      if (!prompt) {
        throw new NotFoundException('Prompt bulunamadı');
      }

      // Mock usage data
      const usage = {
        totalUses: 150,
        lastUsed: new Date(),
        averageResponseTime: 1200,
        successRate: 95.5,
        dailyUsage: [
          { date: '2024-01-01', uses: 10 },
          { date: '2024-01-02', uses: 15 },
          { date: '2024-01-03', uses: 12 },
        ],
      };

      return {
        success: true,
        data: usage,
      };
    } catch (error) {
      throw new BadRequestException('Prompt kullanım bilgileri getirilemedi');
    }
  }

  async getPromptPerformance(id: string) {
    try {
      const prompt = await this.prisma.aiPromptTemplate.findUnique({
        where: { id },
      });

      if (!prompt) {
        throw new NotFoundException('Prompt bulunamadı');
      }

      // Mock performance data
      const performance = {
        averageResponseTime: 1200,
        successRate: 95.5,
        errorRate: 4.5,
        totalRequests: 150,
        averageTokens: 250,
        costPerRequest: 0.001,
      };

      return {
        success: true,
        data: performance,
      };
    } catch (error) {
      throw new BadRequestException('Prompt performans bilgileri getirilemedi');
    }
  }

  async duplicatePrompt(id: string) {
    try {
      const originalPrompt = await this.prisma.aiPromptTemplate.findUnique({
        where: { id },
      });

      if (!originalPrompt) {
        throw new NotFoundException('Prompt bulunamadı');
      }

      const duplicatedPrompt = await this.prisma.aiPromptTemplate.create({
        data: {
          name: `${originalPrompt.name} (Copy)`,
          category: originalPrompt.category,
          template: originalPrompt.template,
          variables: originalPrompt.variables,
          description: originalPrompt.description,
          isActive: false,
          version: 1,
        },
      });

      return {
        success: true,
        message: 'Prompt başarıyla kopyalandı',
        data: duplicatedPrompt,
      };
    } catch (error) {
      throw new BadRequestException('Prompt kopyalanamadı');
    }
  }
}