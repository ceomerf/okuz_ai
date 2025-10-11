import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Koçun öğrenci listesini getir (uyum skorları ile)
   */
  async getCoachStudents(coachId: string) {
    const students = await (this.prisma as any).coachStudent.findMany({
      where: { 
        coachId,
        isActive: true 
      },
      include: {
        student: {
          include: {
            studentProfile: true,
            studentCompliance: {
              orderBy: { date: 'desc' },
              take: 7, // Son 7 gün
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Son 5 not
        },
      },
    });

    return students.map((cs: any) => ({
      id: cs.student.id,
      name: cs.student.name,
      email: cs.student.email,
      grade: cs.student.studentProfile?.grade,
      field: cs.student.studentProfile?.field,
      assignedAt: cs.assignedAt,
      
      // Uyum metrikleri
      compliance: this.calculateComplianceMetrics(cs.student.studentCompliance),
      
      // Son notlar
      recentNotes: cs.notes.map((note: any) => ({
        id: note.id,
        title: note.title,
        type: note.type,
        priority: note.priority,
        createdAt: note.createdAt,
      })),
    }));
  }

  /**
   * Öğrenci detayını getir (haftalık ilerleme)
   */
  async getStudentDetails(coachId: string, studentId: string) {
    const coachStudent = await (this.prisma as any).coachStudent.findFirst({
      where: { 
        coachId,
        studentId,
        isActive: true 
      },
      include: {
        student: {
          include: {
            studentProfile: true,
            studentCompliance: {
              orderBy: { date: 'desc' },
              take: 30, // Son 30 gün
            },
            studySessions: {
              orderBy: { startTime: 'desc' },
              take: 50, // Son 50 seans
            },
            plans: {
              where: { isActive: true },
              include: {
                studySessions: {
                  orderBy: { startTime: 'desc' },
                  take: 20,
                },
              },
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!coachStudent) {
      throw new NotFoundException('Öğrenci bulunamadı veya bu koça atanmamış');
    }

    const { student } = coachStudent;
    
    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        grade: student.studentProfile?.grade,
        field: student.studentProfile?.field,
        goals: student.studentProfile?.goals,
        strengths: student.studentProfile?.strengths,
        weaknesses: student.studentProfile?.weaknesses,
      },
      
      // Haftalık ilerleme
      weeklyProgress: this.calculateWeeklyProgress(student.studentCompliance),
      
      // Plan performansı
      planPerformance: this.calculatePlanPerformance(student.plans),
      
      // Son çalışma seansları
      recentSessions: student.studySessions.slice(0, 10).map((session: any) => ({
        id: session.id,
        subject: session.subject,
        topic: session.topic,
        duration: session.duration,
        performance: session.performance,
        isCompleted: session.isCompleted,
        startTime: session.startTime,
      })),
      
      // Koç notları
      notes: coachStudent.notes.map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        priority: note.priority,
        isRead: note.isRead,
        createdAt: note.createdAt,
      })),
    };
  }

  /**
   * Koç notu ekle
   */
  async addCoachNote(coachId: string, studentId: string, noteData: {
    title: string;
    content: string;
    type?: string;
    priority?: string;
  }) {
    const coachStudent = await (this.prisma as any).coachStudent.findFirst({
      where: { 
        coachId,
        studentId,
        isActive: true 
      },
    });

    if (!coachStudent) {
      throw new NotFoundException('Öğrenci bulunamadı veya bu koça atanmamış');
    }

    return (this.prisma as any).coachNote.create({
      data: {
        coachStudentId: coachStudent.id,
        title: noteData.title,
        content: noteData.content,
        type: noteData.type || 'GENERAL',
        priority: noteData.priority || 'NORMAL',
      },
    });
  }

  /**
   * Öğrenci uyum skorunu güncelle
   */
  async updateStudentCompliance(coachId: string, studentId: string, complianceData: {
    date: Date;
    planComplianceScore: number;
    sessionCompletionRate: number;
    timeSpentVsPlanned: number;
    coachRating?: number;
    coachComment?: string;
  }) {
    const coachStudent = await (this.prisma as any).coachStudent.findFirst({
      where: { 
        coachId,
        studentId,
        isActive: true 
      },
    });

    if (!coachStudent) {
      throw new NotFoundException('Öğrenci bulunamadı veya bu koça atanmamış');
    }

    const weekStart = this.getWeekStart(complianceData.date);

    return (this.prisma as any).studentCompliance.upsert({
      where: {
        studentId_date: {
          studentId,
          date: complianceData.date,
        },
      },
      update: {
        planComplianceScore: complianceData.planComplianceScore,
        sessionCompletionRate: complianceData.sessionCompletionRate,
        timeSpentVsPlanned: complianceData.timeSpentVsPlanned,
        coachRating: complianceData.coachRating,
        coachComment: complianceData.coachComment,
        weekStart,
      },
      create: {
        studentId,
        date: complianceData.date,
        weekStart,
        planComplianceScore: complianceData.planComplianceScore,
        sessionCompletionRate: complianceData.sessionCompletionRate,
        timeSpentVsPlanned: complianceData.timeSpentVsPlanned,
        coachRating: complianceData.coachRating,
        coachComment: complianceData.coachComment,
      },
    });
  }

  /**
   * Koç performans özeti
   */
  async getCoachPerformance(coachId: string) {
    const students = await (this.prisma as any).coachStudent.findMany({
      where: { 
        coachId,
        isActive: true 
      },
      include: {
        student: {
          include: {
            studentCompliance: {
              orderBy: { date: 'desc' },
              take: 30,
            },
          },
        },
      },
    });

    const totalStudents = students.length;
    const avgCompliance = this.calculateAverageCompliance(students);
    const riskStudents = this.identifyRiskStudents(students);

    return {
      totalStudents,
      avgCompliance,
      riskStudents: riskStudents.length,
      riskStudentsList: riskStudents,
    };
  }

  // Yardımcı metodlar
  private calculateComplianceMetrics(complianceData: any[]) {
    if (complianceData.length === 0) {
      return {
        avgScore: 0,
        trend: 'STABLE',
        lastWeekScore: 0,
      };
    }

    const scores = complianceData.map(c => c.planComplianceScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const lastWeek = scores.slice(0, 7);
    const previousWeek = scores.slice(7, 14);
    
    const lastWeekAvg = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;
    const previousWeekAvg = previousWeek.length > 0 
      ? previousWeek.reduce((a, b) => a + b, 0) / previousWeek.length 
      : lastWeekAvg;

    let trend = 'STABLE';
    if (lastWeekAvg > previousWeekAvg + 5) trend = 'IMPROVING';
    else if (lastWeekAvg < previousWeekAvg - 5) trend = 'DECLINING';

    return {
      avgScore: Math.round(avgScore),
      trend,
      lastWeekScore: Math.round(lastWeekAvg),
    };
  }

  private calculateWeeklyProgress(complianceData: any[]) {
    const lastWeek = complianceData.slice(0, 7);
    const previousWeek = complianceData.slice(7, 14);

    return {
      currentWeek: {
        avgCompliance: lastWeek.length > 0 
          ? Math.round(lastWeek.reduce((a, c) => a + c.planComplianceScore, 0) / lastWeek.length)
          : 0,
        completedSessions: lastWeek.reduce((a, c) => a + c.completedSessions, 0),
        plannedSessions: lastWeek.reduce((a, c) => a + c.plannedSessions, 0),
      },
      previousWeek: {
        avgCompliance: previousWeek.length > 0 
          ? Math.round(previousWeek.reduce((a, c) => a + c.planComplianceScore, 0) / previousWeek.length)
          : 0,
        completedSessions: previousWeek.reduce((a, c) => a + c.completedSessions, 0),
        plannedSessions: previousWeek.reduce((a, c) => a + c.plannedSessions, 0),
      },
    };
  }

  private calculatePlanPerformance(plans: any[]) {
    const activePlans = plans.filter(p => p.isActive);
    
    if (activePlans.length === 0) {
      return {
        totalPlans: 0,
        activePlans: 0,
        avgProgress: 0,
      };
    }

    const totalProgress = activePlans.reduce((sum, plan) => {
      const sessions = plan.sessions || [];
      const completed = sessions.filter((s: any) => s.isCompleted).length;
      const total = sessions.length;
      return sum + (total > 0 ? (completed / total) * 100 : 0);
    }, 0);

    return {
      totalPlans: plans.length,
      activePlans: activePlans.length,
      avgProgress: Math.round(totalProgress / activePlans.length),
    };
  }

  private calculateAverageCompliance(students: any[]) {
    if (students.length === 0) return 0;

    const totalCompliance = students.reduce((sum, cs) => {
      const compliance = cs.student.studentCompliance;
      if (compliance.length === 0) return sum;
      
      const avg = compliance.reduce((a: number, c: any) => a + c.planComplianceScore, 0) / compliance.length;
      return sum + avg;
    }, 0);

    return Math.round(totalCompliance / students.length);
  }

  private identifyRiskStudents(students: any[]) {
    return students.filter(cs => {
      const compliance = cs.student.studentCompliance;
      if (compliance.length === 0) return false;
      
      const lastWeek = compliance.slice(0, 7);
      const avgScore = lastWeek.reduce((a: number, c: any) => a + c.planComplianceScore, 0) / lastWeek.length;
      
      return avgScore < 60; // Risk eşiği
    }).map(cs => ({
      id: cs.student.id,
      name: cs.student.name,
      avgCompliance: cs.student.studentCompliance.length > 0 
        ? Math.round(cs.student.studentCompliance.slice(0, 7).reduce((a: number, c: any) => a + c.planComplianceScore, 0) / 7)
        : 0,
    }));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Pazartesi
    return new Date(d.setDate(diff));
  }
}
