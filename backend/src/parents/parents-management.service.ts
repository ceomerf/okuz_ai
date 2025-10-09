import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ParentsManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getParentsWithFilters(options: {
    page: number;
    limit: number;
    search?: string;
    hasChildren?: boolean;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const { page, limit, search, hasChildren, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where: any = {
      user: {
        role: 'PARENT',
      },
    };

    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (hasChildren !== undefined) {
      if (hasChildren) {
        where.familyMembers = {
          some: {
            role: 'parent',
          },
        };
      } else {
        where.familyMembers = {
          none: {},
        };
      }
    }

    // Sıralama
    const orderBy: any = {};
    if (sortBy === 'name' || sortBy === 'email') {
      orderBy.user = { [sortBy]: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    try {
      const [parents, total] = await Promise.all([
        this.prisma.parent.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                lastActiveAt: true,
              },
            },
          },
        }),
        this.prisma.parent.count({ where }),
      ]);

      return {
        success: true,
        data: {
          parents,
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
      throw new BadRequestException('Veli listesi getirilemedi');
    }
  }

  async getParentById(id: string) {
    try {
      const parent = await this.prisma.parent.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              parentProfile: true,
              notifications: {
                take: 10,
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });

      if (!parent) {
        throw new NotFoundException('Veli bulunamadı');
      }

      return {
        success: true,
        data: parent,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Veli detayları getirilemedi');
    }
  }

  async getParentChildren(parentId: string) {
    try {
      const children = await this.prisma.familyMember.findMany({
        where: {
          parentId: parentId,
          role: 'parent',
        },
        include: {
          child: {
            select: {
              id: true,
              name: true,
              email: true,
              lastActiveAt: true,
            },
          },
        },
      });

      return {
        success: true,
        data: children.map(fm => fm.childId),
      };
    } catch (error) {
      throw new BadRequestException('Velinin çocukları getirilemedi');
    }
  }

  async getParentActivity(parentId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    try {
      // Veli aktivitelerini getir
      const [activities, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { userId: parentId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            resource: true,
            resourceId: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            metadata: true,
          },
        }),
        this.prisma.auditLog.count({ where: { userId: parentId } }),
      ]);

      return {
        success: true,
        data: {
          activities,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Veli aktivite geçmişi getirilemedi');
    }
  }

  async createParent(createData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  }) {
    try {
      // Önce kullanıcı oluştur
      const user = await this.prisma.user.create({
        data: {
          name: createData.name,
          email: createData.email,
          password: 'temp_password', // Geçici şifre - veli ilk girişte değiştirmeli
          role: 'PARENT',
        },
      });

      // Sonra veli profili oluştur
      const parent = await this.prisma.parent.create({
        data: {
          userId: user.id,
          name: createData.name,
          phone: createData.phone,
          address: createData.address,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Veli başarıyla oluşturuldu',
        data: parent,
      };
    } catch (error) {
      throw new BadRequestException('Veli oluşturulamadı');
    }
  }

  async updateParent(id: string, updateData: {
    name?: string;
    phone?: string;
    address?: string;
  }) {
    try {
      const parent = await this.prisma.parent.findUnique({
        where: { id },
      });

      if (!parent) {
        throw new NotFoundException('Veli bulunamadı');
      }

      const updatedParent = await this.prisma.parent.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Veli başarıyla güncellendi',
        data: updatedParent,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Veli güncellenemedi');
    }
  }

  async deleteParent(id: string) {
    try {
      const parent = await this.prisma.parent.findUnique({
        where: { id },
      });

      if (!parent) {
        throw new NotFoundException('Veli bulunamadı');
      }

      await this.prisma.parent.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Veli başarıyla silindi',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Veli silinemedi');
    }
  }

  async getParentReports(parentId: string, startDate?: string, endDate?: string) {
    try {
      // Veli raporlarını getir
      const where: any = { parentId };
      
      if (startDate && endDate) {
        where.weekStart = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const reports = await this.prisma.parentWeeklyReport.findMany({
        where,
        orderBy: { weekStart: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              grade: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        data: reports,
      };
    } catch (error) {
      throw new BadRequestException('Veli raporları getirilemedi');
    }
  }
}
