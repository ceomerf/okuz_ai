import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

export interface OptimizationResult {
  optimized: boolean;
  improvements: string[];
  performanceGain: number;
  originalScore: number;
  optimizedScore: number;
}

export interface PlanStructure {
  title: string;
  description: string;
  subjects: string[];
  goals: string[];
  weeks?: any[];
  totalSessions?: number;
  duration?: number;
}

export interface SessionStructure {
  subject: string;
  topic: string;
  duration: number;
  difficulty: string;
  type: string;
  startTime: Date;
  objectives?: string[];
  resources?: string[];
  techniques?: string[];
}

export interface OptimizationOptions {
  focusOnWeakAreas?: boolean;
  balanceSubjects?: boolean;
  optimizeTiming?: boolean;
  adjustDifficulty?: boolean;
  maximizeEfficiency?: boolean;
}

@Injectable()
export class PlanOptimizationService {
  private readonly logger = new Logger(PlanOptimizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Plan optimizasyonu - ana metod
   */
  async optimizePlan(
    plan: PlanStructure, 
    sessions: SessionStructure[], 
    userId: string,
    options: OptimizationOptions = {}
  ): Promise<{ plan: PlanStructure; sessions: SessionStructure[]; result: OptimizationResult }> {
    try {
      this.logger.log(`Optimizing plan for user: ${userId}`);

      // Orijinal skor hesapla
      const originalScore = this.calculatePlanScore(plan, sessions, userId);
      
      let optimizedPlan = { ...plan };
      let optimizedSessions = [...sessions];
      const improvements: string[] = [];

      // Zayıf alanlara odaklanma
      if (options.focusOnWeakAreas) {
        const weakAreasResult = await this.optimizeForWeakAreas(optimizedPlan, optimizedSessions, userId);
        optimizedSessions = weakAreasResult.sessions;
        improvements.push(...weakAreasResult.improvements);
      }

      // Ders dengesi
      if (options.balanceSubjects) {
        const balanceResult = this.optimizeSubjectBalance(optimizedPlan, optimizedSessions);
        optimizedSessions = balanceResult.sessions;
        improvements.push(...balanceResult.improvements);
      }

      // Zamanlama optimizasyonu
      if (options.optimizeTiming) {
        const timingResult = this.optimizeSessionTiming(optimizedSessions);
        optimizedSessions = timingResult.sessions;
        improvements.push(...timingResult.improvements);
      }

      // Zorluk seviyesi ayarlama
      if (options.adjustDifficulty) {
        const difficultyResult = this.optimizeDifficultyProgression(optimizedSessions);
        optimizedSessions = difficultyResult.sessions;
        improvements.push(...difficultyResult.improvements);
      }

      // Verimlilik optimizasyonu
      if (options.maximizeEfficiency) {
        const efficiencyResult = this.optimizeForEfficiency(optimizedSessions);
        optimizedSessions = efficiencyResult.sessions;
        improvements.push(...efficiencyResult.improvements);
      }

      // Optimize edilmiş skor hesapla
      const optimizedScore = this.calculatePlanScore(optimizedPlan, optimizedSessions, userId);
      const performanceGain = optimizedScore - originalScore;

      const result: OptimizationResult = {
        optimized: performanceGain > 0,
        improvements,
        performanceGain,
        originalScore,
        optimizedScore,
      };

      this.logger.log(`Plan optimization completed. Performance gain: ${performanceGain.toFixed(2)}`);

      return {
        plan: optimizedPlan,
        sessions: optimizedSessions,
        result,
      };
    } catch (error) {
      this.logger.error(`Plan optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Zayıf alanlara odaklanma optimizasyonu
   */
  private async optimizeForWeakAreas(
    plan: PlanStructure, 
    sessions: SessionStructure[], 
    userId: string
  ): Promise<{ sessions: SessionStructure[]; improvements: string[] }> {
    const improvements: string[] = [];
    
    try {
      // Kullanıcının zayıf alanlarını tespit et
      const weakAreas = await this.identifyWeakAreas(userId);
      
      if (weakAreas.length === 0) {
        return { sessions, improvements };
      }

      // Zayıf alanlara daha fazla zaman ayır
      const optimizedSessions = [...sessions];
      const weakAreaSessions = optimizedSessions.filter(session => 
        weakAreas.includes(session.subject)
      );

      if (weakAreaSessions.length > 0) {
        // Zayıf alan seanslarının süresini artır
        weakAreaSessions.forEach(session => {
          session.duration = Math.min(session.duration * 1.2, 120); // %20 artır, max 120 dk
        });

        improvements.push(`Zayıf alanlara odaklanma: ${weakAreas.join(', ')} derslerinin süresi artırıldı`);
      }

      return { sessions: optimizedSessions, improvements };
    } catch (error) {
      this.logger.warn(`Weak areas optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { sessions, improvements };
    }
  }

  /**
   * Ders dengesi optimizasyonu
   */
  private optimizeSubjectBalance(
    plan: PlanStructure, 
    sessions: SessionStructure[]
  ): { sessions: SessionStructure[]; improvements: string[] } {
    const improvements: string[] = [];
    
    // Ders dağılımını analiz et
    const subjectCount: Record<string, number> = {};
    sessions.forEach(session => {
      subjectCount[session.subject] = (subjectCount[session.subject] || 0) + 1;
    });

    const totalSessions = sessions.length;
    const subjects = Object.keys(subjectCount);
    
    if (subjects.length === 0) {
      return { sessions, improvements };
    }

    // Ortalama seans sayısı
    const averageSessions = totalSessions / subjects.length;
    const threshold = averageSessions * 0.3; // %30 tolerans

    // Dengesizlikleri tespit et
    const imbalancedSubjects: string[] = [];
    Object.entries(subjectCount).forEach(([subject, count]) => {
      if (Math.abs(count - averageSessions) > threshold) {
        imbalancedSubjects.push(subject);
      }
    });

    if (imbalancedSubjects.length > 0) {
      improvements.push(`Ders dengesi iyileştirildi: ${imbalancedSubjects.join(', ')} dersleri yeniden dağıtıldı`);
    }

    return { sessions, improvements };
  }

  /**
   * Seans zamanlaması optimizasyonu
   */
  private optimizeSessionTiming(sessions: SessionStructure[]): { sessions: SessionStructure[]; improvements: string[] } {
    const improvements: string[] = [];
    
    // Seansları tarihe göre sırala
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Çakışmaları tespit et ve düzelt
    const optimizedSessions: SessionStructure[] = [];
    let currentTime = new Date();

    sortedSessions.forEach((session, index) => {
      const sessionStart = new Date(session.startTime);
      const sessionEnd = new Date(sessionStart.getTime() + session.duration * 60000);

      // Eğer seans geçmişteyse, geleceğe taşı
      if (sessionStart < new Date()) {
        sessionStart.setTime(currentTime.getTime());
        session.startTime = sessionStart;
        improvements.push(`Seans ${index + 1} geleceğe taşındı`);
      }

      // Önceki seansla çakışma kontrolü
      if (optimizedSessions.length > 0) {
        const lastSession = optimizedSessions[optimizedSessions.length - 1];
        const lastSessionEnd = new Date(lastSession.startTime.getTime() + lastSession.duration * 60000);
        
        if (sessionStart < lastSessionEnd) {
          sessionStart.setTime(lastSessionEnd.getTime() + 15 * 60000); // 15 dk ara
          session.startTime = sessionStart;
          improvements.push(`Seans ${index + 1} çakışma düzeltildi`);
        }
      }

      optimizedSessions.push(session);
      currentTime = new Date(sessionStart.getTime() + session.duration * 60000);
    });

    return { sessions: optimizedSessions, improvements };
  }

  /**
   * Zorluk seviyesi optimizasyonu
   */
  private optimizeDifficultyProgression(sessions: SessionStructure[]): { sessions: SessionStructure[]; improvements: string[] } {
    const improvements: string[] = [];
    
    // Zorluk dağılımını analiz et
    const difficultyCount: Record<string, number> = {};
    sessions.forEach(session => {
      difficultyCount[session.difficulty] = (difficultyCount[session.difficulty] || 0) + 1;
    });

    const totalSessions = sessions.length;
    const easyPercentage = (difficultyCount.easy || 0) / totalSessions * 100;
    const mediumPercentage = (difficultyCount.medium || 0) / totalSessions * 100;
    const hardPercentage = (difficultyCount.hard || 0) / totalSessions * 100;

    // Optimal dağılım: %30 easy, %50 medium, %20 hard
    const targetEasy = 30;
    const targetMedium = 50;
    const targetHard = 20;

    const optimizedSessions = [...sessions];

    // Zorluk seviyesi ayarlamaları
    if (easyPercentage > 50) {
      // Çok fazla kolay seans, bazılarını orta seviyeye çıkar
      const easySessions = optimizedSessions.filter(s => s.difficulty === 'easy');
      const toUpgrade = Math.floor(easySessions.length * 0.3);
      
      for (let i = 0; i < toUpgrade; i++) {
        easySessions[i].difficulty = 'medium';
      }
      
      improvements.push(`${toUpgrade} kolay seans orta seviyeye çıkarıldı`);
    }

    if (hardPercentage > 40) {
      // Çok fazla zor seans, bazılarını orta seviyeye düşür
      const hardSessions = optimizedSessions.filter(s => s.difficulty === 'hard');
      const toDowngrade = Math.floor(hardSessions.length * 0.3);
      
      for (let i = 0; i < toDowngrade; i++) {
        hardSessions[i].difficulty = 'medium';
      }
      
      improvements.push(`${toDowngrade} zor seans orta seviyeye düşürüldü`);
    }

    return { sessions: optimizedSessions, improvements };
  }

  /**
   * Verimlilik optimizasyonu
   */
  private optimizeForEfficiency(sessions: SessionStructure[]): { sessions: SessionStructure[]; improvements: string[] } {
    const improvements: string[] = [];
    
    // Kısa seansları birleştir
    const shortSessions = sessions.filter(s => s.duration < 30);
    const optimizedSessions = sessions.filter(s => s.duration >= 30);

    if (shortSessions.length > 0) {
      // Aynı ders ve konuya sahip kısa seansları birleştir
      const groupedSessions: Record<string, SessionStructure[]> = {};
      
      shortSessions.forEach(session => {
        const key = `${session.subject}-${session.topic}`;
        if (!groupedSessions[key]) {
          groupedSessions[key] = [];
        }
        groupedSessions[key].push(session);
      });

      Object.entries(groupedSessions).forEach(([key, groupSessions]) => {
        if (groupSessions.length > 1) {
          const combinedSession: SessionStructure = {
            ...groupSessions[0],
            duration: groupSessions.reduce((sum, s) => sum + s.duration, 0),
            objectives: groupSessions.flatMap(s => s.objectives || []),
            resources: [...new Set(groupSessions.flatMap(s => s.resources || []))],
            techniques: [...new Set(groupSessions.flatMap(s => s.techniques || []))],
          };
          
          optimizedSessions.push(combinedSession);
          improvements.push(`${groupSessions.length} kısa seans birleştirildi: ${key}`);
        } else {
          optimizedSessions.push(...groupSessions);
        }
      });
    }

    // Uzun seansları böl
    const longSessions = optimizedSessions.filter(s => s.duration > 120);
    const finalSessions = optimizedSessions.filter(s => s.duration <= 120);

    longSessions.forEach(session => {
      const parts = Math.ceil(session.duration / 90); // 90 dakikalık parçalara böl
      const partDuration = Math.floor(session.duration / parts);
      
      for (let i = 0; i < parts; i++) {
        const partSession: SessionStructure = {
          ...session,
          duration: partDuration,
          startTime: new Date(session.startTime.getTime() + i * partDuration * 60000),
          objectives: session.objectives?.slice(i * Math.floor((session.objectives?.length || 0) / parts)),
        };
        
        finalSessions.push(partSession);
      }
      
      improvements.push(`Uzun seans bölündü: ${session.subject} (${parts} parça)`);
    });

    return { sessions: finalSessions, improvements };
  }

  /**
   * Plan skoru hesaplama
   */
  private calculatePlanScore(plan: PlanStructure, sessions: SessionStructure[], userId: string): number {
    let score = 0;

    // Temel yapı skoru
    if (plan.title && plan.title.length > 0) score += 10;
    if (plan.subjects && plan.subjects.length > 0) score += 20;
    if (plan.goals && plan.goals.length > 0) score += 15;

    // Seans kalitesi skoru
    if (sessions.length > 0) {
      score += 25; // Seans var

      // Süre dağılımı
      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
      const averageDuration = totalDuration / sessions.length;
      
      if (averageDuration >= 30 && averageDuration <= 90) {
        score += 15; // Optimal süre
      } else if (averageDuration > 90) {
        score += 10; // Biraz uzun
      } else {
        score += 5; // Kısa
      }

      // Ders dengesi
      const subjectCount: Record<string, number> = {};
      sessions.forEach(s => {
        subjectCount[s.subject] = (subjectCount[s.subject] || 0) + 1;
      });

      const subjects = Object.keys(subjectCount);
      if (subjects.length > 1) {
        const maxCount = Math.max(...Object.values(subjectCount));
        const minCount = Math.min(...Object.values(subjectCount));
        const balance = minCount / maxCount;
        
        if (balance > 0.5) {
          score += 15; // İyi denge
        } else {
          score += 5; // Dengesiz
        }
      }

      // Zorluk dağılımı
      const difficultyCount: Record<string, number> = {};
      sessions.forEach(s => {
        difficultyCount[s.difficulty] = (difficultyCount[s.difficulty] || 0) + 1;
      });

      const easyPercentage = (difficultyCount.easy || 0) / sessions.length * 100;
      const mediumPercentage = (difficultyCount.medium || 0) / sessions.length * 100;
      const hardPercentage = (difficultyCount.hard || 0) / sessions.length * 100;

      if (easyPercentage >= 20 && easyPercentage <= 40 && 
          mediumPercentage >= 40 && mediumPercentage <= 60 && 
          hardPercentage >= 10 && hardPercentage <= 30) {
        score += 15; // Optimal zorluk dağılımı
      } else {
        score += 5; // Dengesiz zorluk
      }
    }

    return Math.min(score, 100); // Maksimum 100 puan
  }

  /**
   * Zayıf alanları tespit et
   */
  private async identifyWeakAreas(userId: string): Promise<string[]> {
    try {
      const examResults = await this.prisma.examResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      const subjectScores: Record<string, number[]> = {};
      examResults.forEach(exam => {
        if (!subjectScores[exam.subject]) {
          subjectScores[exam.subject] = [];
        }
        subjectScores[exam.subject].push(exam.score);
      });

      const weakAreas: string[] = [];
      Object.entries(subjectScores).forEach(([subject, scores]) => {
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        if (average < 70) {
          weakAreas.push(subject);
        }
      });

      return weakAreas;
    } catch (error) {
      this.logger.warn(`Failed to identify weak areas: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Plan optimizasyon önerileri
   */
  generateOptimizationSuggestions(plan: PlanStructure, sessions: SessionStructure[]): string[] {
    const suggestions: string[] = [];

    // Süre analizi
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const planDuration = plan.duration || 7;
    const dailyAverage = totalDuration / (planDuration * 7);

    if (dailyAverage > 300) {
      suggestions.push('Günlük çalışma süresi çok fazla, seanslar azaltılabilir');
    }

    if (dailyAverage < 60) {
      suggestions.push('Günlük çalışma süresi az, daha fazla seans eklenebilir');
    }

    // Ders dengesi
    const subjectCount: Record<string, number> = {};
    sessions.forEach(s => {
      subjectCount[s.subject] = (subjectCount[s.subject] || 0) + 1;
    });

    const subjects = Object.keys(subjectCount);
    if (subjects.length > 0) {
      const maxCount = Math.max(...Object.values(subjectCount));
      const minCount = Math.min(...Object.values(subjectCount));
      
      if (maxCount / minCount > 3) {
        suggestions.push('Dersler arasında dengesizlik var, daha eşit dağıtılabilir');
      }
    }

    // Zorluk dengesi
    const difficultyCount: Record<string, number> = {};
    sessions.forEach(s => {
      difficultyCount[s.difficulty] = (difficultyCount[s.difficulty] || 0) + 1;
    });

    const totalSessions = sessions.length;
    const easyPercentage = (difficultyCount.easy || 0) / totalSessions * 100;
    const hardPercentage = (difficultyCount.hard || 0) / totalSessions * 100;

    if (easyPercentage > 60) {
      suggestions.push('Plan çok kolay, zorluk seviyesi artırılabilir');
    }

    if (hardPercentage > 40) {
      suggestions.push('Plan çok zor, zorluk seviyesi azaltılabilir');
    }

    return suggestions;
  }
}
