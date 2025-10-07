import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { OptimizedQueryService } from '../common/prisma/optimized-query.service';
import { CacheService } from '../common/cache/cache.service';

@Injectable()
export class CoachingOptimizedService {
  private readonly logger = new Logger(CoachingOptimizedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly optimizedQuery: OptimizedQueryService,
    private readonly cache: CacheService,
  ) {}

  /**
   * N+1 problemi çözülmüş koç öğrenci listesi
   */
  async getCoachStudents(coachId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting coach students for: ${coachId}`);

      // Optimized query service kullan
      const students = await this.optimizedQuery.getCoachStudentsOptimized(coachId, {
        cache: true,
        cacheTTL: 1800, // 30 dakika
      });

      return students;
    } catch (error) {
      this.logger.error(`Failed to get coach students: ${error instanceof Error ? error.message : String(error)}`, { coachId });
      throw new BadRequestException('Failed to get coach students');
    }
  }

  /**
   * N+1 problemi çözülmüş öğrenci detayları
   */
  async getStudentDetails(coachId: string, studentId: string): Promise<any> {
    try {
      this.logger.log(`Getting student details for: ${studentId} by coach: ${coachId}`);

      // Cache kontrolü
      const cacheKey = `coach:${coachId}:student:${studentId}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for student details: ${studentId}`);
        return cached;
      }

      // Tek sorgu ile tüm öğrenci detaylarını çek
      const coachStudent = await this.prisma.coachStudent.findFirst({
        where: { 
          coachId,
          studentId,
          isActive: true 
        },
        select: {
          id: true,
          assignedAt: true,
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              studentProfile: {
                select: {
                  grade: true,
                  field: true,
                  learningStyle: true,
                  strengths: true,
                  weaknesses: true,
                },
              },
              studentCompliance: {
                orderBy: { date: 'desc' },
                take: 30,
                select: {
                  date: true,
                  planComplianceScore: true,
                  actualMinutes: true,
                  completedSessions: true,
                },
              },
              studySessions: {
                orderBy: { startTime: 'desc' },
                take: 50,
                select: {
                  id: true,
                  subject: true,
                  topic: true,
                  startTime: true,
                  duration: true,
                  isCompleted: true,
                  performance: true,
                },
              },
              plans: {
                where: { isActive: true },
                select: {
                  id: true,
                  title: true,
                  subjects: true,
                  goals: true,
                  studySessions: {
                    orderBy: { startTime: 'desc' },
                    take: 20,
                    select: {
                      id: true,
                      subject: true,
                      topic: true,
                      startTime: true,
                      duration: true,
                      isCompleted: true,
                    },
                  },
                },
              },
            },
          },
          notes: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              content: true,
              type: true,
              priority: true,
              createdAt: true,
            },
          },
        },
      });

      if (!coachStudent) {
        throw new NotFoundException('Öğrenci bulunamadı veya bu koça atanmamış');
      }

      const { student } = coachStudent;
      
      const result = {
        id: student.id,
        name: student.name,
        email: student.email,
        profile: student.studentProfile,
        assignedAt: coachStudent.assignedAt,
        
        // Uyum metrikleri
        compliance: this.calculateComplianceMetrics(student.studentCompliance),
        
        // Çalışma istatistikleri
        studyStats: this.calculateStudyStats(student.studySessions),
        
        // Plan ilerlemesi
        planProgress: this.calculatePlanProgress(student.plans),
        
        // Son notlar
        recentNotes: coachStudent.notes,
        
        // Haftalık özet
        weeklySummary: this.calculateWeeklySummary(student.studentCompliance, student.studySessions),
      };

      // Cache'e kaydet
      await this.cache.set(cacheKey, result, 3600); // 1 saat

      return result;
    } catch (error) {
      this.logger.error(`Failed to get student details: ${error instanceof Error ? error.message : String(error)}`, { coachId, studentId });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get student details');
    }
  }

  /**
   * N+1 problemi çözülmüş koç notları
   */
  async getCoachNotes(coachId: string, studentId?: string): Promise<any[]> {
    try {
      this.logger.log(`Getting coach notes for: ${coachId}${studentId ? ` for student: ${studentId}` : ''}`);

      const where: any = { coachId };
      if (studentId) {
        where.studentId = studentId;
      }

      const notes = await this.prisma.coachNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          priority: true,
          createdAt: true,
          coachStudent: {
            select: {
              student: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      return notes;
    } catch (error) {
      this.logger.error(`Failed to get coach notes: ${error instanceof Error ? error.message : String(error)}`, { coachId, studentId });
      throw new BadRequestException('Failed to get coach notes');
    }
  }

  /**
   * N+1 problemi çözülmüş koç dashboard
   */
  async getCoachDashboard(coachId: string): Promise<any> {
    try {
      this.logger.log(`Getting coach dashboard for: ${coachId}`);

      // Cache kontrolü
      const cacheKey = `coach:${coachId}:dashboard`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for coach dashboard: ${coachId}`);
        return cached;
      }

      // Tek sorgu ile tüm dashboard verilerini çek
      const coachUser = await this.prisma.user.findUnique({
        where: { id: coachId },
        select: { id: true, name: true, email: true },
      });

      if (!coachUser) {
        throw new NotFoundException('Koç bulunamadı');
      }

      const students = await this.prisma.coachStudent.findMany({
        where: { coachId, isActive: true },
        select: {
          id: true,
          assignedAt: true,
          student: {
            select: {
              id: true,
              name: true,
              studentProfile: { select: { grade: true, field: true } },
              studentCompliance: {
                orderBy: { date: 'desc' },
                take: 7,
                select: { date: true, planComplianceScore: true },
              },
            },
          },
        },
      });

      const notes = await this.prisma.coachNote.findMany({
        where: { coachStudent: { coachId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, type: true, priority: true, createdAt: true },
      });

      const result = {
        coach: coachUser,
        students: students.map(cs => ({
          id: cs.student.id,
          name: cs.student.name,
          grade: cs.student.studentProfile?.grade,
          field: cs.student.studentProfile?.field,
          assignedAt: cs.assignedAt,
          compliance: this.calculateComplianceMetrics(cs.student.studentCompliance),
        })),
        recentNotes: notes,
        statistics: this.calculateCoachStatistics(students),
      };

      // Cache'e kaydet
      await this.cache.set(cacheKey, result, 1800); // 30 dakika

      return result;
    } catch (error) {
      this.logger.error(`Failed to get coach dashboard: ${error instanceof Error ? error.message : String(error)}`, { coachId });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get coach dashboard');
    }
  }

  /**
   * Uyum metriklerini hesapla
   */
  private calculateComplianceMetrics(compliance: any[]): any {
    if (!compliance || compliance.length === 0) {
      return { average: 0, trend: 'stable' };
    }

    const scores = compliance.map(c => c.planComplianceScore || 0);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Trend hesapla (son 3 gün vs önceki 3 gün)
    const recent = scores.slice(0, 3);
    const previous = scores.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const previousAvg = previous.length > 0 ? 
      previous.reduce((sum, score) => sum + score, 0) / previous.length : recentAvg;
    
    const trend = recentAvg > previousAvg ? 'improving' : 
                  recentAvg < previousAvg ? 'declining' : 'stable';

    return { average, trend };
  }

  /**
   * Çalışma istatistiklerini hesapla
   */
  private calculateStudyStats(sessions: any[]): any {
    if (!sessions || sessions.length === 0) {
      return { totalSessions: 0, averageDuration: 0, completionRate: 0 };
    }

    const completedSessions = sessions.filter(s => s.isCompleted);
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageDuration = totalDuration / sessions.length;
    const completionRate = (completedSessions.length / sessions.length) * 100;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      averageDuration,
      completionRate,
    };
  }

  /**
   * Plan ilerlemesini hesapla
   */
  private calculatePlanProgress(plans: any[]): any {
    if (!plans || plans.length === 0) {
      return { activePlans: 0, totalSessions: 0, completedSessions: 0 };
    }

    const totalSessions = plans.reduce((sum, plan) => sum + (plan.studySessions?.length || 0), 0);
    const completedSessions = plans.reduce((sum, plan) => 
      sum + (plan.studySessions || []).filter((s: any) => s.isCompleted).length, 0
    );

    return {
      activePlans: plans.length,
      totalSessions,
      completedSessions,
      completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
    };
  }

  /**
   * Haftalık özeti hesapla
   */
  private calculateWeeklySummary(compliance: any[], sessions: any[]): any {
    const weeklyCompliance = compliance.slice(0, 7);
    const weeklySessions = sessions.slice(0, 7);
    
    const averageCompliance = weeklyCompliance.reduce((sum, c) => sum + (c.complianceScore || 0), 0) / weeklyCompliance.length;
    const totalStudyTime = weeklySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    return {
      averageCompliance,
      totalStudyTime,
      sessionCount: weeklySessions.length,
      completedSessions: weeklySessions.filter(s => s.isCompleted).length,
    };
  }

  /**
   * Koç istatistiklerini hesapla
   */
  private calculateCoachStatistics(students: any[]): any {
    const totalStudents = students.length;
    const averageCompliance = totalStudents > 0 ? students.reduce((sum, cs) => {
      const comp = this.calculateComplianceMetrics(cs.student.studentCompliance);
      return sum + comp.average;
    }, 0) / totalStudents : 0;

    return {
      totalStudents,
      averageCompliance,
      studentsByGrade: this.groupStudentsByGrade(students),
    };
  }

  /**
   * Öğrencileri sınıfa göre grupla
   */
  private groupStudentsByGrade(students: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    students.forEach(student => {
      const grade = String(student.student.studentProfile?.grade || 'Unknown');
      groups[grade] = (groups[grade] || 0) + 1;
    });

    return groups;
  }
}
