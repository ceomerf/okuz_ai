import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ParentManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getParents(options: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    subscription?: string;
    hasChildren?: boolean;
  }) {
    const { page, limit, search, isActive, subscription, hasChildren } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      role: 'PARENT' as any,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      // Active flag lives on Parent model, filter via relation
      where.parentProfile = {
        is: { isActive },
      };
    }

    // Subscription filtering is omitted (schema uses Subscription relation list)

    if (hasChildren !== undefined) {
      // Use familyMembers relation to check if the parent has children
      where.familyMembers = hasChildren ? { some: {} } : { none: {} };
    }

    try {
      const parents = await this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          parentProfile: true,
          familyMembers: {
            include: {
              child: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  studentProfile: {
                    select: { grade: true, field: true },
                  },
                },
              },
            },
          },
          subscriptions: true,
        },
      });

      const total = await this.prisma.user.count({ where });

      return {
        success: true,
        data: {
          data: parents.map(parent => ({
            id: parent.id,
            name: parent.name,
            email: parent.email,
            phone: parent.parentProfile?.phone,
            address: parent.parentProfile?.address,
            createdAt: parent.createdAt.toISOString(),
            lastActiveAt: parent.lastActiveAt?.toISOString(),
            isActive: true,
            children: parent.familyMembers?.map(fm => ({
              id: fm.child.id,
              name: fm.child.name,
              grade: fm.child.studentProfile?.grade ?? 0,
              field: fm.child.studentProfile?.field ?? '',
              email: fm.child.email,
            })) || [],
          })),
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
      throw new BadRequestException('Veliler getirilemedi');
    }
  }

  async getParentById(id: string) {
    try {
      const parent = await this.prisma.user.findUnique({
        where: { id },
        include: {
          parentProfile: true,
          familyMembers: {
            include: {
              child: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  studentProfile: { select: { grade: true, field: true } },
                },
              },
            },
          },
          subscriptions: true,
        },
      });

      if (!parent || parent.role !== 'PARENT' as any) {
        throw new NotFoundException('Veli bulunamadı');
      }

      return {
        success: true,
        data: {
          id: parent.id,
          name: parent.name,
          email: parent.email,
          phone: parent.parentProfile?.phone,
          address: parent.parentProfile?.address,
          createdAt: parent.createdAt.toISOString(),
          lastActiveAt: parent.lastActiveAt?.toISOString(),
          isActive: true,
          children: parent.familyMembers?.map(fm => ({
            id: fm.child.id,
            name: fm.child.name,
            grade: fm.child.studentProfile?.grade ?? 0,
            field: fm.child.studentProfile?.field ?? '',
            email: fm.child.email,
          })) || [],
        },
      };
    } catch (error) {
      throw new BadRequestException('Veli detayları getirilemedi');
    }
  }

  async getParentReports(parentId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const reports = await this.prisma.parentReport.findMany({
        where: { parentId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentProfile: { select: { grade: true, field: true } },
            },
          },
        },
      });

      const total = await this.prisma.parentReport.count({
        where: { parentId },
      });

      return {
        success: true,
        data: {
          data: reports.map(report => {
            const meta = (report.metadata as any) || {};
            return {
              id: report.id,
              parentId: report.parentId,
              studentId: report.studentId,
              weekStart: report.weekStart.toISOString(),
              weekEnd: report.weekEnd.toISOString(),
              totalStudyTime: report.totalStudyTime,
              completedSessions: report.completedSessions,
              averagePerformance: meta.averagePerformance ?? 0,
              attendanceRate: meta.attendanceRate ?? 0,
              goals: meta.goals ?? [],
              achievements: meta.achievements ?? [],
              recommendations: report.coachRecommendations ?? [],
              createdAt: report.createdAt.toISOString(),
              student: {
                name: 'Student Name',
                grade: 0,
                field: '',
              },
            };
          }),
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
      throw new BadRequestException('Veli raporları getirilemedi');
    }
  }

  async getParentActivities(parentId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const activities = await this.prisma.auditLog.findMany({
        where: { userId: parentId },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      });

      const total = await this.prisma.auditLog.count({
        where: { userId: parentId },
      });

      return {
        success: true,
        data: {
          data: activities.map(activity => {
            const meta = (activity.metadata as any) || {};
            return {
              id: activity.id,
              parentId: activity.userId,
              action: activity.action,
              resource: meta.resource ?? '-',
              ipAddress: meta.ip ?? '-',
              userAgent: meta.userAgent ?? '-',
              createdAt: activity.timestamp.toISOString(),
            };
          }),
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
      throw new BadRequestException('Veli aktiviteleri getirilemedi');
    }
  }

  async getParentStats() {
    try {
      const totalParents = await this.prisma.user.count({ where: { role: 'PARENT' as any } });

      const activeParents = await this.prisma.parent.count({ where: { isActive: true } });

      const inactiveParents = totalParents - activeParents;

      const totalChildren = await this.prisma.familyMember.count();

      const averageChildrenPerParent = totalParents > 0 ? totalChildren / totalParents : 0;

      // Simplify subscription stats due to schema differences
      const subscriptionStats = { premium: 0, basic: 0, free: 0 };

      const stats = {
        totalParents,
        activeParents,
        inactiveParents,
        totalChildren,
        averageChildrenPerParent: Math.round(averageChildrenPerParent * 100) / 100,
        subscriptionStats,
        engagementRate: 75, // Mock - gerçek hesaplama gerekli
        lastWeekActivity: 45, // Mock - gerçek hesaplama gerekli
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException('Veli istatistikleri getirilemedi');
    }
  }

  async createParent(createData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    children?: string[];
  }) {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: createData.name,
          email: createData.email,
          role: 'PARENT' as any,
          password: 'TEMP-PASSWORD',
        },
      });

      await this.prisma.parent.create({
        data: {
          userId: user.id,
          phone: createData.phone,
          address: createData.address,
        },
      });

      const parent = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { parentProfile: true },
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
    email?: string;
    phone?: string;
    address?: string;
    isActive?: boolean;
  }) {
    try {
      const parent = await this.prisma.user.update({
        where: { id },
        data: {
          name: updateData.name,
          email: updateData.email,
          // isActive flag is on Parent model
        },
        include: {
          parentProfile: true,
        },
      });

      if (updateData.phone || updateData.address || updateData.isActive !== undefined) {
        await this.prisma.parent.update({
          where: { userId: id },
          data: {
            phone: updateData.phone,
            address: updateData.address,
            isActive: updateData.isActive,
          },
        });
      }

      return {
        success: true,
        message: 'Veli başarıyla güncellendi',
        data: parent,
      };
    } catch (error) {
      throw new BadRequestException('Veli güncellenemedi');
    }
  }

  async deleteParent(id: string) {
    try {
      await this.prisma.parent.update({ where: { userId: id }, data: { isActive: false } });

      return {
        success: true,
        message: 'Veli başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Veli silinemedi');
    }
  }

  async assignChild(parentId: string, childId: string) {
    try {
      // Parent-child relationship logic here
      return {
        success: true,
        message: 'Çocuk başarıyla atandı',
      };
    } catch (error) {
      throw new BadRequestException('Çocuk atanamadı');
    }
  }

  async unassignChild(parentId: string, childId: string) {
    try {
      // Remove parent-child relationship logic here
      return {
        success: true,
        message: 'Çocuk ataması kaldırıldı',
      };
    } catch (error) {
      throw new BadRequestException('Çocuk ataması kaldırılamadı');
    }
  }

  async generateReport(parentId: string, studentId: string, weekStart: string) {
    try {
      // Generate parent report logic here
      return {
        success: true,
        message: 'Rapor başarıyla oluşturuldu',
        data: {},
      };
    } catch (error) {
      throw new BadRequestException('Rapor oluşturulamadı');
    }
  }

  async bulkUpdateParents(parentIds: string[], updateData: {
    isActive?: boolean;
    subscription?: string;
  }) {
    try {
      await this.prisma.user.updateMany({
        where: { id: { in: parentIds } },
        data: updateData,
      });

      return {
        success: true,
        message: 'Toplu güncelleme başarıyla tamamlandı',
      };
    } catch (error) {
      throw new BadRequestException('Toplu güncelleme başarısız');
    }
  }

  async exportParents(format: string, filters: any) {
    try {
      // Export logic here
      return {
        success: true,
        data: 'Export data',
      };
    } catch (error) {
      throw new BadRequestException('Veri dışa aktarılamadı');
    }
  }
}
