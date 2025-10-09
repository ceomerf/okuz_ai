import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AIService } from '../../ai/ai.service';
import { TopicManagementService } from './topic-management.service';
import { CurriculumEngineService } from './curriculum-engine.service';
import { PerformanceAnalyzerService } from './performance-analyzer.service';
import { TopicPrioritizerService } from './topic-prioritizer.service';
import { CacheService } from '../../common/cache/cache.service';

export interface PlanGenerationData {
  subjects: string[];
  goals: string[];
  availableTime: number;
  learningStyle?: string;
  currentLevel?: string;
  preferences?: {
    studyTimes?: string[];
    difficulty?: string;
  };
  userId: string;
  planDurationDays?: number;
  planType?: string;
  targetExam?: string;
}

export interface PlanResult {
  plan: {
    title: string;
    description: string;
    subjects: string[];
    goals: string[];
    weeks?: any[];
    totalSessions?: number;
    duration?: number;
  };
  sessions: Array<{
    subject: string;
    topic: string;
    duration: number;
    difficulty: string;
    type: string;
    startTime: Date;
    objectives?: string[];
    resources?: string[];
    techniques?: string[];
  }>;
}

@Injectable()
export class PlanGenerationService {
  private readonly logger = new Logger(PlanGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly topicManagement: TopicManagementService,
    private readonly curriculumEngine: CurriculumEngineService,
    private readonly performanceAnalyzer: PerformanceAnalyzerService,
    private readonly topicPrioritizer: TopicPrioritizerService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Ana plan üretimi - AI destekli
   */
  async generatePlan(data: PlanGenerationData): Promise<PlanResult> {
    try {
      this.logger.log(`Generating plan for user: ${data.userId}`);

      // 1. Kullanıcı bağlamını analiz et
      const userContext = await this.analyzeUserContext(data.userId);
      
      // 2. Müfredat ve performans analizi
      const profile = await (this.prisma as any).user.findUnique({ 
        where: { id: data.userId }, 
        include: { studentProfile: true } 
      });
      const grade = profile?.studentProfile?.grade || 11;
      const examFocus = data.targetExam === 'AYT' ? 'AYT' : (data.targetExam === 'TYT' ? 'TYT' : 'GENEL');
      
      // 3. Konu sıralaması oluştur
      const baseOrder = await this.curriculumEngine.buildPrerequisiteAwareTopicOrder(
        data.subjects, 
        grade
      );
      const perf = await this.performanceAnalyzer.analyzeUserPerformance(data.userId);
      // topicPrioritizer.prioritizeTopics imzası farklı; baseOrder'u doğrudan kullan
      const prioritized: any[] = baseOrder as any[];

      // 4. AI ile plan üret (yeni merkezi AI servisi kullanarak)
      const planResult = await this.generatePlanWithAI(data, userContext, prioritized);
      
      if (!planResult) {
        // Fallback plan
        return this.generateFallbackPlan(data);
      }

      return planResult;
    } catch (error) {
      this.logger.error(`Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException(`Plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AI destekli plan üretimi (yeni merkezi AI servisi ile)
   */
  async generatePlanWithAI(
    data: PlanGenerationData, 
    userContext: any, 
    topicOrder: string[]
  ): Promise<PlanResult | null> {
    try {
      // Yeni merkezi AI servisi kullanarak plan üret
      const aiResponse = await this.aiService.generateWithPrompt(
        'plan_generation_advanced',
        {
          studentName: data.userId,
          grade: userContext.grade || 11,
          learningStyle: data.learningStyle || 'Karma',
          currentLevel: data.currentLevel || 'Orta',
          goals: data.goals,
          availableTime: data.availableTime,
          subjects: data.subjects,
          targetExam: data.targetExam,
          planDurationDays: data.planDurationDays,
          weakAreas: userContext.weakAreas,
          strongAreas: userContext.strongAreas,
          topicSuccessRates: userContext.topicSuccessRates,
          subjectPerformance: userContext.subjectPerformance,
          preferredStudyHours: userContext.preferredStudyHours,
          subjectTimeAllocation: userContext.subjectTimeAllocation,
          topicOrder: topicOrder,
          prerequisites: userContext.prerequisites,
          examFocus: data.targetExam,
        },
        {
          cache: true,
          cacheTTL: 3600, // 1 saat
          retries: 3,
        }
      );
      
      const parsed = JSON.parse(this.cleanAiJsonResponse(aiResponse.content));
      return {
        plan: parsed.plan || { 
          title: 'AI Generated Plan', 
          description: 'AI tarafından oluşturulmuş plan' 
        },
        sessions: parsed.sessions || [],
      };
    } catch (error) {
      this.logger.warn(`AI plan generation failed, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Usta Koç prompt üretimi
   */
  async generateUstaKocPrompt(
    data: PlanGenerationData, 
    userContext: any, 
    topicOrder: string[]
  ): Promise<string> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: data.userId },
      include: { studentProfile: true },
    });

    if (!user?.studentProfile) {
      throw new BadRequestException('Student profile not found');
    }

    return `
    Öğrenci Profili:
    - Ad: ${user.name}
    - Sınıf: ${user.studentProfile.grade}
    - Öğrenme Stili: ${user.studentProfile.learningStyle || 'Karma'}
    - Hedefler: ${data.goals?.join(', ') || 'Genel'}
    - Dersler: ${data.subjects?.join(', ') || 'Genel'}
    - Mevcut Seviye: ${user.studentProfile.grade || 'Orta'}
    - Hedef Sınav: ${data.targetExam || 'GENEL'}
    - Plan Süresi: ${data.planDurationDays || 7} gün
    
    Kullanıcı Bağlamı:
    - Zayıf Alanlar: ${userContext.weakAreas?.join(', ') || 'Belirlenemedi'}
    - Güçlü Alanlar: ${userContext.strongAreas?.join(', ') || 'Belirlenemedi'}
    - Konu Başarı Oranları: ${JSON.stringify(userContext.topicSuccessRates)}
    - Ders Performansı: ${JSON.stringify(userContext.subjectPerformance)}
    
    Konu Sıralaması: ${topicOrder.join(' → ')}
    
    Bu bilgilere göre kişiselleştirilmiş çalışma planı oluştur.
    Plan JSON formatında döndürülmeli ve şu yapıda olmalı:
    {
      "plan": {
        "title": "Plan Başlığı",
        "description": "Plan açıklaması",
        "subjects": ["Ders1", "Ders2"],
        "goals": ["Hedef1", "Hedef2"],
        "weeks": [...],
        "totalSessions": 20,
        "duration": 7
      },
      "sessions": [
        {
          "subject": "Matematik",
          "topic": "Fonksiyonlar",
          "duration": 60,
          "difficulty": "medium",
          "type": "study",
          "startTime": "2024-01-01T09:00:00Z",
          "objectives": ["Hedef1", "Hedef2"],
          "resources": ["Kaynak1", "Kaynak2"],
          "techniques": ["Teknik1", "Teknik2"]
        }
      ]
    }
    `;
  }

  /**
   * Fallback plan üretimi
   */
  private generateFallbackPlan(data: PlanGenerationData): PlanResult {
    const weeks = data.planDurationDays || 7;
    const sessionsPerWeek = Math.ceil(data.availableTime / weeks / 60); // dakika cinsinden

    const sessions = [];
    for (let week = 1; week <= weeks; week++) {
      for (let session = 1; session <= sessionsPerWeek; session++) {
        const subject = data.subjects[session % data.subjects.length];
        sessions.push({
          subject,
          topic: `${subject} Konu ${session}`,
          duration: 60,
          difficulty: 'medium',
          type: 'study',
          startTime: new Date(Date.now() + (week - 1) * 7 * 24 * 60 * 60 * 1000 + session * 24 * 60 * 60 * 1000),
          objectives: [`${subject} konusunu öğren`],
          resources: ['Ders kitabı', 'Notlar'],
          techniques: ['Okuma', 'Pratik'],
        });
      }
    }

    return {
      plan: {
        title: `${data.subjects.join(', ')} Çalışma Planı`,
        description: 'Temel çalışma planı',
        subjects: data.subjects,
        goals: data.goals,
        totalSessions: sessions.length,
        duration: weeks,
      },
      sessions,
    };
  }

  /**
   * Kullanıcı bağlamını analiz et
   */
  private async analyzeUserContext(userId: string): Promise<any> {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        studySessions: {
          where: { isCompleted: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user?.studentProfile) {
      return {
        weakAreas: [],
        strongAreas: [],
        topicSuccessRates: {},
        subjectPerformance: {},
        preferredStudyHours: [],
        subjectTimeAllocation: {},
      };
    }

    // Zayıf alanları tespit et
    const weakAreas = await this.identifyWeakAreas(userId);
    
    // Güçlü alanları tespit et
    const strongAreas = await this.identifyStrongAreas(userId);
    
    // Konu başarı oranları
    const topicSuccessRates = this.calculateTopicSuccessRates(user.studySessions);
    
    // Ders performansı
    const subjectPerformance = this.calculateSubjectPerformance(user.studySessions);
    
    // Tercih edilen çalışma saatleri
    const preferredStudyHours = this.calculatePreferredStudyHours(user.studySessions);
    
    // Ders zaman dağılımı
    const subjectTimeAllocation = this.calculateSubjectTimeAllocation(user.studySessions);

    return {
      weakAreas,
      strongAreas,
      topicSuccessRates,
      subjectPerformance,
      preferredStudyHours,
      subjectTimeAllocation,
    };
  }

  /**
   * Zayıf alanları tespit et
   */
  private async identifyWeakAreas(userId: string): Promise<string[]> {
    const examResults = await (this.prisma as any).examResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const subjectScores: Record<string, number[]> = {};
    examResults.forEach((exam: any) => {
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
  }

  /**
   * Güçlü alanları tespit et
   */
  private async identifyStrongAreas(userId: string): Promise<string[]> {
    const examResults = await (this.prisma as any).examResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const subjectScores: Record<string, number[]> = {};
    examResults.forEach((exam: any) => {
      if (!subjectScores[exam.subject]) {
        subjectScores[exam.subject] = [];
      }
      subjectScores[exam.subject].push(exam.score);
    });

    const strongAreas: string[] = [];
    Object.entries(subjectScores).forEach(([subject, scores]) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (average >= 85) {
        strongAreas.push(subject);
      }
    });

    return strongAreas;
  }

  /**
   * Konu başarı oranlarını hesapla
   */
  private calculateTopicSuccessRates(sessions: any[]): Record<string, number> {
    const rates: Record<string, { total: number; success: number }> = {};
    
    sessions.forEach(session => {
      if (session.performance !== null && session.performance !== undefined) {
        if (!rates[session.topic]) {
          rates[session.topic] = { total: 0, success: 0 };
        }
        rates[session.topic].total++;
        if (session.performance >= 70) {
          rates[session.topic].success++;
        }
      }
    });

    const result: Record<string, number> = {};
    Object.keys(rates).forEach(topic => {
      result[topic] = rates[topic].total > 0 ? (rates[topic].success / rates[topic].total) * 100 : 0;
    });

    return result;
  }

  /**
   * Ders performansını hesapla
   */
  private calculateSubjectPerformance(sessions: any[]): Record<string, number> {
    const performance: Record<string, { total: number; sum: number }> = {};
    
    sessions.forEach(session => {
      if (session.performance !== null && session.performance !== undefined) {
        if (!performance[session.subject]) {
          performance[session.subject] = { total: 0, sum: 0 };
        }
        performance[session.subject].total++;
        performance[session.subject].sum += session.performance;
      }
    });

    const result: Record<string, number> = {};
    Object.keys(performance).forEach(subject => {
      result[subject] = performance[subject].total > 0 ? 
        performance[subject].sum / performance[subject].total : 0;
    });

    return result;
  }

  /**
   * Tercih edilen çalışma saatlerini hesapla
   */
  private calculatePreferredStudyHours(sessions: any[]): string[] {
    const hourCounts: Record<number, number> = {};
    
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }

  /**
   * Ders zaman dağılımını hesapla
   */
  private calculateSubjectTimeAllocation(sessions: any[]): Record<string, number> {
    const allocation: Record<string, number> = {};
    
    sessions.forEach(session => {
      allocation[session.subject] = (allocation[session.subject] || 0) + session.duration;
    });

    return allocation;
  }

  /**
   * AI JSON response temizleme
   */
  private cleanAiJsonResponse(text: string): string {
    if (!text) return text;
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    if (cleaned.includes('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }
}
