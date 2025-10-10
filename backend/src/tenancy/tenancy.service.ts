import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateTenantDto {
  name: string;
  domain: string;
  subdomain?: string;
  settings?: any;
}

export interface UpdateTenantDto {
  name?: string;
  domain?: string;
  subdomain?: string;
  settings?: any;
  isActive?: boolean;
}

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);

  constructor(private prisma: PrismaService) {}

  async createTenant(tenantData: CreateTenantDto): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Validate domain uniqueness
      const existingTenant = await (this.prisma as any).tenant.findFirst({
        where: {
          OR: [
            { domain: tenantData.domain },
            { subdomain: tenantData.subdomain },
          ],
        },
      });

      if (existingTenant) {
        throw new BadRequestException('Domain or subdomain already exists');
      }

      const tenant = await (this.prisma as any).tenant.create({
        data: {
          name: tenantData.name,
          domain: tenantData.domain,
          subdomain: tenantData.subdomain,
          settings: tenantData.settings || {},
        },
      });

      this.logger.log(`Tenant created: ${tenant.id} - ${tenant.name}`);
      return { success: true, data: tenant };
    } catch (error) {
      this.logger.error('Tenant creation error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getTenantById(tenantId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const tenant = await (this.prisma as any).tenant.findUnique({
        where: { id: tenantId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              users: true,
              dashboards: true,
              schemas: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      return { success: true, data: tenant };
    } catch (error) {
      this.logger.error('Tenant retrieval error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getTenantByDomain(domain: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const tenant = await (this.prisma as any).tenant.findFirst({
        where: {
          OR: [
            { domain },
            { subdomain: domain },
          ],
          isActive: true,
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      return { success: true, data: tenant };
    } catch (error) {
      this.logger.error('Tenant domain lookup error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async updateTenant(tenantId: string, updates: UpdateTenantDto): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Check if domain/subdomain conflicts exist
      if (updates.domain || updates.subdomain) {
        const existingTenant = await (this.prisma as any).tenant.findFirst({
          where: {
            AND: [
              { id: { not: tenantId } },
              {
                OR: [
                  { domain: updates.domain },
                  { subdomain: updates.subdomain },
                ],
              },
            ],
          },
        });

        if (existingTenant) {
          throw new BadRequestException('Domain or subdomain already exists');
        }
      }

      const tenant = await (this.prisma as any).tenant.update({
        where: { id: tenantId },
        data: updates,
      });

      this.logger.log(`Tenant updated: ${tenant.id} - ${tenant.name}`);
      return { success: true, data: tenant };
    } catch (error) {
      this.logger.error('Tenant update error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async deleteTenant(tenantId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if tenant has users
      const userCount = await (this.prisma as any).user.count({
        where: { tenantId },
      });

      if (userCount > 0) {
        throw new BadRequestException('Cannot delete tenant with existing users');
      }

      await (this.prisma as any).tenant.delete({
        where: { id: tenantId },
      });

      this.logger.log(`Tenant deleted: ${tenantId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Tenant deletion error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getTenantUsers(tenantId: string, options: {
    limit?: number;
    offset?: number;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<{
    success: boolean;
    data?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { limit = 50, offset = 0, role, isActive } = options;

      const where: any = { tenantId };
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive;

      const [users, total] = await Promise.all([
        (this.prisma as any).user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastActiveAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        (this.prisma as any).user.count({ where }),
      ]);

      return {
        success: true,
        data: users,
        total,
      };
    } catch (error) {
      this.logger.error('Tenant users retrieval error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getTenantStats(tenantId: string): Promise<{
    success: boolean;
    data?: {
      totalUsers: number;
      activeUsers: number;
      usersByRole: Record<string, number>;
      totalDashboards: number;
      totalSchemas: number;
      createdAt: Date;
    };
    error?: string;
  }> {
    try {
      const [
        totalUsers,
        activeUsers,
        usersByRole,
        totalDashboards,
        totalSchemas,
        tenant,
      ] = await Promise.all([
        (this.prisma as any).user.count({ where: { tenantId } }),
        (this.prisma as any).user.count({ where: { tenantId, isActive: true } }),
        this.getUsersByRole(tenantId),
        (this.prisma as any).dashboard.count({ where: { tenantId } }),
        (this.prisma as any).entitySchema.count({ where: { tenantId } }),
        (this.prisma as any).tenant.findUnique({
          where: { id: tenantId },
          select: { createdAt: true },
        }),
      ]);

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          usersByRole,
          totalDashboards,
          totalSchemas,
          createdAt: tenant?.createdAt || new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Tenant stats error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getAllTenants(options: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
  } = {}): Promise<{
    success: boolean;
    data?: any[];
    total?: number;
    error?: string;
  }> {
    try {
      const { limit = 50, offset = 0, isActive } = options;

      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive;

      const [tenants, total] = await Promise.all([
        (this.prisma as any).tenant.findMany({
          where,
          include: {
            _count: {
              select: {
                users: true,
                dashboards: true,
                schemas: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        (this.prisma as any).tenant.count({ where }),
      ]);

      return {
        success: true,
        data: tenants,
        total,
      };
    } catch (error) {
      this.logger.error('All tenants retrieval error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async getUsersByRole(tenantId: string): Promise<Record<string, number>> {
    try {
      const results = await (this.prisma as any).user.groupBy({
        by: ['role'],
        where: { tenantId },
        _count: true,
      });

      const stats: Record<string, number> = {};
      results.forEach((result: any) => {
        stats[result.role] = result._count;
      });

      return stats;
    } catch (error) {
      this.logger.error('Users by role error:', error);
      return {};
    }
  }
}
