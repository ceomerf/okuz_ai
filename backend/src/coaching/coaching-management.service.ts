import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CoachingManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getCoaches(options: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const coaches = await this.prisma.user.findMany({
        where: {
          role: 'COACH',
          ...where,
        },
        skip,
        take: limit,
        include: {
          coach: true,
        },
      });

      const total = await this.prisma.user.count({
        where: {
          role: 'COACH',
          ...where,
        },
      });

      return {
        success: true,
        data: {
          coaches,
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
      throw new BadRequestException('Koçlar getirilemedi');
    }
  }

  async getCoachById(id: string) {
    try {
      const coach = await this.prisma.user.findUnique({
        where: { id },
        include: {
          coach: true,
        },
      });

      if (!coach || coach.role !== 'COACH') {
        throw new NotFoundException('Koç bulunamadı');
      }

      return {
        success: true,
        data: coach,
      };
    } catch (error) {
      throw new BadRequestException('Koç detayları getirilemedi');
    }
  }

  async createCoach(createData: {
    userId: string;
    specialty: string;
    isActive?: boolean;
  }) {
    try {
      const coach = await this.prisma.coach.create({
        data: {
          userId: createData.userId,
          specialty: createData.specialty,
          isActive: createData.isActive ?? true,
        },
        include: {
          user: true,
        },
      });

      return {
        success: true,
        message: 'Koç başarıyla oluşturuldu',
        data: coach,
      };
    } catch (error) {
      throw new BadRequestException('Koç oluşturulamadı');
    }
  }

  async updateCoach(id: string, updateData: {
    specialty?: string;
    isActive?: boolean;
  }) {
    try {
      const coach = await this.prisma.coach.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
        },
      });

      return {
        success: true,
        message: 'Koç başarıyla güncellendi',
        data: coach,
      };
    } catch (error) {
      throw new BadRequestException('Koç güncellenemedi');
    }
  }

  async deleteCoach(id: string) {
    try {
      await this.prisma.coach.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Koç başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Koç silinemedi');
    }
  }

  async createCoachNote(coachId: string, studentId: string, noteData: {
    content: string;
  }) {
    try {
      const note = await this.prisma.coachNote.create({
        data: {
          studentId,
          coachId,
          content: noteData.content,
        },
      });

      return {
        success: true,
        message: 'Koç notu başarıyla oluşturuldu',
        data: note,
      };
    } catch (error) {
      throw new BadRequestException('Koç notu oluşturulamadı');
    }
  }

  async getCoachNotes(coachId: string, options: {
    page: number;
    limit: number;
  }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const notes = await this.prisma.coachNote.findMany({
        where: {
          coachId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
            },
          },
        },
      });

      const total = await this.prisma.coachNote.count({
        where: {
          coachId,
        },
      });

      return {
        success: true,
        data: {
          notes,
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
      throw new BadRequestException('Koç notları getirilemedi');
    }
  }

  async getAssignmentStats() {
    try {
      const stats = {
        totalCoaches: await this.prisma.coach.count(),
        totalStudents: await this.prisma.student.count(),
        totalNotes: await this.prisma.coachNote.count(),
        averageNotesPerCoach: 0,
        recentNotes: 0,
      };

      if (stats.totalCoaches > 0) {
        stats.averageNotesPerCoach = Math.round(stats.totalNotes / stats.totalCoaches);
      }

      // Son 7 gün içindeki notlar
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      stats.recentNotes = await this.prisma.coachNote.count({
        where: {
          createdAt: {
            gte: weekAgo,
          },
        },
      });

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException('Atama istatistikleri getirilemedi');
    }
  }

  async getCoachPerformance(coachId: string) {
    try {
      const coach = await this.prisma.coach.findUnique({
        where: { id: coachId },
        include: {
          user: true,
        },
      });

      if (!coach) {
        throw new NotFoundException('Koç bulunamadı');
      }

      const totalNotes = await this.prisma.coachNote.count({
        where: { coachId },
      });

      // Son 7 gün içindeki notlar
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentNotes = await this.prisma.coachNote.count({
        where: {
          coachId,
          createdAt: {
            gte: weekAgo,
          },
        },
      });

      const performance = {
        totalNotes,
        recentNotes,
        averageNotesPerWeek: Math.round(recentNotes / 7),
        coachName: coach.user.name || 'Unknown',
        specialty: coach.specialty,
        isActive: coach.isActive,
      };

      return {
        success: true,
        data: performance,
      };
    } catch (error) {
      throw new BadRequestException('Koç performansı getirilemedi');
    }
  }
}