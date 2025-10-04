import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OptimizedUserContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * N+1 problemi çözülmüş kullanıcı bağlamı analizi
   * Tek sorgu ile tüm ilgili verileri çeker
   */
  async analyzeUserContextOptimized(userId: string) {
    // Tek sorgu ile tüm ilgili verileri çek
    const userWithData = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        // Study sessions - son 200 kayıt
        studySessions: {
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: {
            id: true,
            subject: true,
            topic: true,
            startTime: true,
            duration: true,
            isCompleted: true,
            performance: true,
            createdAt: true,
            planId: true,
          },
        },
        // Quiz results - son 100 kayıt
        quizResults: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            subject: true,
            topic: true,
            score: true,
            totalScore: true,
            createdAt: true,
          },
        },
        // Exam results - son 50 kayıt
        examResults: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            subject: true,
            topic: true,
            score: true,
            totalScore: true,
            examType: true,
            createdAt: true,
          },
        },
        // Plans - son 10 plan
        plans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            type: true,
            subjects: true,
            goals: true,
            startDate: true,
            endDate: true,
            isActive: true,
            createdAt: true,
            sessions: {
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
          },
        },
        // Student profile
        studentProfile: {
          select: {
            grade: true,
            field: true,
            learningStyle: true,
            goals: true,
            strengths: true,
            weaknesses: true,
            selectedSubjects: true,
          },
        },
      },
    });

    if (!userWithData) {
      throw new Error('User not found');
    }

    const { studySessions, quizResults, examResults, plans, studentProfile } = userWithData;

    // 1) Performans geçmişi analizi
    const subjectPerformance = this.analyzeSubjectPerformance(studySessions, quizResults, examResults);
    
    // 2) Konu bazlı başarı oranları
    const topicSuccessRates = this.calculateTopicSuccessRates(quizResults, examResults);
    
    // 3) Çalışma alışkanlıkları
    const studyHabits = this.analyzeStudyHabits(studySessions);
    
    // 4) Zayıf ve güçlü alanlar
    const weakAreas = this.identifyWeakAreas(topicSuccessRates, subjectPerformance);
    const strongAreas = this.identifyStrongAreas(topicSuccessRates, subjectPerformance);

    // 5) Plan performansı
    const planPerformance = this.analyzePlanPerformance(plans);

    return {
      // Temel bilgiler
      userId,
      studentProfile,
      
      // Performans metrikleri
      subjectPerformance,
      topicSuccessRates,
      
      // Alışkanlıklar
      studyHabits,
      
      // Alanlar
      weakAreas,
      strongAreas,
      
      // Plan analizi
      planPerformance,
      
      // Özet istatistikler
      summary: {
        totalStudySessions: studySessions.length,
        totalQuizAttempts: quizResults.length,
        totalExamAttempts: examResults.length,
        totalPlans: plans.length,
        activePlans: plans.filter(p => p.isActive).length,
        averageSessionDuration: studyHabits.averageSessionDuration,
        preferredStudyHours: studyHabits.preferredHours,
      },
    };
  }

  /**
   * Ders performansını analiz eder
   */
  private analyzeSubjectPerformance(studySessions: any[], quizResults: any[], examResults: any[]) {
    const performance: Record<string, number[]> = {};
    
    // Study sessions'dan performans çıkar
    studySessions.forEach(session => {
      if (session.subject && session.performance) {
        if (!performance[session.subject]) {
          performance[session.subject] = [];
        }
        performance[session.subject].push(session.performance);
      }
    });

    // Quiz sonuçlarından performans çıkar
    quizResults.forEach(quiz => {
      if (quiz.subject && quiz.totalScore > 0) {
        const score = (quiz.score / quiz.totalScore) * 100;
        if (!performance[quiz.subject]) {
          performance[quiz.subject] = [];
        }
        performance[quiz.subject].push(score);
      }
    });

    // Exam sonuçlarından performans çıkar
    examResults.forEach(exam => {
      if (exam.subject && exam.totalScore > 0) {
        const score = (exam.score / exam.totalScore) * 100;
        if (!performance[exam.subject]) {
          performance[exam.subject] = [];
        }
        performance[exam.subject].push(score);
      }
    });

    // Ortalama performansları hesapla
    const avgPerformance: Record<string, number> = {};
    Object.keys(performance).forEach(subject => {
      const scores = performance[subject];
      avgPerformance[subject] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return avgPerformance;
  }

  /**
   * Konu bazlı başarı oranlarını hesaplar
   */
  private calculateTopicSuccessRates(quizResults: any[], examResults: any[]) {
    const topicBuckets: Record<string, number[]> = {};
    
    quizResults.forEach(quiz => {
      const key = (quiz.topic || quiz.subject || 'Genel').toString();
      const scorePct = quiz.totalScore && quiz.totalScore > 0 ? (quiz.score / quiz.totalScore) * 100 : 0;
      if (!topicBuckets[key]) topicBuckets[key] = [];
      topicBuckets[key].push(scorePct);
    });
    
    examResults.forEach(exam => {
      const key = (exam.topic || exam.subject || 'Genel').toString();
      const scorePct = exam.totalScore && exam.totalScore > 0 ? (exam.score / exam.totalScore) * 100 : 0;
      if (!topicBuckets[key]) topicBuckets[key] = [];
      topicBuckets[key].push(scorePct);
    });

    const topicSuccessRates: Record<string, number> = {};
    Object.keys(topicBuckets).forEach(topic => {
      const scores = topicBuckets[topic];
      topicSuccessRates[topic] = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;
    });

    return topicSuccessRates;
  }

  /**
   * Çalışma alışkanlıklarını analiz eder
   */
  private analyzeStudyHabits(studySessions: any[]) {
    const hourCounts: Record<number, number> = {};
    const subjectTime: Record<string, number> = {};
    const sessionDurations: number[] = [];
    const dayOfWeekCounts: Record<number, number> = {};

    studySessions.forEach(session => {
      const startTime = new Date(session.startTime);
      const hour = startTime.getHours();
      const dayOfWeek = startTime.getDay();
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
      
      if (session.subject) {
        subjectTime[session.subject] = (subjectTime[session.subject] || 0) + session.duration;
      }
      
      sessionDurations.push(session.duration);
    });

    // En çok çalışılan saatleri bul
    const preferredHours = Object.keys(hourCounts)
      .map(hour => parseInt(hour))
      .sort((a, b) => hourCounts[b] - hourCounts[a])
      .slice(0, 3)
      .map(hour => {
        if (hour < 6) return 'Gece';
        if (hour < 12) return 'Sabah';
        if (hour < 18) return 'Öğleden sonra';
        return 'Akşam';
      });

    // En çok çalışılan günleri bul
    const preferredDays = Object.keys(dayOfWeekCounts)
      .map(day => parseInt(day))
      .sort((a, b) => dayOfWeekCounts[b] - dayOfWeekCounts[a])
      .map(day => {
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return dayNames[day];
      });

    return {
      preferredHours,
      preferredDays,
      timeAllocation: subjectTime,
      averageSessionDuration: sessionDurations.length > 0 
        ? sessionDurations.reduce((sum, dur) => sum + dur, 0) / sessionDurations.length 
        : 0,
      totalStudyTime: sessionDurations.reduce((sum, dur) => sum + dur, 0),
      studyFrequency: studySessions.length,
    };
  }

  /**
   * Zayıf alanları tespit eder
   */
  private identifyWeakAreas(topicSuccessRates: Record<string, number>, subjectPerformance: Record<string, number>): string[] {
    const weakAreas: string[] = [];
    
    Object.entries(topicSuccessRates).forEach(([topic, rate]) => {
      if (rate < 60) {
        weakAreas.push(topic);
      }
    });

    Object.entries(subjectPerformance).forEach(([subject, performance]) => {
      if (performance < 60) {
        weakAreas.push(subject);
      }
    });

    return [...new Set(weakAreas)];
  }

  /**
   * Güçlü alanları tespit eder
   */
  private identifyStrongAreas(topicSuccessRates: Record<string, number>, subjectPerformance: Record<string, number>): string[] {
    const strongAreas: string[] = [];
    
    Object.entries(topicSuccessRates).forEach(([topic, rate]) => {
      if (rate >= 80) {
        strongAreas.push(topic);
      }
    });

    Object.entries(subjectPerformance).forEach(([subject, performance]) => {
      if (performance >= 80) {
        strongAreas.push(subject);
      }
    });

    return [...new Set(strongAreas)];
  }

  /**
   * Plan performansını analiz eder
   */
  private analyzePlanPerformance(plans: any[]) {
    const planStats = plans.map(plan => {
      const sessions = plan.sessions || [];
      const completedSessions = sessions.filter(s => s.isCompleted);
      
      return {
        planId: plan.id,
        title: plan.title,
        type: plan.type,
        isActive: plan.isActive,
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        completionRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
        totalStudyTime: sessions.reduce((sum, s) => sum + s.duration, 0),
        completedStudyTime: completedSessions.reduce((sum, s) => sum + s.duration, 0),
      };
    });

    return {
      plans: planStats,
      totalPlans: plans.length,
      activePlans: plans.filter(p => p.isActive).length,
      averageCompletionRate: planStats.length > 0 
        ? planStats.reduce((sum, p) => sum + p.completionRate, 0) / planStats.length 
        : 0,
    };
  }
}
