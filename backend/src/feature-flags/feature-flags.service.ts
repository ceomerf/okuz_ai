import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  config: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeatureFlagDto {
  name: string;
  description: string;
  isActive?: boolean;
  config?: any;
}

export interface UpdateFeatureFlagDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  config?: any;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFeatureFlags(options: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  } = {}) {
    const { page = 1, limit = 10, search, isActive } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [flags, total] = await Promise.all([
      this.prisma.featureFlag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.featureFlag.count({ where }),
    ]);

    return {
      flags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getFeatureFlagById(id: string): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { id },
    });

    if (!flag) {
      throw new Error('Feature flag not found');
    }

    return flag;
  }

  async getFeatureFlagByName(name: string): Promise<FeatureFlag | null> {
    return this.prisma.featureFlag.findUnique({
      where: { name },
    });
  }

  async createFeatureFlag(data: CreateFeatureFlagDto): Promise<FeatureFlag> {
    return this.prisma.featureFlag.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        config: data.config ?? {},
      },
    });
  }

  async updateFeatureFlag(id: string, data: UpdateFeatureFlagDto): Promise<FeatureFlag> {
    return this.prisma.featureFlag.update({
      where: { id },
      data,
    });
  }

  async deleteFeatureFlag(id: string): Promise<void> {
    await this.prisma.featureFlag.delete({
      where: { id },
    });
  }

  async toggleFeatureFlag(id: string): Promise<FeatureFlag> {
    const flag = await this.getFeatureFlagById(id);
    return this.updateFeatureFlag(id, { isActive: !flag.isActive });
  }

  async isFeatureEnabled(name: string): Promise<boolean> {
    const flag = await this.getFeatureFlagByName(name);
    return flag?.isActive ?? false;
  }

  async getFeatureFlagValue(name: string, defaultValue: any = null): Promise<any> {
    const flag = await this.getFeatureFlagByName(name);
    return flag?.isActive ? flag.config : defaultValue;
  }

  async getActiveFeatureFlags(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getFeatureFlagStats() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.featureFlag.count(),
      this.prisma.featureFlag.count({ where: { isActive: true } }),
      this.prisma.featureFlag.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}
