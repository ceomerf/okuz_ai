import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class StudentsManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentsWithFilters(options: {
    page: number;
    limit: number;
    search?: string;
    grade?: string;
    field?: string;
    coachId?: string;
    hasParent?: boolean;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const { page, limit, search, grade, field, coachId, hasParent, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    // Filtreleme koşulları
    const where: any = {
      user: {
        role: 'STUDENT',
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

    if (grade) {
      where.grade = parseInt(grade);
    }

    if (field) {
      where.field = field;
    }

    if (coachId) {
      where.coachStudents = {
        some: {
          coachId: coachId,
          isActive: true,
        },
      };
    }

    if (hasParent !== undefined) {
      if (hasParent) {
        where.familyMembers = {
          some: {
            role: 'child',
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
    } else if (sortBy === 'grade' || sortBy === 'field') {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    try {
      const [students, total] = await Promise.all([
        this.prisma.student.findMany({
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
        this.prisma.student.count({ where }),
      ]);

      return {
        success: true,
        data: {
          students,
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
      throw new BadRequestException('Öğrenci listesi getirilemedi');
    }
  }

  async getStudentById(id: string) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              studentProfile: true,
              gamificationProfile: true,
              achievements: {
                take: 10,
                orderBy: { unlockedAt: 'desc' },
              },
            },
          },
        },
      });

      if (!student) {
        throw new NotFoundException('Öğrenci bulunamadı');
      }

      return {
        success: true,
        data: student,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Öğrenci detayları getirilemedi');
    }
  }

  async getStudentAcademicHistory(studentId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    try {
      // Öğrencinin akademik geçmişini getir
      const [studySessions, quizResults, examResults, total] = await Promise.all([
        this.prisma.studySession.findMany({
          where: { userId: studentId },
          skip,
          take: limit,
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            subject: true,
            topic: true,
            duration: true,
            performance: true,
            startTime: true,
            isCompleted: true,
          },
        }),
        this.prisma.quizResult.findMany({
          where: { userId: studentId },
          orderBy: { completedAt: 'desc' },
          take: 10,
        }),
        this.prisma.examResult.findMany({
          where: { userId: studentId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.studySession.count({ where: { userId: studentId } }),
      ]);

      // Performans metriklerini hesapla
      const totalStudyTime = studySessions.reduce((sum, session) => sum + session.duration, 0);
      const averagePerformance = studySessions.length > 0 
        ? studySessions.reduce((sum, session) => sum + (session.performance || 0), 0) / studySessions.length 
        : 0;

      return {
        success: true,
        data: {
          studySessions,
          quizResults,
          examResults,
          metrics: {
            totalStudyTime,
            averagePerformance,
            totalSessions: studySessions.length,
          },
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Öğrenci akademik geçmişi getirilemedi');
    }
  }

  async getStudentCoachNotes(studentId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    try {
      const [notes, total] = await Promise.all([
        this.prisma.coachNote.findMany({
          where: {
            coachStudent: {
              studentId: studentId,
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            coachStudent: {
              include: {
                coach: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.coachNote.count({
          where: {
            coachStudent: {
              studentId: studentId,
            },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          notes,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Öğrenci koç notları getirilemedi');
    }
  }

  async getStudentParents(studentId: string) {
    try {
      const parents = await this.prisma.familyMember.findMany({
        where: {
          childId: studentId,
          role: 'child',
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
      });

      return {
        success: true,
        data: parents.map(fm => fm.parent),
      };
    } catch (error) {
      throw new BadRequestException('Öğrenci velileri getirilemedi');
    }
  }

  async assignParentToStudent(studentId: string, parentId: string) {
    try {
      // Öğrenci ve veli varlığını kontrol et
      const [student, parent] = await Promise.all([
        this.prisma.student.findUnique({ where: { id: studentId } }),
        this.prisma.parent.findUnique({ where: { id: parentId } }),
      ]);

      if (!student) {
        throw new NotFoundException('Öğrenci bulunamadı');
      }
      if (!parent) {
        throw new NotFoundException('Veli bulunamadı');
      }

      // Mevcut eşleştirmeyi kontrol et
      const existingRelation = await this.prisma.familyMember.findFirst({
        where: {
          parentId: parentId,
          childId: studentId,
        },
      });

      if (existingRelation) {
        throw new BadRequestException('Bu eşleştirme zaten mevcut');
      }

      // Eşleştirmeyi oluştur
      const familyMember = await this.prisma.familyMember.create({
        data: {
          parentId: parentId,
          childId: studentId,
          role: 'child',
        },
        include: {
          parent: {
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
        message: 'Öğrenci-veli eşleştirmesi başarıyla oluşturuldu',
        data: familyMember,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Eşleştirme oluşturulamadı');
    }
  }

  async removeParentFromStudent(studentId: string, parentId: string) {
    try {
      const familyMember = await this.prisma.familyMember.findFirst({
        where: {
          parentId: parentId,
          childId: studentId,
        },
      });

      if (!familyMember) {
        throw new NotFoundException('Eşleştirme bulunamadı');
      }

      await this.prisma.familyMember.delete({
        where: { id: familyMember.id },
      });

      return {
        success: true,
        message: 'Öğrenci-veli eşleştirmesi başarıyla kaldırıldı',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Eşleştirme kaldırılamadı');
    }
  }

  async getStudentPerformanceMetrics(studentId: string) {
    try {
      // Son 30 günlük performans verilerini getir
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [studySessions, quizResults, achievements] = await Promise.all([
        this.prisma.studySession.findMany({
          where: {
            userId: studentId,
            startTime: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.quizResult.findMany({
          where: {
            userId: studentId,
            completedAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.achievement.findMany({
          where: {
            userId: studentId,
            unlockedAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);

      // Metrikleri hesapla
      const totalStudyTime = studySessions.reduce((sum, session) => sum + session.duration, 0);
      const averagePerformance = studySessions.length > 0 
        ? studySessions.reduce((sum, session) => sum + (session.performance || 0), 0) / studySessions.length 
        : 0;
      const averageQuizScore = quizResults.length > 0 
        ? quizResults.reduce((sum, result) => sum + result.percentage, 0) / quizResults.length 
        : 0;
      const completionRate = studySessions.length > 0 
        ? (studySessions.filter(s => s.isCompleted).length / studySessions.length) * 100 
        : 0;

      return {
        success: true,
        data: {
          totalStudyTime,
          averagePerformance,
          averageQuizScore,
          completionRate,
          achievementsUnlocked: achievements.length,
          totalSessions: studySessions.length,
          totalQuizzes: quizResults.length,
        },
      };
    } catch (error) {
      throw new BadRequestException('Performans metrikleri getirilemedi');
    }
  }

  async updateStudent(id: string, updateData: any) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        throw new NotFoundException('Öğrenci bulunamadı');
      }

      const updatedStudent = await this.prisma.student.update({
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
        message: 'Öğrenci başarıyla güncellendi',
        data: updatedStudent,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Öğrenci güncellenemedi');
    }
  }

  async deleteStudent(id: string) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id },
      });

      if (!student) {
        throw new NotFoundException('Öğrenci bulunamadı');
      }

      await this.prisma.student.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Öğrenci başarıyla silindi',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Öğrenci silinemedi');
    }
  }
}
