import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AICoachService {
  private readonly logger = new Logger(AICoachService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Günlük AI önerisi oluştur
   */
  async generateDailyRecommendation(studentId: string, date: Date) {
    // Öğrenci verilerini topla
    const studentContext = await this.collectStudentContext(studentId, date);
    
    // AI önerisi oluştur
    const recommendation = await this.createDailyRecommendation(studentContext);
    
    // Veritabanına kaydet
    return this.saveDailyRecommendation(studentId, date, recommendation);
  }

  /**
   * Gün sonu değerlendirmesi
   */
  async generateDailyScore(studentId: string, date: Date, dailyData: {
    completedSessions: number;
    plannedSessions: number;
    studyTime: number;
    plannedTime: number;
    performance: number[];
  }) {
    // Günlük skor hesapla
    const dailyScore = this.calculateDailyScore(dailyData);
    
    // AI analizi oluştur
    const aiAnalysis = await this.createAIAnalysis(studentId, date, dailyData, dailyScore);
    
    // Güncelle
    return this.updateDailyScore(studentId, date, dailyScore, aiAnalysis);
  }

  /**
   * Öğrenci için günlük öneri getir
   */
  async getDailyRecommendation(studentId: string, date: Date) {
    const recommendation = await this.prisma.aICoachDaily.findUnique({
      where: {
        studentId_date: {
          studentId,
          date,
        },
      },
    });

    if (!recommendation) {
      // Öneri yoksa oluştur
      return this.generateDailyRecommendation(studentId, date);
    }

    return recommendation;
  }

  /**
   * Öğrenci için haftalık AI özeti
   */
  async getWeeklySummary(studentId: string, weekStart: Date) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const dailyData = await this.prisma.aICoachDaily.findMany({
      where: {
        studentId,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: { date: 'asc' },
    });

    if (dailyData.length === 0) {
      return {
        summary: 'Bu hafta için veri bulunamadı.',
        trends: [],
        recommendations: [],
      };
    }

    return this.createWeeklySummary(dailyData);
  }

  /**
   * Motivasyonel mesaj oluştur
   */
  async generateMotivationalMessage(studentId: string, context: {
    recentPerformance: number;
    streak: number;
    goals: string[];
  }) {
    const message = this.createMotivationalMessage(context);
    
    // Günlük kayıt varsa güncelle
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await this.prisma.aICoachDaily.upsert({
      where: {
        studentId_date: {
          studentId,
          date: today,
        },
      },
      update: {
        motivationalMessage: message,
      },
      create: {
        studentId,
        date: today,
        dailyRecommendation: 'Günlük öneri oluşturuluyor...',
        priorityTasks: [],
        motivationalMessage: message,
      },
    });

    return { message };
  }

  // Yardımcı metodlar
  private async collectStudentContext(studentId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [student, recentSessions, activePlans, compliance] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        include: {
          studentProfile: true,
          gamificationProfile: true,
        },
      }),
      this.prisma.studySession.findMany({
        where: {
          userId: studentId,
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.plan.findMany({
        where: {
          userId: studentId,
          isActive: true,
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
        include: {
          studySessions: {
            where: {
              startTime: { gte: startOfDay, lte: endOfDay },
            },
          },
        },
      }),
      this.prisma.studentCompliance.findMany({
        where: {
          studentId,
          date: { gte: new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
      student,
      recentSessions,
      activePlans,
      compliance,
      date,
    };
  }

  private async createDailyRecommendation(context: any) {
    const { student, activePlans, compliance, recentSessions } = context;
    
    // Basit AI önerisi (gerçek AI entegrasyonu için OpenAI kullanılabilir)
    const recommendations = this.generateRecommendations(student, activePlans, compliance, recentSessions);
    
    return {
      dailyRecommendation: recommendations.main,
      priorityTasks: recommendations.tasks,
      motivationalMessage: recommendations.motivation,
    };
  }

  private generateRecommendations(student: any, plans: any[], compliance: any[], sessions: any[]) {
    const profile = student.studentProfile;
    const gamification = student.gamificationProfile;
    
    // Temel öneriler
    let mainRecommendation = 'Bugün planlı çalışma programınızı takip edin.';
    const tasks: string[] = [];
    let motivation = 'Harika bir gün geçirmeniz dileğiyle! 💪';

    // Plan durumuna göre öneriler
    if (plans.length === 0) {
      mainRecommendation = 'Yeni bir çalışma planı oluşturmanızı öneriyorum.';
      tasks.push('Çalışma planı oluştur');
    } else {
      const todaySessions = plans.flatMap(p => p.studySessions || []);
      if (todaySessions.length === 0) {
        mainRecommendation = 'Bugün için planlanmış seansınız yok. Yeni seanslar ekleyebilirsiniz.';
        tasks.push('Günlük seanslar planla');
      } else {
        const completed = todaySessions.filter(s => s.isCompleted).length;
        const total = todaySessions.length;
        
        if (completed === 0) {
          mainRecommendation = 'Bugün başlamanız gereken seanslarınız var.';
          tasks.push('İlk seansa başla');
        } else if (completed < total) {
          mainRecommendation = 'Kalan seanslarınızı tamamlamaya devam edin.';
          tasks.push('Kalan seansları tamamla');
        } else {
          mainRecommendation = 'Harika! Bugünkü seanslarınızı tamamladınız.';
          tasks.push('Yarın için hazırlık yap');
        }
      }
    }

    // Compliance durumuna göre öneriler
    if (compliance.length > 0) {
      const avgCompliance = compliance.reduce((sum, c) => sum + c.planComplianceScore, 0) / compliance.length;
      
      if (avgCompliance < 50) {
        mainRecommendation = 'Plan uyumunuzu artırmak için daha küçük hedefler belirleyin.';
        tasks.push('Küçük hedefler belirle');
      } else if (avgCompliance > 80) {
        mainRecommendation = 'Mükemmel performans! Bu tempoyu koruyun.';
        motivation = 'Süper performans gösteriyorsunuz! 🌟';
      }
    }

    // Gamification durumuna göre motivasyon
    if (gamification) {
      if (gamification.streak > 7) {
        motivation = `${gamification.streak} günlük seriniz var! Muhteşem! 🔥`;
      } else if (gamification.energy < 30) {
        motivation = 'Enerjiniz düşük görünüyor. Kısa molalar alın.';
        tasks.push('Kısa mola ver');
      }
    }

    return {
      main: mainRecommendation,
      tasks,
      motivation,
    };
  }

  private async saveDailyRecommendation(studentId: string, date: Date, recommendation: any) {
    return this.prisma.aICoachDaily.upsert({
      where: {
        studentId_date: {
          studentId,
          date,
        },
      },
      update: {
        dailyRecommendation: recommendation.dailyRecommendation,
        priorityTasks: recommendation.priorityTasks,
        motivationalMessage: recommendation.motivationalMessage,
      },
      create: {
        studentId,
        date,
        dailyRecommendation: recommendation.dailyRecommendation,
        priorityTasks: recommendation.priorityTasks,
        motivationalMessage: recommendation.motivationalMessage,
      },
    });
  }

  private calculateDailyScore(dailyData: any): number {
    const { completedSessions, plannedSessions, studyTime, plannedTime, performance } = dailyData;
    
    // Temel skor hesaplama (1-10 arası)
    let score = 5; // Başlangıç skoru
    
    // Tamamlama oranı (40% ağırlık)
    if (plannedSessions > 0) {
      const completionRate = completedSessions / plannedSessions;
      score += (completionRate - 0.5) * 4; // 0.5 = ortalama, 4 = ağırlık
    }
    
    // Süre uyumu (30% ağırlık)
    if (plannedTime > 0) {
      const timeRatio = studyTime / plannedTime;
      score += (timeRatio - 0.5) * 3;
    }
    
    // Performans (30% ağırlık)
    if (performance.length > 0) {
      const avgPerformance = performance.reduce((a: number, b: number) => a + b, 0) / performance.length;
      score += (avgPerformance - 50) / 50 * 3; // 50 = ortalama performans
    }
    
    // Skoru 1-10 arasına sınırla
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  private async createAIAnalysis(studentId: string, date: Date, dailyData: any, score: number) {
    const analysis = {
      score,
      breakdown: {
        completion: dailyData.plannedSessions > 0 ? (dailyData.completedSessions / dailyData.plannedSessions) * 100 : 0,
        timeEfficiency: dailyData.plannedTime > 0 ? (dailyData.studyTime / dailyData.plannedTime) * 100 : 0,
        performance: dailyData.performance.length > 0 
          ? dailyData.performance.reduce((a: number, b: number) => a + b, 0) / dailyData.performance.length 
          : 0,
      },
      insights: this.generateInsights(dailyData, score),
      nextDayFocus: this.generateNextDayFocus(dailyData, score),
    };

    return analysis;
  }

  private generateInsights(dailyData: any, score: number): string[] {
    const insights: string[] = [];
    
    if (score >= 8) {
      insights.push('Mükemmel bir gün geçirdiniz!');
      insights.push('Bu performansı korumaya devam edin.');
    } else if (score >= 6) {
      insights.push('İyi bir gün geçirdiniz.');
      insights.push('Küçük iyileştirmelerle daha da iyi olabilirsiniz.');
    } else if (score >= 4) {
      insights.push('Gününüz ortalama seviyede geçti.');
      insights.push('Plan uyumunuzu artırmaya odaklanın.');
    } else {
      insights.push('Gününüz beklenenden düşük geçti.');
      insights.push('Yarın için daha iyi bir plan yapın.');
    }

    return insights;
  }

  private generateNextDayFocus(dailyData: any, score: number): string[] {
    const focus: string[] = [];
    
    if (dailyData.completedSessions < dailyData.plannedSessions) {
      focus.push('Seans tamamlama oranını artır');
    }
    
    if (dailyData.studyTime < dailyData.plannedTime * 0.8) {
      focus.push('Çalışma süresini artır');
    }
    
    if (dailyData.performance.length > 0) {
      const avgPerf = dailyData.performance.reduce((a: number, b: number) => a + b, 0) / dailyData.performance.length;
      if (avgPerf < 70) {
        focus.push('Performans kalitesini artır');
      }
    }
    
    if (focus.length === 0) {
      focus.push('Mevcut performansı koru');
    }
    
    return focus;
  }

  private async updateDailyScore(studentId: string, date: Date, score: number, analysis: any) {
    return this.prisma.aICoachDaily.update({
      where: {
        studentId_date: {
          studentId,
          date,
        },
      },
      data: {
        dailyScore: score,
        scoreBreakdown: analysis.breakdown,
        improvementAreas: analysis.insights,
        aiAnalysis: analysis,
        nextDayFocus: analysis.nextDayFocus,
      },
    });
  }

  private createWeeklySummary(dailyData: any[]) {
    const scores = dailyData.filter(d => d.dailyScore).map(d => d.dailyScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    const trends = this.analyzeTrends(dailyData);
    const recommendations = this.generateWeeklyRecommendations(dailyData, avgScore);
    
    return {
      summary: `Bu hafta ortalama ${avgScore.toFixed(1)} puan aldınız. ${trends.summary}`,
      trends,
      recommendations,
      dailyScores: dailyData.map(d => ({
        date: d.date,
        score: d.dailyScore,
        recommendation: d.dailyRecommendation,
      })),
    };
  }

  private analyzeTrends(dailyData: any[]) {
    const scores = dailyData.filter(d => d.dailyScore).map(d => d.dailyScore);
    
    if (scores.length < 2) {
      return { summary: 'Yeterli veri yok.', type: 'STABLE' };
    }
    
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 1) {
      return { summary: 'Hafta boyunca performansınız yükseldi.', type: 'IMPROVING' };
    } else if (secondAvg < firstAvg - 1) {
      return { summary: 'Hafta boyunca performansınız düştü.', type: 'DECLINING' };
    } else {
      return { summary: 'Hafta boyunca tutarlı bir performans gösterdiniz.', type: 'STABLE' };
    }
  }

  private generateWeeklyRecommendations(dailyData: any[], avgScore: number): string[] {
    const recommendations: string[] = [];
    
    if (avgScore >= 8) {
      recommendations.push('Mükemmel performans! Bu tempoyu koruyun.');
    } else if (avgScore >= 6) {
      recommendations.push('İyi bir hafta geçirdiniz. Küçük iyileştirmelerle daha da iyi olabilirsiniz.');
    } else if (avgScore >= 4) {
      recommendations.push('Haftanız ortalama seviyede geçti. Plan uyumunuzu artırmaya odaklanın.');
    } else {
      recommendations.push('Haftanız beklenenden düşük geçti. Gelecek hafta için daha iyi bir plan yapın.');
    }
    
    // Spesifik öneriler
    const incompleteDays = dailyData.filter(d => !d.dailyScore || d.dailyScore < 5).length;
    if (incompleteDays > 2) {
      recommendations.push('Tutarlılığınızı artırmak için günlük hedeflerinizi küçültün.');
    }
    
    return recommendations;
  }

  private createMotivationalMessage(context: any): string {
    const { recentPerformance, streak, goals } = context;
    
    if (streak > 7) {
      return `Harika! ${streak} günlük seriniz var! 🔥 Bu tempoyu koruyun!`;
    } else if (recentPerformance > 80) {
      return 'Mükemmel performans gösteriyorsunuz! 🌟 Devam edin!';
    } else if (streak > 3) {
      return `Güzel bir seri yakaladınız! ${streak} günlük seriniz var! 💪`;
    } else if (goals.length > 0) {
      return `Hedeflerinize odaklanın: ${goals[0]} 🎯`;
    } else {
      return 'Bugün harika bir gün olacak! Başlayalım! 💪';
    }
  }
}
