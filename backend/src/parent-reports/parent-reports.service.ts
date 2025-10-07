import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ParentReportsService {
  private readonly logger = new Logger(ParentReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Veli için haftalık rapor oluştur
   */
  async generateWeeklyReport(parentId: string, studentId: string, weekStart: Date) {
    // Öğrenci-veli ilişkisini kontrol et
    const familyMember = await this.prisma.familyMember.findFirst({
      where: {
        parentId,
        childId: studentId,
      },
    });

    if (!familyMember) {
      throw new NotFoundException('Bu öğrenci ile veli ilişkisi bulunamadı');
    }

    // Haftalık verileri topla
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const studentData = await this.collectStudentData(studentId, weekStart, weekEnd);
    
    // Raporu oluştur
    const report = await this.createWeeklyReport(parentId, studentId, weekStart, weekEnd, studentData);
    
    return report;
  }

  /**
   * Veli için mevcut haftalık raporu getir
   */
  async getWeeklyReport(parentId: string, studentId: string, weekStart: Date) {
    const report = await this.prisma.parentWeeklyReport.findFirst({
      where: {
        parentId,
        studentId,
        weekStart,
      },
    });

    if (!report) {
      // Rapor yoksa oluştur
      return this.generateWeeklyReport(parentId, studentId, weekStart);
    }

    return report;
  }

  /**
   * Veli için öğrenci listesi ve genel durum
   */
  async getParentDashboard(parentId: string) {
    // Veli-öğrenci ilişkilerini getir
    const familyMembers = await this.prisma.familyMember.findMany({
      where: { parentId },
      include: {
        child: {
          include: {
            studentProfile: true,
            studentCompliance: {
              orderBy: { date: 'desc' },
              take: 7, // Son 7 gün
            },
            studySessions: {
              where: {
                startTime: {
                  gte: this.getWeekStart(new Date()),
                },
              },
              orderBy: { startTime: 'desc' },
            },
          },
        },
      },
    });

    const students = familyMembers.map(fm => {
      const student = fm.child;
      const compliance = student.studentCompliance;
      const sessions = student.studySessions;

      return {
        id: student.id,
        name: student.name,
        grade: student.studentProfile?.grade,
        field: student.studentProfile?.field,
        
        // Bu hafta metrikleri
        thisWeek: {
          totalStudyTime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
          completedSessions: sessions.filter(s => s.isCompleted).length,
          avgCompliance: compliance.length > 0 
            ? Math.round(compliance.reduce((a, c) => a + c.planComplianceScore, 0) / compliance.length)
            : 0,
        },
        
        // Trend analizi
        trend: this.calculateTrend(compliance),
        riskLevel: this.calculateRiskLevel(compliance, sessions),
      };
    });

    return {
      students,
      summary: {
        totalStudents: students.length,
        avgCompliance: students.length > 0 
          ? Math.round(students.reduce((sum, s) => sum + s.thisWeek.avgCompliance, 0) / students.length)
          : 0,
        riskStudents: students.filter(s => s.riskLevel === 'HIGH').length,
      },
    };
  }

  /**
   * Öğrenci için günlük ısı haritası
   */
  async getStudentHeatmap(parentId: string, studentId: string, startDate: Date, endDate: Date) {
    // Veli-öğrenci ilişkisini kontrol et
    const familyMember = await this.prisma.familyMember.findFirst({
      where: { parentId, childId: studentId },
    });

    if (!familyMember) {
      throw new NotFoundException('Bu öğrenci ile veli ilişkisi bulunamadı');
    }

    // Günlük verileri topla
    const dailyData = await this.collectDailyData(studentId, startDate, endDate);
    
    // Isı haritası formatında döndür
    return this.formatHeatmapData(dailyData, startDate, endDate);
  }

  /**
   * Öğrenci için ders bazlı ilerleme
   */
  async getSubjectProgress(parentId: string, studentId: string, weekStart: Date) {
    // Veli-öğrenci ilişkisini kontrol et
    const familyMember = await this.prisma.familyMember.findFirst({
      where: { parentId, childId: studentId },
    });

    if (!familyMember) {
      throw new NotFoundException('Bu öğrenci ile veli ilişkisi bulunamadı');
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Ders bazlı verileri topla
    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId: studentId,
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Ders bazlı analiz
    const subjectData = this.analyzeSubjectData(sessions);
    
    return {
      weekStart,
      weekEnd,
      subjects: subjectData,
      summary: {
        totalStudyTime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.isCompleted).length,
        avgPerformance: sessions.filter(s => s.performance).length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.performance || 0), 0) / sessions.filter(s => s.performance).length)
          : 0,
      },
    };
  }

  // Yardımcı metodlar
  private async collectStudentData(studentId: string, weekStart: Date, weekEnd: Date) {
    const [sessions, compliance, plans] = await Promise.all([
      this.prisma.studySession.findMany({
        where: {
          userId: studentId,
          startTime: { gte: weekStart, lte: weekEnd },
        },
      }),
      this.prisma.studentCompliance.findMany({
        where: {
          studentId,
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
      this.prisma.plan.findMany({
        where: {
          userId: studentId,
          isActive: true,
        },
        include: {
          studySessions: {
            where: {
              startTime: { gte: weekStart, lte: weekEnd },
            },
          },
        },
      }),
    ]);

    return { sessions, compliance, plans };
  }

  private async createWeeklyReport(parentId: string, studentId: string, weekStart: Date, weekEnd: Date, studentData: any) {
    const { sessions, compliance, plans } = studentData;

    // Metrikleri hesapla
    const totalStudyTime = sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
    const completedSessions = sessions.filter((s: any) => s.isCompleted).length;
    const plannedSessions = plans.reduce((sum: number, p: any) => sum + (p.studySessions?.length || 0), 0);
    const complianceRate = compliance.length > 0 
      ? compliance.reduce((sum: number, c: any) => sum + c.planComplianceScore, 0) / compliance.length 
      : 0;

    // Ders bazlı dağılım
    const subjectBreakdown = this.calculateSubjectBreakdown(sessions);

    // Trend analizi
    const weeklyTrend = this.calculateWeeklyTrend(compliance);
    const riskLevel = this.calculateRiskLevel(compliance, sessions);

    // Koç değerlendirmesi (varsa)
    const coachSummary = await this.getCoachSummary(studentId, weekStart);

    return this.prisma.parentWeeklyReport.upsert({
      where: {
        parentId_studentId_weekStart: {
          parentId,
          studentId,
          weekStart,
        },
      },
      update: {
        totalStudyTime,
        completedSessions,
        plannedSessions,
        complianceRate,
        subjectBreakdown,
        weeklyTrend,
        riskLevel,
        coachSummary: coachSummary.summary,
        coachRecommendations: coachSummary.recommendations,
      },
      create: {
        parentId,
        studentId,
        weekStart,
        weekEnd,
        totalStudyTime,
        completedSessions,
        plannedSessions,
        complianceRate,
        subjectBreakdown,
        weeklyTrend,
        riskLevel,
        coachSummary: coachSummary.summary,
        coachRecommendations: coachSummary.recommendations,
      },
    });
  }

  private calculateSubjectBreakdown(sessions: any[]) {
    const breakdown: Record<string, number> = {};
    
    sessions.forEach(session => {
      const subject = session.subject || 'Genel';
      breakdown[subject] = (breakdown[subject] || 0) + (session.duration || 0);
    });

    return breakdown;
  }

  private calculateWeeklyTrend(compliance: any[]) {
    if (compliance.length < 2) return 'STABLE';
    
    const scores = compliance.map(c => c.planComplianceScore);
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 5) return 'IMPROVING';
    if (secondAvg < firstAvg - 5) return 'DECLINING';
    return 'STABLE';
  }

  private calculateRiskLevel(compliance: any[], sessions: any[]) {
    if (compliance.length === 0) return 'LOW';
    
    const avgCompliance = compliance.reduce((sum, c) => sum + c.planComplianceScore, 0) / compliance.length;
    const completionRate = sessions.length > 0 ? sessions.filter(s => s.isCompleted).length / sessions.length : 0;
    
    if (avgCompliance < 50 || completionRate < 0.3) return 'HIGH';
    if (avgCompliance < 70 || completionRate < 0.6) return 'MEDIUM';
    return 'LOW';
  }

  private calculateTrend(compliance: any[]) {
    if (compliance.length < 2) return 'STABLE';
    
    const recent = compliance.slice(0, 3);
    const older = compliance.slice(3, 6);
    
    if (recent.length === 0 || older.length === 0) return 'STABLE';
    
    const recentAvg = recent.reduce((a, c) => a + c.planComplianceScore, 0) / recent.length;
    const olderAvg = older.reduce((a, c) => a + c.planComplianceScore, 0) / older.length;
    
    if (recentAvg > olderAvg + 5) return 'IMPROVING';
    if (recentAvg < olderAvg - 5) return 'DECLINING';
    return 'STABLE';
  }

  private async collectDailyData(studentId: string, startDate: Date, endDate: Date) {
    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId: studentId,
        startTime: { gte: startDate, lte: endDate },
      },
      orderBy: { startTime: 'asc' },
    });

    // Günlük gruplama
    const dailyData: Record<string, any> = {};
    
    sessions.forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          totalMinutes: 0,
          completedSessions: 0,
          totalSessions: 0,
          avgPerformance: 0,
          subjects: {},
        };
      }
      
      dailyData[date].totalMinutes += session.duration || 0;
      dailyData[date].totalSessions += 1;
      if (session.isCompleted) dailyData[date].completedSessions += 1;
      
      const subject = session.subject || 'Genel';
      dailyData[subject] = (dailyData[subject] || 0) + (session.duration || 0);
    });

    return Object.values(dailyData);
  }

  private formatHeatmapData(dailyData: any[], startDate: Date, endDate: Date) {
    const heatmap: any[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dailyData.find(d => d.date === dateStr);
      
      heatmap.push({
        date: dateStr,
        value: dayData ? dayData.totalMinutes : 0,
        completedSessions: dayData ? dayData.completedSessions : 0,
        totalSessions: dayData ? dayData.totalSessions : 0,
        avgPerformance: dayData ? dayData.avgPerformance : 0,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return heatmap;
  }

  private analyzeSubjectData(sessions: any[]) {
    const subjectData: Record<string, any> = {};
    
    sessions.forEach(session => {
      const subject = session.subject || 'Genel';
      if (!subjectData[subject]) {
        subjectData[subject] = {
          subject,
          totalMinutes: 0,
          completedSessions: 0,
          totalSessions: 0,
          avgPerformance: 0,
          performanceScores: [],
        };
      }
      
      subjectData[subject].totalMinutes += session.duration || 0;
      subjectData[subject].totalSessions += 1;
      if (session.isCompleted) subjectData[subject].completedSessions += 1;
      if (session.performance) subjectData[subject].performanceScores.push(session.performance);
    });

    // Ortalama performansları hesapla
    Object.values(subjectData).forEach((data: any) => {
      if (data.performanceScores.length > 0) {
        data.avgPerformance = Math.round(
          data.performanceScores.reduce((a: number, b: number) => a + b, 0) / data.performanceScores.length
        );
      }
    });

    return Object.values(subjectData);
  }

  private async getCoachSummary(studentId: string, weekStart: Date) {
    const coachStudent = await this.prisma.coachStudent.findFirst({
      where: { studentId, isActive: true },
      include: {
        notes: {
          where: {
            createdAt: { gte: weekStart },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!coachStudent || coachStudent.notes.length === 0) {
      return { summary: null, recommendations: [] };
    }

    const recentNotes = coachStudent.notes.slice(0, 3);
    const summary = recentNotes.map(note => note.content).join(' ');
    const recommendations = recentNotes
      .filter(note => note.type === 'SUGGESTION')
      .map(note => note.content);

    return { summary, recommendations };
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
}
