import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GeminiService } from '../services/gemini.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { GeneratePlanDto } from './dto/generate-plan.dto';

interface PlanGenerationData {
  subjects: string[];
  goals: string[];
  availableTime: number; // dakika/gün
  learningStyle: string;
  currentLevel: string;
  userId?: string;
  preferences?: {
    studyTimes: string[]; // ["morning", "afternoon", "evening"]
    sessionDuration: number; // tercih edilen çalışma süresi
    breakDuration: number; // mola süresi
    difficulty: string; // "easy", "medium", "hard"
    focusAreas: string[]; // öncelikli konular
  };
}

interface StudySession {
  id: string;
  subject: string;
  topic: string;
  startTime: Date;
  duration: number;
  difficulty: string;
  type: string; // "study", "review", "practice", "exam"
  resources: string[];
  objectives: string[];
  prerequisites: string[];
}

interface WeeklyPlan {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  totalStudyTime: number;
  sessions: StudySession[];
  milestones: string[];
  assessments: any[];
}

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private getLearningStyleDisplayName(style: string): string {
    const s = (style || '').trim();
    switch (s.toLowerCase()) {
      case 'visual':
        return 'Görsel';
      case 'auditory':
        return 'İşitsel';
      case 'kinesthetic':
        return 'Kinestetik';
      case 'reading':
        return 'Okuma/Not Alma';
      default:
        return s || 'Kişisel';
    }
  }

  async generatePlan(data: PlanGenerationData | (GeneratePlanDto & { userId: string })): Promise<any> {
    const normalized: PlanGenerationData = (data as any).availableTime != null
      ? (data as PlanGenerationData)
      : {
          subjects: (data as any).subjects,
          goals: (data as any).goals ?? [],
          availableTime: 120,
          learningStyle: (data as any).learningStyle,
          currentLevel: (data as any).currentLevel,
          userId: (data as any).userId,
          preferences: (data as any).preferences,
        };

    if (!normalized.userId) {
      throw new BadRequestException('Kullanıcı kimliği gerekli');
    }
    const userId = normalized.userId;

    // Kullanıcının mevcut verilerini analiz et
    const userContext = await this.analyzeUserContext(userId);
    
    // AI ile detaylı plan oluştur
    const aiPlanPrompt = this.createPlanPrompt(normalized, userContext);
    const aiResponse = await this.geminiService.generateContent(aiPlanPrompt);
    
    let planStructure;
    try {
      planStructure = JSON.parse(aiResponse);
    } catch (error) {
      throw new BadRequestException('AI plan çıktısı geçersiz formatta.');
    }

    // Şema doğrulaması (schema guard). Geçersizse hata döndür.
    if (!this.isValidPlanStructure(planStructure)) {
      throw new BadRequestException('AI plan yapısı doğrulamadan geçmedi.');
    }

    // Plan optimizasyonu
    const optimizedPlan = await this.optimizePlan(planStructure, normalized, userContext);
    
    // Veritabanına kaydet
    const savedPlan = await this.prisma.plan.create({
      data: {
        userId,
        title: `${this.getLearningStyleDisplayName(normalized.learningStyle)} Öğrenme Planı`,
        description: `${normalized.subjects.join(', ')} dersleri için kişiselleştirilmiş plan`,
        type: 'MONTHLY',
        subjects: normalized.subjects,
        goals: normalized.goals,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün
        metadata: {
          learningStyle: normalized.learningStyle,
          availableTime: normalized.availableTime,
          preferences: normalized.preferences,
          aiGenerated: true,
          planStructure: optimizedPlan,
        },
      },
    });

    // Çalışma seanslarını oluştur
    await this.createStudySessions(savedPlan.id, optimizedPlan.sessions, userId);

    return {
      success: true,
      plan: {
        id: savedPlan.id,
        title: savedPlan.title,
        description: savedPlan.description,
        structure: optimizedPlan,
        timeline: this.generateTimeline(optimizedPlan),
        recommendations: await this.generateRecommendations(normalized, userContext),
      },
      message: 'Kişiselleştirilmiş planınız başarıyla oluşturuldu!',
    };
  }

  // AI'dan gelen plan yapısına basit şema doğrulaması
  private isValidPlanStructure(plan: any): boolean {
    if (!plan) return false;
    const sessions = plan.sessions || plan.weeklyPlans?.flatMap((w: any) => w.sessions || []) || [];
    if (!Array.isArray(sessions) || sessions.length === 0) return false;
    // ilk birkaç öğeyi kontrol ederek temel alanların varlığını doğrula
    const sample = sessions.slice(0, Math.min(3, sessions.length));
    return sample.every((s: any) =>
      s && typeof s.subject === 'string' && typeof s.topic === 'string' &&
      (typeof s.duration === 'number' || typeof s.durationInMinutes === 'number')
    );
  }

  // Frontend’in beklediği: görev ilerlemesi güncelle
  async updateTaskProgress(data: { taskId: string; minutes: number }) {
    if (!data.taskId || typeof data.minutes !== 'number') {
      throw new BadRequestException('Geçersiz parametreler');
    }
    const session = await this.prisma.studySession.findUnique({ where: { id: data.taskId } });
    if (!session) throw new NotFoundException('Session not found');
    const updated = await this.prisma.studySession.update({
      where: { id: data.taskId },
      data: {
        duration: Math.max(0, (session.duration || 0) + data.minutes),
        metadata: {
          ...(session.metadata as any || {}),
          progressUpdatedAt: new Date(),
          lastProgressDeltaMin: data.minutes,
        },
      },
    });
    this.realtime.publishProgressUpdated(updated.userId, {
      sessionId: updated.id,
      minutesDelta: data.minutes,
      duration: updated.duration,
    });
    return { success: true, session: updated };
  }

  // Onboarding verileriyle plan oluştur
  async createPlanFromOnboarding(userId: string, data: any) {
    if (!userId) throw new BadRequestException('Kullanıcı kimliği gerekli');
    // Basit bir varsayılanla ilerle: kullanıcı profilinden bazı alanları almayı deneyebiliriz
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });
    const subjects = data?.subjects || ['Matematik', 'Türkçe'];
    const goals = data?.goals || ['Temel hedefler'];
    const availableTime = data?.availableTime || 120;
    const learningStyle = profile?.studentProfile?.learningStyle || 'visual';
    const currentLevel = 'medium';
    return this.generatePlan({ subjects, goals, availableTime, learningStyle, currentLevel, userId });
  }

  // Premium plan oluştur (7/30 günlük)
  async createPremiumPlan(userId: string, data: any) {
    if (!userId) throw new BadRequestException('Kullanıcı kimliği gerekli');
    const durationDays = data?.durationDays === 30 ? 30 : 7;
    const subjects = data?.subjects || ['Matematik', 'Türkçe'];
    const goals = data?.goals || ['Premium hedefler'];
    const availableTime = data?.availableTime || 180;
    const learningStyle = data?.learningStyle || 'visual';
    const currentLevel = data?.currentLevel || 'medium';
    const result = await this.generatePlan({ subjects, goals, availableTime, learningStyle, currentLevel, userId });
    // Planın endDate’ini premium kuralına göre güncelle
    if (result?.plan?.id) {
      const updated = await this.prisma.plan.update({
        where: { id: result.plan.id },
        data: { endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) },
      });
      return { ...result, plan: { ...result.plan, endDate: updated.endDate } };
    }
    return result;
  }

  // Tatil planını AI’den oluşturup kalıcılaştır
  async generateAndPersistHolidayPlan(userId: string, data: any) {
    if (!userId) throw new BadRequestException('Kullanıcı kimliği gerekli');
    const holiday = await this.generateHolidayPlan({
      holidayType: data?.holidayType || 'balanced',
      duration: data?.duration || 7,
      goals: data?.goals || ['Verimli tatil'],
    });
    // Planı kalıcılaştır
    const savedPlan = await this.prisma.plan.create({
      data: {
        userId,
        title: (holiday.plan?.title) || 'Tatil Çalışma Planı',
        description: 'Tatil dönemine özel çalışma planı',
        type: 'HOLIDAY',
        subjects: [],
        goals: holiday.plan?.goals || [],
        startDate: new Date(),
        endDate: new Date(Date.now() + ((holiday.plan?.duration || data?.duration || 7) * 24 * 60 * 60 * 1000)),
        metadata: { aiGenerated: true, holidayPlan: holiday.plan },
      },
    });
    // StudySession üretimi: varsa günlük schedule’dan basit seanslar çıkar
    const sessions: Array<{ day: number; time?: string; subject?: string; topic?: string; duration?: number }>
      = holiday.plan?.dailySchedule || [];
    const toMinutes = (timeRange?: string) => {
      if (!timeRange) return 60;
      const [start, end] = timeRange.split('-');
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
    };
    const createDateForDay = (day: number, time?: string) => {
      const d = new Date();
      d.setDate(d.getDate() + (day - 1));
      if (time) {
        const [h, m] = time.split(':').map(Number);
        d.setHours(h, m, 0, 0);
      }
      return d;
    };
    const sessionCreates = sessions.flatMap((ds: any) =>
      (ds.sessions || []).map((s: any) => this.prisma.studySession.create({
        data: {
          planId: savedPlan.id,
          userId,
          subject: s.subject || 'Genel',
          topic: s.topic || 'Çalışma',
          duration: toMinutes(s.time),
          startTime: createDateForDay(ds.day, (s.time || '09:00').split('-')[0]),
          metadata: { type: s.type || 'study', difficulty: s.difficulty || 'medium' },
        },
      }))
    );
    await Promise.all(sessionCreates);
    return { success: true, plan: savedPlan };
  }

  // Tatil planı durumu kontrolü
  async checkHolidayStatus(userId: string) {
    const active = await this.prisma.plan.findFirst({
      where: { userId, type: 'HOLIDAY', isActive: true, endDate: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return { hasHolidayPlan: !!active, planId: active?.id };
  }

  // YKS özel uçlar (basit ilk sürüm)
  async assignYksSubjects(userId: string, data: { subjects: string[] }) {
    if (!userId) throw new BadRequestException('Kullanıcı kimliği gerekli');
    await this.prisma.user.update({
      where: { id: userId },
      data: { metadata: { assignedYksSubjects: data.subjects } } as any,
    });
    return { success: true };
  }

  async generateYksPlan(userId: string, data: any) {
    if (!userId) throw new BadRequestException('Kullanıcı kimliği gerekli');
    const subjects = data?.subjects || ['TYT Matematik', 'TYT Türkçe'];
    const goals = data?.goals || ['YKS hedefleri'];
    const availableTime = data?.availableTime || 180;
    const learningStyle = data?.learningStyle || 'visual';
    const currentLevel = data?.currentLevel || 'medium';
    return this.generatePlan({ subjects, goals, availableTime, learningStyle, currentLevel, userId });
  }

  async getYksSubjectRecommendations(track?: string) {
    const recs = {
      sayisal: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
      esitsay: ['Matematik', 'Türkçe', 'Tarih', 'Coğrafya'],
      sozel: ['Türk Dili ve Edebiyatı', 'Tarih', 'Coğrafya', 'Felsefe'],
    } as any;
    return { subjects: recs[track || 'sayisal'] || recs.sayisal };
  }

  async getMebTopics(subject?: string, grade?: string) {
    // Şimdilik basit statik dönüş; ileride veri kaynağına bağlanabilir
    return {
      subject: subject || 'Matematik',
      grade: grade || '11',
      topics: [
        { unit: 'Fonksiyonlar', outcomes: ['Fonksiyon kavramı', 'Grafikler'] },
        { unit: 'Limit ve Süreklilik', outcomes: ['Limit tanımı', 'Süreklilik'] },
      ],
    };
  }

  private async analyzeUserContext(userId: string) {
    // Kullanıcının geçmiş performansını analiz et (paralel sorgular)
    const [studySessions, quizResults, examResults] = await Promise.all([
      this.prisma.studySession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.quiz.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.examResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Performans analizi
    const subjectPerformance = this.analyzeSubjectPerformance(studySessions, quizResults, examResults);
    const timePatterns = this.analyzeStudyTimePatterns(studySessions);
    const learningVelocity = this.calculateLearningVelocity(studySessions);
    const [weakAreas, strongAreas] = await Promise.all([
      this.identifyWeakAreas(userId),
      this.identifyStrongAreas(userId),
    ]);

    return {
      subjectPerformance,
      timePatterns,
      learningVelocity,
      weakAreas,
      strongAreas,
      totalStudyTime: studySessions.reduce((sum, s) => sum + s.duration, 0),
      averageSessionDuration: studySessions.length > 0 ? 
        studySessions.reduce((sum, s) => sum + s.duration, 0) / studySessions.length : 45,
      preferredStudyHours: this.getPreferredStudyHours(studySessions),
    };
  }

  private createPlanPrompt(data: PlanGenerationData, userContext: any): string {
    return `
Sen bir uzman eğitim danışmanısın. Aşağıdaki bilgilere göre 30 günlük detaylı bir çalışma planı oluştur:

ÖĞRENCİ BİLGİLERİ:
- Dersler: ${data.subjects.join(', ')}
- Hedefler: ${data.goals.join(', ')}
- Günlük çalışma süresi: ${data.availableTime} dakika
- Öğrenme stili: ${data.learningStyle}
- Seviye: ${data.currentLevel}

GEÇMİŞ PERFORMANS:
- Toplam çalışma süresi: ${userContext.totalStudyTime} dakika
- Ortalama seans süresi: ${userContext.averageSessionDuration} dakika
- Güçlü alanlar: ${userContext.strongAreas.join(', ')}
- Zayıf alanlar: ${userContext.weakAreas.join(', ')}
- Tercih edilen çalışma saatleri: ${userContext.preferredStudyHours.join(', ')}

PLAN YAPISI (JSON formatında):
{
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "Temel kavramlar",
      "sessions": [
        {
          "day": "Pazartesi",
          "subject": "Matematik",
          "topic": "Limit kavramı",
          "duration": 60,
          "type": "study",
          "difficulty": "medium",
          "objectives": ["Limit tanımını öğren", "Grafik analizi yap"],
          "resources": ["Ders kitabı sayfa 45-60", "Video: Limit giriş"],
          "techniques": ["Görsel öğrenme", "Pratik sorular"]
        }
      ]
    }
  ],
  "milestones": [
    {
      "week": 1,
      "goal": "Temel kavramları kavra",
      "assessment": "Quiz",
      "criteria": "70% başarı"
    }
  ],
  "adaptiveStrategies": [
    "Zorlandığında sessionsür süresini azalt",
    "Başarılı olduğunda zorluk seviyesini artır"
  ]
}

KURALLAR:
1. ${data.learningStyle} öğrenme stiline uygun teknikler kullan
2. Zayıf alanlara daha fazla zaman ayır
3. Güçlü alanları pekiştirici aktiviteler ekle
4. Her hafta değerlendirme ve uyarlama noktaları ekle
5. Motivasyon için kısa vadeli hedefler belirle
6. Mola ve dinlenme periyotlarını dahil et
7. Çeşitli öğrenme materyalleri öner
`;
  }

  // Mock/varsayılan plan üretimi kaldırıldı; sadece AI tabanlı plan desteklenir.

  private allocateTimeToSubjects(subjects: string[], totalTime: number): Record<string, number> {
    const allocation = {};
    const timePerSubject = Math.floor(totalTime / subjects.length);
    
    subjects.forEach(subject => {
      allocation[subject] = timePerSubject;
    });
    
    return allocation;
  }

  private getTechniquesForLearningStyle(learningStyle: string): string[] {
    const techniques = {
      'visual': ['Diyagram çizme', 'Renk kodlama', 'Görsel materyaller'],
      'auditory': ['Sesli tekrar', 'Grup tartışması', 'Açıklama yapma'],
      'kinesthetic': ['Pratik yapma', 'Deney', 'Hareket halinde öğrenme'],
      'reading': ['Not alma', 'Özet çıkarma', 'Kitap okuma'],
    };
    
    return techniques[learningStyle] || techniques['visual'];
  }

  private groupSessionsByWeek(sessions: any[]): any[] {
    const weeks = [];
    for (let week = 1; week <= 4; week++) {
      const weekSessions = sessions.filter(s => s.week === week);
      weeks.push({
        week,
        focus: `Hafta ${week} - ${week <= 2 ? 'Öğrenme' : 'Pekiştirme'}`,
        sessions: weekSessions,
      });
    }
    return weeks;
  }

  private generateMilestones(subjects: string[], goals: string[]): any[] {
    return subjects.map((subject, index) => ({
      week: index + 1,
      goal: `${subject} temel kavramlarını tamamla`,
      assessment: 'Quiz',
      criteria: '70% başarı',
    }));
  }

  private generateAdaptiveStrategies(learningStyle: string): string[] {
    return [
      'Zorlandığında konuyu böl ve küçük parçalarda çalış',
      'Başarılı olduğunda zorluk seviyesini artır',
      'Motivasyon düştüğünde kısa molalar ver',
      `${learningStyle} öğrenme stiline uygun materyaller kullan`,
    ];
  }

  private async optimizePlan(planStructure: any, data: PlanGenerationData, userContext: any) {
    // Plan optimizasyonu algoritması
    
    // 1. Zaman dağılımını optimize et
    const optimizedTimeAllocation = this.optimizeTimeAllocation(
      planStructure,
      userContext.subjectPerformance,
      data.availableTime
    );

    // 2. Zorluk progresyonunu ayarla
    const optimizedDifficulty = this.optimizeDifficultyProgression(
      planStructure,
      userContext.learningVelocity
    );

    // 3. Çalışma saatlerini kişiselleştir
    const optimizedSchedule = this.optimizeSchedule(
      planStructure,
      userContext.preferredStudyHours,
      data.preferences?.studyTimes
    );

    return {
      ...planStructure,
      timeAllocation: optimizedTimeAllocation,
      difficultyProgression: optimizedDifficulty,
      schedule: optimizedSchedule,
      optimizationNotes: [
        'Zayıf alanlara %25 daha fazla zaman ayrıldı',
        'Tercih edilen çalışma saatleri dikkate alındı',
        'Öğrenme hızına göre zorluk ayarlandı',
      ],
    };
  }

  private optimizeTimeAllocation(planStructure: any, subjectPerformance: any, availableTime: number) {
    // Performansa göre zaman dağılımını yeniden hesapla
    const allocation = {};
    
    Object.keys(subjectPerformance).forEach(subject => {
      const performance = subjectPerformance[subject];
      let multiplier = 1.0;
      
      if (performance < 60) multiplier = 1.5; // Zayıf alanlara daha fazla zaman
      else if (performance > 85) multiplier = 0.8; // Güçlü alanlara daha az zaman
      
      allocation[subject] = Math.floor(availableTime * multiplier / Object.keys(subjectPerformance).length);
    });
    
    return allocation;
  }

  private optimizeDifficultyProgression(planStructure: any, learningVelocity: number) {
    // Öğrenme hızına göre zorluk progresyonunu ayarla
    const progression = [];
    
    for (let week = 1; week <= 4; week++) {
      let difficulty = 'easy';
      
      if (learningVelocity > 0.8) {
        // Hızlı öğrenen
        difficulty = week <= 1 ? 'medium' : week <= 2 ? 'hard' : 'expert';
      } else if (learningVelocity > 0.5) {
        // Orta hızda öğrenen
        difficulty = week <= 2 ? 'easy' : week <= 3 ? 'medium' : 'hard';
      } else {
        // Yavaş öğrenen
        difficulty = week <= 3 ? 'easy' : 'medium';
      }
      
      progression.push({ week, difficulty });
    }
    
    return progression;
  }

  private optimizeSchedule(planStructure: any, preferredHours: string[], userPreferences: string[]) {
    // Çalışma programını optimize et
    const optimalTimes = [...preferredHours];
    
    if (userPreferences) {
      optimalTimes.push(...userPreferences);
    }
    
    return {
      preferredTimes: [...new Set(optimalTimes)],
      avoidTimes: ['late_night'], // Geç saatlerden kaçın
      flexibilityLevel: 'medium',
    };
  }

  private analyzeSubjectPerformance(studySessions: any[], quizResults: any[], examResults: any[]) {
    const performance = {};
    
    // Quiz sonuçlarından performans hesapla
    quizResults.forEach(quiz => {
      if (!performance[quiz.topic]) {
        performance[quiz.topic] = [];
      }
      performance[quiz.topic].push((quiz.score / quiz.totalScore) * 100);
    });
    
    // Sınav sonuçlarından performans hesapla
    examResults.forEach(exam => {
      if (!performance[exam.subject]) {
        performance[exam.subject] = [];
      }
      performance[exam.subject].push((exam.score / exam.totalScore) * 100);
    });
    
    // Ortalama performansı hesapla
    Object.keys(performance).forEach(subject => {
      const scores = performance[subject];
      performance[subject] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });
    
    return performance;
  }

  private analyzeStudyTimePatterns(studySessions: any[]) {
    const patterns = {};
    
    studySessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      const timeSlot = this.getTimeSlot(hour);
      
      if (!patterns[timeSlot]) {
        patterns[timeSlot] = { count: 0, totalDuration: 0, performance: [] };
      }
      
      patterns[timeSlot].count++;
      patterns[timeSlot].totalDuration += session.duration;
      if (session.performance) {
        patterns[timeSlot].performance.push(session.performance);
      }
    });
    
    return patterns;
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private calculateLearningVelocity(studySessions: any[]): number {
    if (studySessions.length < 5) return 0.5; // Varsayılan
    
    // Son 10 seansın performans trendini analiz et
    const recentSessions = studySessions.slice(0, 10);
    let improvementCount = 0;
    
    for (let i = 1; i < recentSessions.length; i++) {
      if (recentSessions[i].performance > recentSessions[i-1].performance) {
        improvementCount++;
      }
    }
    
    return improvementCount / (recentSessions.length - 1);
  }

  private async identifyWeakAreas(userId: string): Promise<string[]> {
    const examResults = await this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const subjectScores = {};
    examResults.forEach(exam => {
      if (!subjectScores[exam.subject]) {
        subjectScores[exam.subject] = [];
      }
      subjectScores[exam.subject].push((exam.score / exam.totalScore) * 100);
    });

    const weakAreas = [];
    Object.keys(subjectScores).forEach(subject => {
      const avgScore = subjectScores[subject].reduce((sum, score) => sum + score, 0) / subjectScores[subject].length;
      if (avgScore < 70) {
        weakAreas.push(subject);
      }
    });

    return weakAreas;
  }

  private async identifyStrongAreas(userId: string): Promise<string[]> {
    const examResults = await this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const subjectScores = {};
    examResults.forEach(exam => {
      if (!subjectScores[exam.subject]) {
        subjectScores[exam.subject] = [];
      }
      subjectScores[exam.subject].push((exam.score / exam.totalScore) * 100);
    });

    const strongAreas = [];
    Object.keys(subjectScores).forEach(subject => {
      const avgScore = subjectScores[subject].reduce((sum, score) => sum + score, 0) / subjectScores[subject].length;
      if (avgScore > 85) {
        strongAreas.push(subject);
      }
    });

    return strongAreas;
  }

  private getPreferredStudyHours(studySessions: any[]): string[] {
    const hourCounts = {};
    
    studySessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      const timeSlot = this.getTimeSlot(hour);
      hourCounts[timeSlot] = (hourCounts[timeSlot] || 0) + 1;
    });

    return Object.keys(hourCounts)
      .sort((a, b) => hourCounts[b] - hourCounts[a])
      .slice(0, 2); // Top 2 preferred times
  }

  private async createStudySessions(planId: string, sessions: any[], userId: string) {
    if (!Array.isArray(sessions) || sessions.length === 0) return;

    const safeGetDayOffset = (day: any): number => {
      if (typeof day !== 'string') return 0;
      const idx = this.getDayOffset(day);
      return idx >= 0 ? idx : 0;
    };

    const clamped = (value: any): number => {
      const num = typeof value === 'number' ? value : (typeof value === 'string' ? Number(value) : 0);
      return Math.max(20, Math.min(num, 180));
    };

    const tasks = sessions
      .filter((s: any) => s && typeof s.subject === 'string' && typeof s.topic === 'string')
      .map((session: any) => {
        const startDate = new Date();
        const weekOffset = typeof session.week === 'number' ? session.week : 1;
        startDate.setDate(startDate.getDate() + ((weekOffset - 1) * 7) + safeGetDayOffset(session.day));

        const durationMinutes = clamped(session.durationInMinutes ?? session.duration ?? 60);

        return this.prisma.studySession.create({
          data: {
            planId,
            userId,
            subject: session.subject,
            topic: session.topic,
            duration: durationMinutes,
            startTime: startDate,
            metadata: {
              type: typeof session.type === 'string' ? session.type : 'study',
              difficulty: typeof session.difficulty === 'string' ? session.difficulty : 'medium',
              objectives: Array.isArray(session.objectives) ? session.objectives : [],
              resources: Array.isArray(session.resources) ? session.resources : [],
              techniques: Array.isArray(session.techniques) ? session.techniques : [],
            },
          },
        });
      });

    await Promise.all(tasks);
  }

  private getDayOffset(day: string): number {
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    return days.indexOf(day);
  }

  private generateTimeline(planStructure: any) {
    return {
      totalWeeks: 4,
      totalSessions: planStructure.weeklyPlans?.reduce((sum, week) => sum + week.sessions?.length || 0, 0) || 0,
      estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      weeklyBreakdown: planStructure.weeklyPlans?.map(week => ({
        week: week.week,
        focus: week.focus,
        sessionCount: week.sessions?.length || 0,
        totalHours: week.sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) / 60 || 0,
      })) || [],
    };
  }

  private async generateRecommendations(data: PlanGenerationData, userContext: any) {
    const recommendations = [];

    // Öğrenme stili önerileri
    if (data.learningStyle === 'visual') {
      recommendations.push('Diyagram ve zihin haritaları kullanın');
      recommendations.push('Renkli notlar alın');
    } else if (data.learningStyle === 'auditory') {
      recommendations.push('Sesli tekrar yapın');
      recommendations.push('Grup çalışmaları organize edin');
    }

    // Zayıf alan önerileri
    if (userContext.weakAreas.length > 0) {
      recommendations.push(`${userContext.weakAreas.join(', ')} alanlarında ekstra çalışma yapın`);
    }

    // Zaman yönetimi önerileri
    if (userContext.averageSessionDuration < 30) {
      recommendations.push('Daha uzun çalışma seansları deneyin (45-60 dakika)');
    }

    return recommendations;
  }

  async getUserPlans(userId: string): Promise<any> {
    const plans = await this.prisma.plan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sessions: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return plans.map(plan => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      type: plan.type,
      subjects: plan.subjects,
      goals: plan.goals,
      startDate: plan.startDate,
      endDate: plan.endDate,
      isActive: plan.isActive,
      progress: this.calculatePlanProgress(plan.sessions),
      nextSession: this.getNextSession(plan.sessions),
      stats: {
        totalSessions: plan.sessions.length,
        completedSessions: plan.sessions.filter(s => s.isCompleted).length,
        totalStudyTime: plan.sessions.reduce((sum, s) => sum + s.duration, 0),
        completedStudyTime: plan.sessions.filter(s => s.isCompleted).reduce((sum, s) => sum + s.duration, 0),
      },
    }));
  }

  private calculatePlanProgress(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter(s => s.isCompleted).length;
    return Math.round((completed / sessions.length) * 100);
  }

  private getNextSession(sessions: any[]) {
    const now = new Date();
    const upcomingSessions = sessions
      .filter(s => !s.isCompleted && new Date(s.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    return upcomingSessions[0] || null;
  }

  async getPlan(userId: string, planId: string): Promise<any> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
      include: {
        sessions: {
          orderBy: { startTime: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            studentProfile: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      ...plan,
      progress: this.calculatePlanProgress(plan.sessions),
      analytics: await this.getPlanAnalytics(planId),
      recommendations: await this.getPlanRecommendations(plan),
    };
  }

  private async getPlanAnalytics(planId: string) {
    const sessions = await this.prisma.studySession.findMany({
      where: { planId },
    });

    const completed = sessions.filter(s => s.isCompleted);
    const avgPerformance = completed.length > 0 ? 
      completed.reduce((sum, s) => sum + (s.performance || 0), 0) / completed.length : 0;

    return {
      completionRate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0,
      averagePerformance: Math.round(avgPerformance),
      totalStudyTime: completed.reduce((sum, s) => sum + s.duration, 0),
      streakDays: this.calculateStreakDays(completed),
      subjectBreakdown: this.getSubjectBreakdown(sessions),
    };
  }

  private calculateStreakDays(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    const dates = [...new Set(sessions.map(s => 
      new Date(s.createdAt).toISOString().split('T')[0]
    ))].sort();

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i]);
      const previous = new Date(dates[i-1]);
      const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getSubjectBreakdown(sessions: any[]) {
    const breakdown = {};
    
    sessions.forEach(session => {
      if (!breakdown[session.subject]) {
        breakdown[session.subject] = {
          total: 0,
          completed: 0,
          totalTime: 0,
          completedTime: 0,
          avgPerformance: 0,
        };
      }
      
      breakdown[session.subject].total++;
      breakdown[session.subject].totalTime += session.duration;
      
      if (session.isCompleted) {
        breakdown[session.subject].completed++;
        breakdown[session.subject].completedTime += session.duration;
        breakdown[session.subject].avgPerformance += session.performance || 0;
      }
    });

    Object.keys(breakdown).forEach(subject => {
      const data = breakdown[subject];
      data.completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
      data.avgPerformance = data.completed > 0 ? data.avgPerformance / data.completed : 0;
    });

    return breakdown;
  }

  private async getPlanRecommendations(plan: any) {
    const recommendations = [];
    const progress = this.calculatePlanProgress(plan.sessions);

    if (progress < 30) {
      recommendations.push({
        type: 'motivation',
        title: 'Motivasyonu Artır',
        description: 'Küçük hedefler koyarak başlayın',
        priority: 'high',
      });
    }

    if (progress > 80) {
      recommendations.push({
        type: 'advancement',
        title: 'İleri Seviye',
        description: 'Daha zor konulara geçmeyi düşünün',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  async updatePlan(userId: string, planId: string, data: any): Promise<any> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        title: data.title || plan.title,
        description: data.description || plan.description,
        subjects: data.subjects || plan.subjects,
        goals: data.goals || plan.goals,
        endDate: data.endDate ? new Date(data.endDate) : plan.endDate,
        metadata: {
          ...(plan.metadata as any || {}),
          ...(data.metadata as any || {}),
          lastModified: new Date(),
        },
      },
    });

    return {
      success: true,
      plan: updatedPlan,
      message: 'Plan başarıyla güncellendi',
    };
  }

  async deletePlan(userId: string, planId: string): Promise<any> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // İlişkili seansları da sil
    await this.prisma.studySession.deleteMany({
      where: { planId },
    });

    await this.prisma.plan.delete({
      where: { id: planId },
    });

    return {
      success: true,
      message: 'Plan başarıyla silindi',
    };
  }

  async reschedule(data: { userId: string; planId: string; conflicts: any[]; preferences: any }): Promise<any> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: data.planId, userId: data.userId },
      include: { sessions: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Çakışmaları çöz
    const rescheduledSessions = await this.resolveConflicts(plan.sessions, data.conflicts, data.preferences);
    
    // Seansları güncelle
    const updatePromises = rescheduledSessions.map(session => 
      this.prisma.studySession.update({
        where: { id: session.id },
        data: {
          startTime: session.newStartTime,
          metadata: {
            ...session.metadata,
            rescheduled: true,
            rescheduleReason: session.rescheduleReason,
          },
        },
      })
    );

    await Promise.all(updatePromises);

    return {
      success: true,
      rescheduledSessions: rescheduledSessions.length,
      message: `${rescheduledSessions.length} seans yeniden planlandı`,
      newSchedule: rescheduledSessions,
    };
  }

  private async resolveConflicts(sessions: any[], conflicts: any[], preferences: any) {
    const rescheduled = [];
    
    for (const conflict of conflicts) {
      const conflictedSession = sessions.find(s => s.id === conflict.sessionId);
      if (conflictedSession) {
        const newTime = this.findAlternativeTime(conflictedSession, conflict, preferences);
        rescheduled.push({
          ...conflictedSession,
          newStartTime: newTime,
          rescheduleReason: conflict.reason,
        });
      }
    }
    
    return rescheduled;
  }

  private findAlternativeTime(session: any, conflict: any, preferences: any): Date {
    const originalTime = new Date(session.startTime);
    const alternatives = [];
    
    // 1 saat önce
    const earlier = new Date(originalTime.getTime() - 60 * 60 * 1000);
    alternatives.push(earlier);
    
    // 1 saat sonra
    const later = new Date(originalTime.getTime() + 60 * 60 * 1000);
    alternatives.push(later);
    
    // Ertesi gün aynı saatte
    const nextDay = new Date(originalTime);
    nextDay.setDate(nextDay.getDate() + 1);
    alternatives.push(nextDay);

    // Tercihlere göre en uygun zamanı seç
    return alternatives[0]; // Basit implementasyon
  }

  async getRescheduleSuggestions(data: { userId: string; planId: string; conflicts: any[]; performance: any }): Promise<any> {
    const suggestions = [];

    // AI ile yeniden planlama önerileri oluştur
    const prompt = `
    Aşağıdaki çakışma durumu için yeniden planlama önerileri ver:
    
    Çakışmalar: ${JSON.stringify(data.conflicts)}
    Performans verileri: ${JSON.stringify(data.performance)}
    
    Öneriler:
    1. Hangi seanslar ertelenebilir?
    2. Hangi seanslar daha kritik?
    3. Alternatif zaman dilimleri?
    4. Çalışma süresinde değişiklik gerekli mi?
    `;

    const aiResponse = await this.geminiService.generateContent(prompt);
    
    suggestions.push({
      type: 'ai_generated',
      title: 'AI Önerisi',
      description: aiResponse,
      priority: 'high',
    });

    // Performans bazlı öneriler
    if (data.performance.averageScore < 70) {
      suggestions.push({
        type: 'performance_based',
        title: 'Performans Odaklı',
        description: 'Zayıf konulara daha fazla zaman ayırın',
        priority: 'medium',
      });
    }

    return {
      suggestions,
      autoReschedule: suggestions.length > 0,
    };
  }

  async getWeeklyOverview(userId: string): Promise<any> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Pazartesi
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Pazar
    endOfWeek.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        startTime: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const dailyBreakdown = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      
      const daySessions = sessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        return sessionDate.toDateString() === day.toDateString();
      });

      dailyBreakdown.push({
        date: day.toISOString().split('T')[0],
        dayName: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][i],
        sessions: daySessions,
        totalTime: daySessions.reduce((sum, s) => sum + s.duration, 0),
        completedSessions: daySessions.filter(s => s.isCompleted).length,
        upcomingSessions: daySessions.filter(s => !s.isCompleted && new Date(s.startTime) > new Date()).length,
      });
    }

    return {
      weekRange: {
        start: startOfWeek,
        end: endOfWeek,
      },
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.isCompleted).length,
      totalStudyTime: sessions.reduce((sum, s) => sum + s.duration, 0),
      dailyBreakdown,
      subjects: [...new Set(sessions.map(s => s.subject))],
      productivity: this.calculateWeeklyProductivity(sessions),
    };
  }

  private calculateWeeklyProductivity(sessions: any[]): number {
    const completed = sessions.filter(s => s.isCompleted);
    if (completed.length === 0) return 0;
    
    const avgPerformance = completed.reduce((sum, s) => sum + (s.performance || 0), 0) / completed.length;
    const completionRate = (completed.length / sessions.length) * 100;
    
    return Math.round((avgPerformance + completionRate) / 2);
  }

  async getDailySchedule(userId: string, date: string): Promise<any> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.studySession.findMany({
      where: {
        userId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const timeline = [];
    for (let hour = 6; hour <= 22; hour++) {
      const hourSessions = sessions.filter(s => {
        const sessionHour = new Date(s.startTime).getHours();
        return sessionHour === hour;
      });

      timeline.push({
        hour,
        timeSlot: `${hour.toString().padStart(2, '0')}:00`,
        sessions: hourSessions,
        isAvailable: hourSessions.length === 0,
      });
    }

    return {
      date: targetDate.toISOString().split('T')[0],
      totalSessions: sessions.length,
      totalStudyTime: sessions.reduce((sum, s) => sum + s.duration, 0),
      timeline,
      suggestions: await this.getDailyScheduleSuggestions(sessions, targetDate),
    };
  }

  private async getDailyScheduleSuggestions(sessions: any[], date: Date) {
    const suggestions = [];
    
    if (sessions.length === 0) {
      suggestions.push({
        type: 'empty_day',
        message: 'Bu gün için çalışma planlanmamış. Yeni bir seans ekleyin.',
        action: 'add_session',
      });
    }

    if (sessions.length > 6) {
      suggestions.push({
        type: 'overloaded',
        message: 'Bu gün çok yoğun görünüyor. Bazı seansları başka güne ertelemeyi düşünün.',
        action: 'reschedule',
      });
    }

    return suggestions;
  }

  async completeSession(data: { userId: string; sessionId: string; performance: number; notes: string }): Promise<any> {
    const session = await this.prisma.studySession.findFirst({
      where: { id: data.sessionId, userId: data.userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updatedSession = await this.prisma.studySession.update({
      where: { id: data.sessionId },
      data: {
        isCompleted: true,
        performance: data.performance,
        notes: data.notes,
        endTime: new Date(),
      },
    });

    // Realtime event
    this.realtime.publishSessionCompleted(updatedSession.userId, {
      sessionId: updatedSession.id,
      planId: updatedSession.planId,
      performance: updatedSession.performance,
    });

    return {
      success: true,
      session: updatedSession,
      rewards: {
        xp: Math.floor(data.performance / 10) * 5, // Performansa göre XP
        message: data.performance >= 80 ? 'Harika performans!' : 'Çalışmaya devam et!',
      },
    };
  }

  async skipSession(data: { userId: string; sessionId: string; reason: string }): Promise<any> {
    const session = await this.prisma.studySession.findFirst({
      where: { id: data.sessionId, userId: data.userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Seansı atlayabilir duruma getir
    await this.prisma.studySession.update({
      where: { id: data.sessionId },
      data: {
        metadata: {
          ...(session.metadata as any || {}),
          skipped: true,
          skipReason: data.reason,
          skippedAt: new Date(),
        },
      },
    });

    // Alternatif seans öner
    const alternative = await this.suggestAlternativeSession(session, data.reason);

    return {
      success: true,
      message: 'Seans atlandı',
      alternative,
      reminder: 'Atlanan seansı en kısa sürede telafi etmeyi unutmayın!',
    };
  }

  private async suggestAlternativeSession(session: any, reason: string) {
    // Sebebe göre alternatif öner
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(new Date(session.startTime).getHours());

    return {
      suggestedTime: tomorrow,
      duration: session.duration,
      subject: session.subject,
      note: 'Atlanan seansın telafisi için önerilen zaman',
    };
  }

  async getProgressTracking(userId: string, planId: string): Promise<any> {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, userId },
      include: { sessions: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const sessions = plan.sessions;
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.isCompleted);
    
    return {
      overall: {
        completionRate: totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0,
        totalHours: sessions.reduce((sum, s) => sum + s.duration, 0) / 60,
        completedHours: completedSessions.reduce((sum, s) => sum + s.duration, 0) / 60,
        averagePerformance: completedSessions.length > 0 ? 
          completedSessions.reduce((sum, s) => sum + (s.performance || 0), 0) / completedSessions.length : 0,
      },
      weekly: await this.getWeeklyProgress(sessions),
      subjects: this.getSubjectProgress(sessions),
      trends: this.getProgressTrends(completedSessions),
      predictions: await this.generateProgressPredictions(sessions),
    };
  }

  private async getWeeklyProgress(sessions: any[]) {
    const weeks = {};
    
    sessions.forEach(session => {
      const week = this.getWeekNumber(new Date(session.startTime));
      if (!weeks[week]) {
        weeks[week] = { total: 0, completed: 0, totalTime: 0, performance: [] };
      }
      
      weeks[week].total++;
      weeks[week].totalTime += session.duration;
      
      if (session.isCompleted) {
        weeks[week].completed++;
        if (session.performance) {
          weeks[week].performance.push(session.performance);
        }
      }
    });

    return Object.keys(weeks).map(week => ({
      week: parseInt(week),
      ...weeks[week],
      completionRate: weeks[week].total > 0 ? (weeks[week].completed / weeks[week].total) * 100 : 0,
      averagePerformance: weeks[week].performance.length > 0 ? 
        weeks[week].performance.reduce((sum, p) => sum + p, 0) / weeks[week].performance.length : 0,
    }));
  }

  private getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  private getSubjectProgress(sessions: any[]) {
    const subjects = {};
    
    sessions.forEach(session => {
      if (!subjects[session.subject]) {
        subjects[session.subject] = { total: 0, completed: 0, totalTime: 0, performance: [] };
      }
      
      subjects[session.subject].total++;
      subjects[session.subject].totalTime += session.duration;
      
      if (session.isCompleted) {
        subjects[session.subject].completed++;
        if (session.performance) {
          subjects[session.subject].performance.push(session.performance);
        }
      }
    });

    return Object.keys(subjects).map(subject => ({
      subject,
      ...subjects[subject],
      completionRate: subjects[subject].total > 0 ? (subjects[subject].completed / subjects[subject].total) * 100 : 0,
      averagePerformance: subjects[subject].performance.length > 0 ? 
        subjects[subject].performance.reduce((sum, p) => sum + p, 0) / subjects[subject].performance.length : 0,
    }));
  }

  private getProgressTrends(completedSessions: any[]) {
    const sortedSessions = completedSessions.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const trends = {
      performance: [],
      studyTime: [],
      consistency: [],
    };

    // Son 10 seansın trendini hesapla
    const recentSessions = sortedSessions.slice(-10);
    recentSessions.forEach((session, index) => {
      trends.performance.push({
        session: index + 1,
        value: session.performance || 0,
      });
      
      trends.studyTime.push({
        session: index + 1,
        value: session.duration,
      });
    });

    return trends;
  }

  private async generateProgressPredictions(sessions: any[]) {
    const completedSessions = sessions.filter(s => s.isCompleted);
    const totalSessions = sessions.length;
    
    if (completedSessions.length < 3) {
      return {
        message: 'Tahmin için yeterli veri yok',
        confidence: 'low',
      };
    }

    const completionRate = completedSessions.length / totalSessions;
    const avgPerformance = completedSessions.reduce((sum, s) => sum + (s.performance || 0), 0) / completedSessions.length;
    
    // Basit trend analizi
    const recentSessions = completedSessions.slice(-5);
    const recentAvg = recentSessions.reduce((sum, s) => sum + (s.performance || 0), 0) / recentSessions.length;
    
    const trend = recentAvg > avgPerformance ? 'improving' : recentAvg < avgPerformance ? 'declining' : 'stable';
    
    let prediction = '';
    if (trend === 'improving') {
      prediction = 'Performansınız yükseliş trendinde. Bu şekilde devam edin!';
    } else if (trend === 'declining') {
      prediction = 'Performansınızda düşüş var. Çalışma stratejinizi gözden geçirin.';
    } else {
      prediction = 'Performansınız stabil. Daha da gelişmek için yeni teknikler deneyin.';
    }

    return {
      trend,
      prediction,
      confidence: completedSessions.length > 10 ? 'high' : 'medium',
      estimatedCompletion: this.estimateCompletionDate(sessions, completionRate),
    };
  }

  private estimateCompletionDate(sessions: any[], completionRate: number): Date {
    const remainingSessions = sessions.filter(s => !s.isCompleted).length;
    const avgDailyCompletion = completionRate * 2; // Günlük ortalama tamamlama
    const estimatedDays = Math.ceil(remainingSessions / avgDailyCompletion);
    
    const completion = new Date();
    completion.setDate(completion.getDate() + estimatedDays);
    
    return completion;
  }

  async generateHolidayPlan(data: { holidayType: string; duration: number; goals: string[] }): Promise<any> {
    // Daha detaylı AI prompt'u
    // İlk aşamada 3 günlük deneme planı, sonrasında 7 günlük
    const planDuration = data.duration > 7 ? 7 : (data.duration > 3 ? 3 : data.duration);
    
    const holidayPlanPrompt = `
    ${planDuration} günlük ${data.holidayType} tatili için detaylı çalışma planı oluştur.
    
    Hedefler: ${data.goals.join(', ')}
    
    Plan şu özellikleri içermeli:
    1. Her gün için detaylı zaman çizelgesi
    2. Farklı dersler için ayrılan süreler
    3. Eğlenceli öğrenme aktiviteleri ve projeler
    4. Dinlenme ve hobi zamanları
    5. Haftalık değerlendirme ve hedef kontrolü
    6. Motivasyon teknikleri
    7. Tatil sonrası okula hazırlık
    
    JSON formatında şu yapıda ver:
    {
      "title": "Tatil Çalışma Planı",
      "duration": ${planDuration},
      "type": "${data.holidayType}",
      "goals": ${JSON.stringify(data.goals)},
      "dailySchedule": [
        {
          "day": 1,
          "date": "2024-01-01",
          "sessions": [
            {
              "time": "09:00-10:30",
              "subject": "Matematik",
              "topic": "Temel konular",
              "activity": "Konu tekrarı ve soru çözümü",
              "type": "study",
              "difficulty": "medium"
            }
          ],
          "breaks": [
            {
              "time": "10:30-11:00",
              "activity": "Mola"
            }
          ],
          "evening": {
            "time": "19:00-20:00",
            "activity": "Gün değerlendirmesi ve yarın planı"
          }
        }
      ],
      "weeklyGoals": [
        {
          "week": 1,
          "goals": ["Hedef 1", "Hedef 2"],
          "assessment": "Hafta sonu değerlendirme"
        }
      ],
      "tips": [
        "Tatilde düzenli olmaya çalışın",
        "Kısa ama verimli seanslar yapın",
        "Öğrenmeyi eğlenceli hale getirin"
      ]
    }
    `;

    try {
      const aiResponse = await this.geminiService.generateContent(holidayPlanPrompt);
      
      console.log('🔍 AI Response Length:', aiResponse.length);
      console.log('🔍 AI Response Preview:', aiResponse.substring(0, 500));
      
      // AI yanıtını temizle (markdown formatını kaldır)
      let cleanedResponse = aiResponse;
      if (cleanedResponse.includes('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (cleanedResponse.includes('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      console.log('🔍 Cleaned Response Length:', cleanedResponse.length);
      console.log('🔍 Cleaned Response Preview:', cleanedResponse.substring(0, 500));
      
      // AI yanıtını kontrol et ve JSON'a çevirmeye çalış
      let holidayPlan;
      try {
        holidayPlan = JSON.parse(cleanedResponse);
        console.log('🔍 Parsed Plan Duration:', holidayPlan.duration);
        console.log('🔍 Parsed Daily Schedule Length:', holidayPlan.dailySchedule?.length);
      } catch (parseError) {
        console.log('AI response is not valid JSON after cleaning');
        console.log('Cleaned response:', cleanedResponse.substring(0, 200));
        throw new BadRequestException('AI tatil planı çıktısı geçersiz.');
      }
      
      // AI yanıtını doğrula ve gerekirse düzelt
      if (!holidayPlan.dailySchedule || !Array.isArray(holidayPlan.dailySchedule)) {
        console.log('AI response structure is invalid');
        throw new BadRequestException('AI tatil planı yapısı doğrulamadan geçmedi.');
      }
      
      return {
        success: true,
        plan: holidayPlan,
        message: 'Tatil planınız hazır! Keyifli çalışmalar.',
      };
    } catch (error) {
      console.log('AI holiday plan generation failed:', error.message);
      throw error;
    }
  }

  private createDetailedHolidayPlan(data: any) {
    throw new BadRequestException('Mock tatil planı devre dışı. AI planı üretilemedi.');
    /* const dailySchedule = [];
    const subjects = ['Matematik', 'Türkçe', 'Fen Bilgisi', 'Sosyal Bilgiler'];
    const activities = [
      'Konu tekrarı ve not alma',
      'Soru çözümü ve pratik',
      'Proje çalışması',
      'Araştırma ve sunum hazırlama',
      'Grup çalışması',
      'Eğitici oyunlar',
      'Deney ve gözlem',
      'Kitap okuma ve özet çıkarma'
    ];
    
    // İlk aşamada 3 günlük deneme planı, sonrasında 7 günlük
    const planDuration = data.duration > 7 ? 7 : (data.duration > 3 ? 3 : data.duration);
    
    for (let day = 1; day <= planDuration; day++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + day - 1);
      
      const sessions = [];
      const breaks = [];
      
      // Sabah seansı (09:00-10:30)
      sessions.push({
        time: '09:00-10:30',
        subject: subjects[day % subjects.length],
        topic: `${subjects[day % subjects.length]} temel konular`,
        activity: activities[day % activities.length],
        type: 'study',
        difficulty: 'medium'
      });
      
      breaks.push({
        time: '10:30-11:00',
        activity: 'Kahvaltı molası'
      });
      
      // Öğle seansı (11:00-12:30)
      sessions.push({
        time: '11:00-12:30',
        subject: subjects[(day + 1) % subjects.length],
        topic: `${subjects[(day + 1) % subjects.length]} pratik`,
        activity: 'Soru çözümü ve uygulama',
        type: 'practice',
        difficulty: 'medium'
      });
      
      breaks.push({
        time: '12:30-14:00',
        activity: 'Öğle yemeği ve dinlenme'
      });
      
      // Öğleden sonra seansı (14:00-15:30)
      sessions.push({
        time: '14:00-15:30',
        subject: subjects[(day + 2) % subjects.length],
        topic: `${subjects[(day + 2) % subjects.length]} proje`,
        activity: 'Proje tabanlı öğrenme',
        type: 'project',
        difficulty: 'hard'
      });
      
      breaks.push({
        time: '15:30-16:00',
        activity: 'Ara öğün molası'
      });
      
      // Akşam seansı (16:00-17:30)
      sessions.push({
        time: '16:00-17:30',
        subject: subjects[(day + 3) % subjects.length],
        topic: `${subjects[(day + 3) % subjects.length]} değerlendirme`,
        activity: 'Günlük değerlendirme ve yarın planı',
        type: 'review',
        difficulty: 'easy'
      });
      
      dailySchedule.push({
        day,
        date: currentDate.toISOString().split('T')[0],
        sessions,
        breaks,
        evening: {
          time: '19:00-20:00',
          activity: 'Aile ile paylaşım ve dinlenme'
        }
      });
    }
    
    // Haftalık hedefler
    const weeklyGoals = [];
    const weeks = Math.ceil(data.duration / 7);
    
    for (let week = 1; week <= weeks; week++) {
      weeklyGoals.push({
        week,
        goals: [
          `${week}. hafta konularını tamamla`,
          `${week}. hafta projelerini bitir`,
          `${week}. hafta değerlendirmesini yap`
        ],
        assessment: `${week}. hafta sonu genel değerlendirme`
      });
    }
    
    return {} as any; */
  }

  private createDefaultHolidayPlan(data: any) {
    throw new BadRequestException('Mock tatil planı devre dışı.');
  }

  async getLongTermPlan(userId: string): Promise<any> {
    const longTermPlans = await this.prisma.plan.findMany({
      where: {
        userId,
        type: 'LONG_TERM',
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (longTermPlans.length === 0) {
      return {
        hasPlan: false,
        message: 'Henüz uzun vadeli planınız yok',
        suggestion: 'Yeni bir uzun vadeli plan oluşturmak ister misiniz?',
      };
    }

    const plan = longTermPlans[0];
    const sessions = await this.prisma.studySession.findMany({
      where: { planId: plan.id },
    });

    return {
      hasPlan: true,
      plan: {
        ...plan,
        progress: this.calculatePlanProgress(sessions),
        milestones: await this.getLongTermMilestones(plan.id),
        timeline: this.generateLongTermTimeline(plan),
      },
    };
  }

  private async getLongTermMilestones(planId: string) {
    // Bu method milestone tracking için kullanılabilir
    return [
      { title: '1. Ay Tamamlandı', status: 'completed', date: new Date() },
      { title: '2. Ay Hedefi', status: 'in_progress', date: new Date() },
      { title: '3. Ay Hedefi', status: 'pending', date: new Date() },
    ];
  }

  private generateLongTermTimeline(plan: any) {
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      totalDays,
      totalWeeks: Math.ceil(totalDays / 7),
      totalMonths: Math.ceil(totalDays / 30),
      phases: [
        { name: 'Temel Kavramlar', duration: Math.floor(totalDays * 0.3), status: 'completed' },
        { name: 'İleri Konular', duration: Math.floor(totalDays * 0.4), status: 'in_progress' },
        { name: 'Uzmanlık', duration: Math.floor(totalDays * 0.3), status: 'pending' },
      ],
    };
  }

  async createLongTermPlan(userId: string, data: { goals: string[]; timeline: number; milestones: any[] }): Promise<any> {
    if (!userId) throw new BadRequestException('Kullanıcı kimliği gerekli');

    const longTermPlanPrompt = `
    ${data.timeline} aylık uzun vadeli eğitim planı oluştur.
    
    Hedefler: ${data.goals.join(', ')}
    İstenilen kilometre taşları: ${JSON.stringify(data.milestones)}
    
    Plan şunları içermeli:
    1. Aylık hedefler ve alt hedefler
    2. Haftalık odak alanları
    3. Değerlendirme kriterleri
    4. İlerleme takip yöntemleri
    5. Uyarlama stratejileri
    
    JSON formatında detaylı plan ver.
    `;

    const aiResponse = await this.geminiService.generateContent(longTermPlanPrompt);
    
    let planStructure;
    try {
      planStructure = JSON.parse(aiResponse);
    } catch {
      throw new BadRequestException('AI uzun vadeli plan çıktısı geçersiz.');
    }

    const plan = await this.prisma.plan.create({
      data: {
        userId,
        title: `${data.timeline} Aylık Uzun Vadeli Plan`,
        description: `${data.goals.join(', ')} hedefleri için oluşturulmuş plan`,
        type: 'LONG_TERM',
        subjects: [], // Genel plan
        goals: data.goals,
        startDate: new Date(),
        endDate: new Date(Date.now() + data.timeline * 30 * 24 * 60 * 60 * 1000),
        metadata: {
          timeline: data.timeline,
          milestones: data.milestones,
          structure: planStructure,
        },
      },
    });

    return {
      success: true,
      plan,
      message: 'Uzun vadeli planınız oluşturuldu!',
      nextSteps: [
        'Aylık hedeflerinizi gözden geçirin',
        'İlk hafta planınızı detaylandırın',
        'İlerlemenizi düzenli takip edin',
      ],
    };
  }

  private createDefaultLongTermPlan(data: any) {
    throw new BadRequestException('Mock uzun vadeli plan devre dışı.');
  }
}
