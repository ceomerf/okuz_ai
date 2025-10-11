import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTeacherDashboard() {
    try {
      // Mevcut modelleri kullanarak gerçek verileri çek
      const [
        totalStudents,
        totalTeachers,
        studySessions,
      ] = await Promise.all([
        this.prisma.user.count({ where: { role: 'STUDENT' } }),
        this.prisma.user.count({ where: { role: 'TEACHER' } }),
        this.prisma.studySession.count(),
      ]);

      // Mock veriler (gerçek veriler mevcut olmadığı için)
      const activeClasses = Math.floor(totalTeachers * 2); // Her öğretmen 2 sınıf
      const completedAssignments = Math.floor(totalStudents * 0.7);
      const pendingGrading = Math.floor(totalStudents * 0.3);
      const averageGrade = 85.2;
      const attendanceRate = 94.5;

      return {
        success: true,
        data: {
          totalStudents,
          activeClasses,
          completedAssignments,
          pendingGrading,
          averageGrade,
          attendanceRate,
        },
      };
    } catch (error) {
      this.logger.error('Öğretmen dashboard verileri alınamadı:', error);
      return {
        success: false,
        error: 'Öğretmen dashboard verileri alınamadı',
        data: {
          totalStudents: 0,
          activeClasses: 0,
          completedAssignments: 0,
          pendingGrading: 0,
          averageGrade: 0,
          attendanceRate: 0,
        },
      };
    }
  }

  async getAllTeachers() {
    try {
      const teachers = await this.prisma.user.findMany({
        where: { role: 'TEACHER' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          lastActiveAt: true,
        },
      });

      return {
        success: true,
        data: teachers,
      };
    } catch (error) {
      this.logger.error('Öğretmenler alınamadı:', error);
      return {
        success: false,
        error: 'Öğretmenler alınamadı',
        data: [],
      };
    }
  }

  async getTeacher(id: string) {
    try {
      const teacher = await this.prisma.user.findUnique({
        where: { id, role: 'TEACHER' },
      });

      if (!teacher) {
        return {
          success: false,
          error: 'Öğretmen bulunamadı',
        };
      }

      return {
        success: true,
        data: teacher,
      };
    } catch (error) {
      this.logger.error('Öğretmen alınamadı:', error);
      return {
        success: false,
        error: 'Öğretmen alınamadı',
      };
    }
  }

  async createTeacher(data: any) {
    try {
      const teacher = await this.prisma.user.create({
        data: {
          ...data,
          role: 'TEACHER',
        },
      });

      return {
        success: true,
        data: teacher,
      };
    } catch (error) {
      this.logger.error('Öğretmen oluşturulamadı:', error);
      return {
        success: false,
        error: 'Öğretmen oluşturulamadı',
      };
    }
  }

  async updateTeacher(id: string, data: any) {
    try {
      const teacher = await this.prisma.user.update({
        where: { id, role: 'TEACHER' },
        data,
      });

      return {
        success: true,
        data: teacher,
      };
    } catch (error) {
      this.logger.error('Öğretmen güncellenemedi:', error);
      return {
        success: false,
        error: 'Öğretmen güncellenemedi',
      };
    }
  }

  async deleteTeacher(id: string) {
    try {
      await this.prisma.user.delete({
        where: { id, role: 'TEACHER' },
      });

      return {
        success: true,
        message: 'Öğretmen başarıyla silindi',
      };
    } catch (error) {
      this.logger.error('Öğretmen silinemedi:', error);
      return {
        success: false,
        error: 'Öğretmen silinemedi',
      };
    }
  }

  async getTeacherStudents(id: string) {
    try {
      const students = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        data: students,
      };
    } catch (error) {
      this.logger.error('Öğretmen öğrencileri alınamadı:', error);
      return {
        success: false,
        error: 'Öğretmen öğrencileri alınamadı',
        data: [],
      };
    }
  }

  async getTeacherClasses(id: string) {
    try {
      // Mock sınıf verileri (class modeli mevcut olmadığı için)
      const classes = [
        {
          id: '1',
          name: 'Matematik Sınıfı',
          teacherId: id,
          students: [],
        },
        {
          id: '2',
          name: 'Fizik Sınıfı',
          teacherId: id,
          students: [],
        },
      ];

      return {
        success: true,
        data: classes,
      };
    } catch (error) {
      this.logger.error('Öğretmen sınıfları alınamadı:', error);
      return {
        success: false,
        error: 'Öğretmen sınıfları alınamadı',
        data: [],
      };
    }
  }
}
