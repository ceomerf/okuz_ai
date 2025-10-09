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
          coachStudents: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
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
          coachStudents: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
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
    specialization: string;
    experience: number;
    bio?: string;
    isActive?: boolean;
  }) {
    try {
      const coach = await this.prisma.user.update({
        where: { id: createData.userId },
        data: {
          role: 'COACH',
        },
        include: {
          coachStudents: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
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
    specialization?: string;
    experience?: number;
    bio?: string;
    isActive?: boolean;
  }) {
    try {
      const coach = await this.prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          coachStudents: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
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
      await this.prisma.user.update({
        where: { id },
        data: { role: 'USER' as any },
      });

      return {
        success: true,
        message: 'Koç başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Koç silinemedi');
    }
  }

  async assignStudents(coachId: string, studentIds: string[]) {
    try {
      const assignments = await Promise.all(
        studentIds.map(studentId =>
          this.prisma.coachStudent.create({
            data: {
              coachId,
              studentId,
            },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          })
        )
      );

      return {
        success: true,
        message: 'Öğrenciler başarıyla atandı',
        data: assignments,
      };
    } catch (error) {
      throw new BadRequestException('Öğrenciler atanamadı');
    }
  }

  async unassignStudent(coachId: string, studentId: string) {
    try {
      await this.prisma.coachStudent.deleteMany({
        where: {
          coachId,
          studentId,
        },
      });

      return {
        success: true,
        message: 'Öğrenci ataması kaldırıldı',
      };
    } catch (error) {
      throw new BadRequestException('Öğrenci ataması kaldırılamadı');
    }
  }

  async createCoachNote(coachId: string, studentId: string, noteData: {
    title: string;
    content: string;
    type: string;
    priority: string;
  }) {
    try {
      // First, find or create the coach-student relationship
      const coachStudent = await this.prisma.coachStudent.findFirst({
        where: {
          coachId,
          studentId,
        },
      });

      if (!coachStudent) {
        throw new BadRequestException('Koç-öğrenci ilişkisi bulunamadı');
      }

      const note = await this.prisma.coachNote.create({
        data: {
          coachStudentId: coachStudent.id,
          title: noteData.title,
          content: noteData.content,
          type: noteData.type,
          priority: noteData.priority,
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
          coachStudent: {
            coachId,
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          coachStudent: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      const total = await this.prisma.coachNote.count({
        where: {
          coachStudent: {
            coachId,
          },
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
        totalCoaches: await this.prisma.user.count({ where: { role: 'COACH' as any } }),
        totalStudents: await this.prisma.user.count({ where: { role: 'STUDENT' as any } }),
        totalAssignments: await this.prisma.coachStudent.count(),
        averageStudentsPerCoach: 0,
        unassignedStudents: 0,
        assignedStudents: 0,
        recentAssignments: 0,
        assignmentRate: 0,
      };

      if (stats.totalCoaches > 0) {
        stats.averageStudentsPerCoach = Math.round(stats.totalAssignments / stats.totalCoaches);
      }

      const assignedStudentIds = await this.prisma.coachStudent.findMany({
        select: { studentId: true },
      });

      const assignedIds = new Set(assignedStudentIds.map(a => a.studentId));
      stats.assignedStudents = assignedIds.size;
      stats.unassignedStudents = stats.totalStudents - assignedIds.size;
      stats.assignmentRate = stats.totalStudents > 0 ? Math.round((stats.assignedStudents / stats.totalStudents) * 100) : 0;

      // Son 7 gün içindeki atamalar
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      stats.recentAssignments = await this.prisma.coachStudent.count({
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

  async getUnassignedStudents() {
    try {
      const assignedStudentIds = await this.prisma.coachStudent.findMany({
        select: { studentId: true },
      });

      const assignedIds = new Set(assignedStudentIds.map(a => a.studentId));

      const unassignedStudents = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT' as any,
          id: {
            notIn: Array.from(assignedIds),
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: {
            select: {
              grade: true,
              field: true,
            },
          },
        },
      });

      const formattedStudents = unassignedStudents.map(student => ({
        id: student.id,
        user: {
          name: student.name || '',
          email: student.email,
        },
        grade: student.studentProfile?.grade || 0,
        field: student.studentProfile?.field || '',
      }));

      return {
        success: true,
        data: formattedStudents,
      };
    } catch (error) {
      throw new BadRequestException('Atanmamış öğrenciler getirilemedi');
    }
  }

  async getCoachPerformance(coachId: string) {
    try {
      const coach = await this.prisma.user.findUnique({
        where: { id: coachId },
        include: {
          coachStudents: {
            include: {
              student: true,
              notes: true,
            },
          },
        },
      });

      if (!coach || coach.role !== 'COACH') {
        throw new NotFoundException('Koç bulunamadı');
      }

      const totalStudents = coach.coachStudents.length;
      const activeStudents = coach.coachStudents.filter(cs => cs.isActive).length;
      const totalNotes = coach.coachStudents.reduce((sum, cs) => sum + cs.notes.length, 0);
      
      // Son 7 gün içindeki notlar
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentNotes = coach.coachStudents.reduce((sum, cs) => {
        return sum + cs.notes.filter(note => note.createdAt >= weekAgo).length;
      }, 0);

      // Ortalama performans hesaplama (mock - gerçek hesaplama gerekli)
      const averageStudentPerformance = 75; // Bu gerçek hesaplama olmalı
      const totalSessions = 45; // Bu da gerçek hesaplama olmalı
      const engagementRate = 80; // Bu da gerçek hesaplama olmalı
      const notesPerStudent = totalStudents > 0 ? totalNotes / totalStudents : 0;

      const performance = {
        totalStudents,
        activeStudents,
        totalNotes,
        recentNotes,
        averageStudentPerformance,
        totalSessions,
        engagementRate,
        notesPerStudent,
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