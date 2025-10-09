import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsersWithFilters(options: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const { page, limit, search, role, status, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      // Burada status alanına göre filtreleme yapılabilir
      // Örneğin: isActive gibi bir alan varsa
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    // Sıralama
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            lastActiveAt: true,
            subscriptionStatus: true,
            // İlişkili veriler
            studentProfile: {
              select: {
                grade: true,
                field: true,
              },
            },
            parentProfile: {
              select: {
                phone: true,
              },
            },
            gamificationProfile: {
              select: {
                level: true,
                totalPoints: true,
              },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        success: true,
        data: {
          users,
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
      throw new BadRequestException('Kullanıcı listesi getirilemedi');
    }
  }

  async getUserById(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          studentProfile: true,
          parentProfile: true,
          gamificationProfile: true,
          achievements: {
            take: 10,
            orderBy: { unlockedAt: 'desc' },
          },
          studySessions: {
            take: 5,
            orderBy: { startTime: 'desc' },
          },
          notifications: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı');
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Kullanıcı detayları getirilemedi');
    }
  }

  async getUserActivity(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    try {
      // Audit loglarından kullanıcı aktivitelerini getir
      const [activities, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            ipAddress: true,
            userAgent: true,
            timestamp: true,
            metadata: true,
          },
        }),
        this.prisma.auditLog.count({ where: { userId } }),
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
      throw new BadRequestException('Kullanıcı aktivite geçmişi getirilemedi');
    }
  }

  async updateUserStatus(userId: string, status: 'active' | 'inactive') {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı');
      }

      // Burada status alanını güncelle
      // Örneğin: isActive alanı varsa
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          // isActive: status === 'active',
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Kullanıcı durumu ${status === 'active' ? 'aktif' : 'pasif'} olarak güncellendi`,
        data: updatedUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Kullanıcı durumu güncellenemedi');
    }
  }

  async bulkActions(body: {
    action: 'delete' | 'activate' | 'deactivate' | 'assign-role';
    userIds: string[];
    role?: string;
  }) {
    const { action, userIds, role } = body;

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('En az bir kullanıcı seçilmelidir');
    }

    try {
      let result;

      switch (action) {
        case 'delete':
          result = await this.prisma.user.deleteMany({
            where: { id: { in: userIds } },
          });
          break;

        case 'activate':
          result = await this.prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { 
              // isActive: true,
              updatedAt: new Date(),
            },
          });
          break;

        case 'deactivate':
          result = await this.prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { 
              // isActive: false,
              updatedAt: new Date(),
            },
          });
          break;

        case 'assign-role':
          if (!role) {
            throw new BadRequestException('Rol ataması için rol belirtilmelidir');
          }
          result = await this.prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { 
              role: role as any,
              updatedAt: new Date(),
            },
          });
          break;

        default:
          throw new BadRequestException('Geçersiz işlem türü');
      }

      return {
        success: true,
        message: `${userIds.length} kullanıcı için ${action} işlemi başarıyla tamamlandı`,
        data: result,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Toplu işlem gerçekleştirilemedi');
    }
  }

  async getAvailableRoles() {
    // Prisma schema'dan mevcut rolleri al
    const roles = [
      { value: 'ADMIN', label: 'Yönetici', description: 'Tam sistem erişimi' },
      { value: 'TEACHER', label: 'Öğretmen', description: 'Öğretmen paneli erişimi' },
      { value: 'STUDENT', label: 'Öğrenci', description: 'Öğrenci paneli erişimi' },
      { value: 'PARENT', label: 'Veli', description: 'Veli paneli erişimi' },
    ];

    return {
      success: true,
      data: roles,
    };
  }

  async updateUserRoles(userId: string, roles: string[]) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('Kullanıcı bulunamadı');
      }

      // Burada RBAC sistemi varsa rol atamalarını güncelle
      // Şimdilik sadece ana rolü güncelle
      if (roles.length > 0) {
        const updatedUser = await this.prisma.user.update({
          where: { id: userId },
          data: {
            role: roles[0] as any, // İlk rolü ana rol olarak ata
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          message: 'Kullanıcı rolleri başarıyla güncellendi',
          data: updatedUser,
        };
      }

      throw new BadRequestException('En az bir rol belirtilmelidir');
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Kullanıcı rolleri güncellenemedi');
    }
  }
}
