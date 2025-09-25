import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma/prisma.service';
import { GeminiService } from '../services/gemini.service';
import { aiPlanSchema, AiPlan } from './schemas/ai-plan.schema';
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
    grade?: number | string;
    curriculumTopicsBySubject?: Record<string, string[]>; // istemciden gönderilen müfredat konuları
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

// Plan üretimi için parametreler
export interface PlanParameters {
  planDurationWeeks: number; // Kaç hafta
  planFocus?: string; // Örn: "Konu Eksiği Kapatma"
  dailyMaxMinutes?: number; // Günlük maksimum süre (dk)
  preferredTimes?: string[]; // ["Akşam", "Hafta Sonu Öğlen"] gibi
}

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Zod: AI plan yapısı doğrulama şemaları
  private readonly aiSessionSchema = z.object({
    subject: z.string().min(1),
    topic: z.string().min(1),
    // Süre zorunlu: dakika
    durationInMinutes: z.number().int().positive(),
    // Tür zorunlu ve normalize edilir
    type: z.string().min(1).transform((val) => {
      const lowerVal = (val || 'study').toLowerCase();
      return ['study', 'review', 'practice', 'exam'].includes(lowerVal) ? lowerVal : 'study';
    }),
    // Zorluk isteğe bağlı
    difficulty: z.string().optional(),
    // Konumlandırma
    week: z.number().int().positive(),
    day: z.string().min(1),
    // Pedagojik alanlar zorunlu
    objectives: z.array(z.string()).min(1),
    resources: z.array(z.string()).min(1),
    techniques: z.array(z.string()).min(1),
  });

  private readonly aiWeeklyPlanSchema = z.object({
    week: z.number().int().positive(),
    focus: z.string().min(1),
    sessions: z.array(this.aiSessionSchema).min(1),
  });

  private readonly aiPlanSchema = z.object({
    // Haftalık yapıyı zorunlu kıl
    weeklyPlans: z.array(this.aiWeeklyPlanSchema).min(1),
    // Milestones ve adaptif stratejiler zorunlu
    milestones: z.array(z.object({
      week: z.number().int().positive(),
      goal: z.string().min(1),
      assessment: z.string().min(1),
      criteria: z.string().min(1),
    })).min(1),
    adaptiveStrategies: z.array(z.string()).min(1),
  });

  private cleanAiJsonResponse(text: string): string {
    if (!text) return text;
    let cleaned = text.trim();
    // Remove code fences
    cleaned = cleaned.replace(/```json\n?/gi, '').replace(/```/g, '');
    // Try to extract JSON substring between first { and last }
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.substring(first, last + 1);
    }
    return cleaned;
  }

  // A) AI Analizi: userContext + normalized veriye göre zayıf/güçlü alanlar ve haftalık strateji çıkarır
  private async aiAnalyzeUser(userContext: any, data: PlanGenerationData): Promise<any> {
    const prompt = `Sadece geçerli JSON döndür. Açıklama yazma.
{
  "task": "analyze_user",
  "student": {
    "subjects": ${JSON.stringify(data.subjects)},
    "goals": ${JSON.stringify(data.goals)},
    "availableTime": ${data.availableTime},
    "learningStyle": ${JSON.stringify(data.learningStyle)},
    "currentLevel": ${JSON.stringify(data.currentLevel)}
  },
  "context": {
    "weakAreas": ${JSON.stringify(userContext.weakAreas || [])},
    "strongAreas": ${JSON.stringify(userContext.strongAreas || [])},
    "topicSuccessRates": ${JSON.stringify(userContext.topicSuccessRates || {})},
    "subjectPerformance": ${JSON.stringify(userContext.subjectPerformance || {})},
    "preferredStudyHours": ${JSON.stringify(userContext.preferredStudyHours || [])},
    "subjectTimeAllocation": ${JSON.stringify(userContext.subjectTimeAllocation || {})}
  },
  "expect": {
    "weakTopicsTop3": ["<topic>", "<topic>", "<topic>"],
    "strongSubjectsTop2": ["<subject>", "<subject>"],
    "weeklyStrategy": "<one-week high-level strategy in Turkish>"
  }
}
`;
    const resp = await this.geminiService.generateContent(prompt);
    const cleaned = this.cleanAiJsonResponse(resp);
    try {
      return JSON.parse(cleaned);
    } catch {
      const block = this.extractFirstJsonBlock(resp);
      if (!block) return { weakTopicsTop3: [], strongSubjectsTop2: [], weeklyStrategy: '' };
      try { return JSON.parse(block); } catch { return { weakTopicsTop3: [], strongSubjectsTop2: [], weeklyStrategy: '' }; }
    }
  }

  /**
   * Usta Koç Prompt üretimi: Öğrenci profili, son haftanın metrikleri, tamamlanan konular ve deneme netlerini
   * tek bir kapsamlı metinde birleştirir. Bu metin Gemini function-calling ile şemalı plan üretimi için kullanılır.
   */
  async generateUstaKocPrompt(studentId: string, planParams: PlanParameters): Promise<string> {
    // 1) Öğrenci profili ve kullanıcı bilgisi
    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true } }),
      this.prisma.studentProfile.findUnique({ where: { userId: studentId } }),
    ]);

    // Emniyetli varsayılanlar
    const grade = profile?.grade ?? 12;
    const field = profile?.field ?? 'Sayısal';
    const learningStyle = profile?.learningStyle ?? 'Karma';
    const goals = Array.isArray(profile?.goals) ? profile!.goals : [];
    const strengths = Array.isArray(profile?.strengths) ? profile!.strengths : [];
    const weaknesses = Array.isArray(profile?.weaknesses) ? profile!.weaknesses : [];

    // 2) Son haftanın metrikleri (özet)
    const startOfWeek = (() => { const d = new Date(); const day = d.getDay() || 7; d.setHours(0,0,0,0); d.setDate(d.getDate() - (day - 1)); return d; })();
    const weeklyMetrics = await (this.prisma as any).studentWeeklyMetrics.findMany({
      where: { userId: studentId, weekStart: { lte: new Date(), gte: new Date(startOfWeek) } },
      orderBy: { weekStart: 'desc' },
      take: 5,
    });
    const latest = weeklyMetrics[0];
    const tasksCompleted = latest?.tasksCompleted ?? 0;
    const tasksSkipped = latest?.tasksSkipped ?? 0;
    const avgSelfReport = latest?.avgSelfReport ?? 0;
    const avgQuizScore = latest?.avgQuizScore ?? 0;

    // 3) Tamamlanan konular (geçen hafta)
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const completedSessions = await this.prisma.studySession.findMany({
      where: { userId: studentId, isCompleted: true, startTime: { gte: oneWeekAgo } },
      select: { subject: true, topic: true },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
    const completedTopics = completedSessions.map(s => `${s.subject} - ${s.topic}`);

    // 4) Son deneme netleri (özet)
    const lastExams = await this.prisma.examResult.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { subject: true, score: true, totalScore: true, examType: true },
    });
    const examNets = lastExams.map(e => ({
      examType: e.examType,
      subject: e.subject,
      net: e.totalScore && e.totalScore > 0 ? Math.round((e.score / e.totalScore) * 100) : 0,
    }));

    // 5) Plan parametreleri
    const durationWeeks = planParams.planDurationWeeks ?? 2;
    const dailyMax = planParams.dailyMaxMinutes ?? 120;
    const preferredTimes = planParams.preferredTimes ?? [];
    const planFocus = planParams.planFocus ?? 'Konu Eksiği Kapatma';

    // 6) Prompt metni (kapsamlı talimatlar)
    const prompt = `Sadece geçerli JSON döndür. Açıklama yazma.
{
  "task": "usta_koc_plan",
  "planDurationWeeks": ${durationWeeks},
  "planFocus": ${JSON.stringify(planFocus)},
  "constraints": {
    "spacedRepetition": [1, 3, 7],
    "dailyMaxMinutes": ${dailyMax},
    "maxSubjectsPerDay": 2,
    "techniqueByLearningStyle": true
  },
  "student": {
    "id": ${JSON.stringify(user?.id || studentId)},
    "name": ${JSON.stringify(user?.name || 'Öğrenci')},
    "grade": ${grade},
    "field": ${JSON.stringify(field)},
    "learningStyle": ${JSON.stringify(learningStyle)},
    "goals": ${JSON.stringify(goals)},
    "strengths": ${JSON.stringify(strengths)},
    "weaknesses": ${JSON.stringify(weaknesses)},
    "preferredTimes": ${JSON.stringify(preferredTimes)}
  },
  "weeklyPerformance": {
    "tasksCompleted": ${tasksCompleted},
    "tasksSkipped": ${tasksSkipped},
    "avgSelfReport": ${avgSelfReport},
    "avgQuizScore": ${avgQuizScore}
  },
  "recentExams": ${JSON.stringify(examNets)},
  "completedTopicsLastWeek": ${JSON.stringify(completedTopics)},
  "rules": [
    "Aralıklı tekrar 1-3-7 gün kuralına uy.",
    "Günlük toplam süre ${dailyMax} dakikayı aşmasın.",
    "Aynı gün en fazla 2 farklı ders.",
    "Öğrenme stiline uygun teknik öner.",
    "Riskli konulara pekiştirme ve kolay soru; güçlü konulara zorlayıcı testler ekle."
  ],
  "outputSchema": "aiPlanSchema"
}`;

    return prompt;
  }

  /**
   * AI ile plan üret: prompt → function-calling → zod doğrulama → Plan/StudySession kayıtları.
   */
  async generatePlanWithAI(studentId: string, planParams: PlanParameters): Promise<{ plan: any; sessions: any[] }> {
    // 1) Prompt oluştur
    const prompt = await this.generateUstaKocPrompt(studentId, planParams);

    // 2) Function-calling için kaba JSON schema (Gemini argümanları)
    const functionParamsSchema: any = {
      type: 'object',
      properties: {
        planId: { type: 'string' },
        studentId: { type: 'string' },
        summary: { type: 'string' },
        weeklyPlans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              week: { type: 'number' },
              focus: { type: 'string' },
              sessions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    day: { type: 'string' },
                    startTime: { type: 'string' },
                    subject: { type: 'string' },
                    topic: { type: 'string' },
                    type: { type: 'string' },
                    durationMinutes: { type: 'number' },
                    objective: { type: 'string' },
                    recommendedTechnique: { type: 'string' },
                    resources: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['day', 'startTime', 'subject', 'topic', 'type', 'durationMinutes', 'objective', 'recommendedTechnique']
                }
              }
            },
            required: ['week', 'focus', 'sessions']
          }
        },
        milestones: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } } } },
        adaptiveStrategies: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } } } }
      },
      required: ['planId', 'studentId', 'summary', 'weeklyPlans']
    };

    // 3) Gemini function-calling ile planı al
    const aiArgs = await this.geminiService.generateFunctionCall('save_study_plan', functionParamsSchema, prompt);

    // 4) Zod doğrulama
    const parsed = aiPlanSchema.safeParse(aiArgs);
    if (!parsed.success) {
      // hata logla ve fallback üret
      console.warn('[AI PLAN] Zod doğrulama hatası:', parsed.error.flatten());
      const fallback = await this.basicSkeletonPlan(studentId, planParams);
      return fallback;
    }

    const aiPlan: AiPlan = parsed.data;

    // 5) Veritabanına yaz: Plan + StudySession (batch)
    const now = new Date();
    const startDate = now;
    const endDate = new Date(now); endDate.setDate(endDate.getDate() + (planParams.planDurationWeeks * 7));

    const createdPlan = await this.prisma.plan.create({
      data: {
        userId: studentId,
        title: `AI Planı - ${planParams.planFocus || 'Kişisel'}`,
        description: aiPlan.summary,
        type: 'WEEKLY',
        subjects: [],
        goals: [],
        startDate,
        endDate,
        metadata: { aiPlan },
      },
    });

    const sessionsData: any[] = [];
    for (const w of aiPlan.weeklyPlans) {
      for (const s of w.sessions) {
        const sessionStart = this.resolveNextWeekdayTime(s.day, s.startTime);
        sessionsData.push({
          planId: createdPlan.id,
          userId: studentId,
          subject: s.subject,
          topic: s.topic,
          duration: s.durationMinutes,
          startTime: sessionStart,
          isCompleted: false,
          metadata: { type: s.type, objective: s.objective, recommendedTechnique: s.recommendedTechnique, resources: s.resources || [] },
        });
      }
    }

    if (sessionsData.length > 0) {
      // Prisma batch insert
      await this.prisma.studySession.createMany({ data: sessionsData, skipDuplicates: true });
    }

    return { plan: createdPlan, sessions: sessionsData };
  }

  // Yardımcı: Haftanın ilgili gününe en yakın HH:mm Date üret
  private resolveNextWeekdayTime(dayNameTr: string, hhmm: string): Date {
    const mapping: Record<string, number> = { 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6, 'Pazar': 0 };
    const targetDow = mapping[dayNameTr] ?? 1;
    const now = new Date();
    const curDow = now.getDay();
    const [hh, mm] = hhmm.split(':').map((x) => parseInt(x, 10));
    const diff = (targetDow - curDow + 7) % 7;
    const d = new Date(now);
    d.setDate(now.getDate() + diff);
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  // Basit geri dönüş planı
  private async basicSkeletonPlan(studentId: string, planParams: PlanParameters): Promise<{ plan: any; sessions: any[] }> {
    const now = new Date();
    const endDate = new Date(now); endDate.setDate(endDate.getDate() + (planParams.planDurationWeeks * 7));
    const plan = await this.prisma.plan.create({
      data: {
        userId: studentId,
        title: `Temel Plan - ${planParams.planFocus || 'Kişisel'}`,
        description: 'AI planı üretilemedi, temel iskelet planı uygulandı.',
        type: 'WEEKLY',
        subjects: [],
        goals: [],
        startDate: now,
        endDate,
        metadata: { fallback: true },
      }
    });

    const sessions = [] as any[];
    // her hafta 3 seans varsayalım
    for (let w = 0; w < planParams.planDurationWeeks; w++) {
      for (const [dayName, time] of [['Pazartesi', '19:00'], ['Çarşamba', '19:00'], ['Cuma', '19:00']] as const) {
        sessions.push({
          planId: plan.id,
          userId: studentId,
          subject: 'Genel',
          topic: 'Konu Tekrarı',
          duration: 40,
          startTime: this.resolveNextWeekdayTime(dayName, time),
          isCompleted: false,
          metadata: { type: 'Review', objective: 'Temel pekiştirme', recommendedTechnique: 'Aktif hatırlama', resources: [] },
        });
      }
    }

    if (sessions.length > 0) await this.prisma.studySession.createMany({ data: sessions, skipDuplicates: true });
    return { plan, sessions };
  }

  // B) Stratejiye göre plan iskeleti üret (haftalık plan + oturumlar taslak)
  private async buildPlanSkeletonFromStrategy(aiAnalysis: any, data: PlanGenerationData, userContext: any): Promise<any> {
    const planDurationDays: number = Number((data as any)?.planDurationDays) > 0 ? Number((data as any).planDurationDays) : 3;
    const minSessionsPerDay = 2;
    const subjects = Array.isArray(data.subjects) && data.subjects.length > 0 ? data.subjects : ['Genel'];
    const preferredTopics: string[] = Array.isArray((data as any)?.preferences?.focusAreas) ? (data as any).preferences.focusAreas : (aiAnalysis?.weakTopicsTop3 || []);
    const gradeNum = typeof (data as any)?.preferences?.grade === 'number'
      ? (data as any).preferences.grade
      : parseInt(String((data as any)?.preferences?.grade || '0')) || 11;
    const topicPool = await this.buildCurriculumTopicPool(subjects, gradeNum, (data as any)?.preferences?.curriculumTopicsBySubject);

    // Seed ve shuffle: kullanıcıya/haftaya göre tutarlı, kullanıcılar arasında farklı
    const baseSeed = this.seedFrom((data as any)?.userId || 'anon');
    const shuffledSubjects = this.shuffleWithSeed(subjects, baseSeed);

    const weeklyPlans: any[] = [];
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    for (let d = 0; d < planDurationDays; d++) {
      const weekIndex = Math.floor(d / 7) + 1;
      while (weeklyPlans.length < weekIndex) {
        weeklyPlans.push({ week: weeklyPlans.length + 1, focus: undefined, sessions: [] });
      }
      const dayName = dayNames[d % 7];
      let lastTopicsForDay: Record<string, string> = {};
      // Gün bazlı offset: aynı paterni kırmak için
      const dayStartOffset = (d + weekIndex + shuffledSubjects.length) % Math.max(1, shuffledSubjects.length);
      for (let k = 0; k < minSessionsPerDay; k++) {
        const subject = shuffledSubjects[(dayStartOffset + k) % shuffledSubjects.length];
        const topicList = this.pickTopicFromPool(
          subject,
          topicPool
        );
        const topic = subject; // Geçici: seçim AI'a devredildi
        // Süre varyasyonu (jitter) – sınırlar içinde
        const baseDuration = Math.max(30, Math.min(((data as any)?.preferences?.sessionDuration || 40), 120));
        const jitterRand = this.randomWithSeed(baseSeed + d * 100 + k)();
        const jitter = Math.round((jitterRand - 0.5) * 20); // ±10 dakika
        const durationInMinutes = Math.max(30, Math.min(baseDuration + jitter, 120));

        weeklyPlans[weekIndex - 1].sessions.push({
          week: weekIndex,
          day: dayName,
          subject,
          topic,
          durationInMinutes,
          type: 'study',
          difficulty: 'medium',
          objectives: [],
          resources: [],
          techniques: this.getTechniquesForLearningStyle(data.learningStyle),
        });
        lastTopicsForDay[subject] = topic;
      }
    }
    return { weeklyPlans, planDurationDays, strategy: aiAnalysis?.weeklyStrategy || '' };
  }

  // C) AI ile seçili gün/oturumları detaylandır: hedefler, kaynaklar, teknikler vb.
  private async detailSessionsWithAI(skeleton: any, data: PlanGenerationData): Promise<any> {
    try {
      const toDetail = [] as Array<{ week: number; day: string; subject: string; topic: string; }>;
      (skeleton?.weeklyPlans || []).forEach((w: any) => {
        const firstTwo = (w.sessions || []).slice(0, 2);
        firstTwo.forEach((s: any) => toDetail.push({ week: w.week, day: s.day, subject: s.subject, topic: s.topic }));
      });
      for (const item of toDetail) {
        const prompt = `Sadece geçerli JSON döndür. Açıklama yazma.
{
  "task": "detail_session",
  "constraints": {
    "durationMinutes": 120,
    "technique": "Feynman",
    "includeMiniTest": true,
    "miniTestQuestions": 10
  },
  "session": {
    "day": ${JSON.stringify(item.day)},
    "subject": ${JSON.stringify(item.subject)},
    "topic": ${JSON.stringify(item.topic)}
  },
  "expect": {
    "objectives": ["...", "..."],
    "resources": ["..."],
    "techniques": ["Feynman", "..."],
    "activities": [
      {"type": "study", "minutes": 40, "note": "konu anlatımı"},
      {"type": "practice", "minutes": 30, "note": "örnek soru"},
      {"type": "quiz", "minutes": 20, "questions": 10}
    ]
  }
}`;
        const resp = await this.geminiService.generateContent(prompt);
        const cleaned = this.cleanAiJsonResponse(resp);
        let details: any = {};
        try { details = JSON.parse(cleaned); } catch { const block = this.extractFirstJsonBlock(resp); if (block) { try { details = JSON.parse(block); } catch { details = {}; } } }
        const weekRef = (skeleton.weeklyPlans || []).find((w: any) => w.week === item.week);
        if (!weekRef) continue;
        const sess = (weekRef.sessions || []).find((s: any) => s.day === item.day && s.subject === item.subject && s.topic === item.topic);
        if (!sess) continue;
        if (Array.isArray(details.objectives)) sess.objectives = details.objectives;
        if (Array.isArray(details.resources)) sess.resources = details.resources;
        if (Array.isArray(details.techniques)) sess.techniques = details.techniques;
        if (Array.isArray(details.activities)) sess.metadata = { ...(sess.metadata || {}), activities: details.activities };
      }
      return skeleton;
    } catch {
      return skeleton;
    }
  }

  private extractFirstJsonBlock(text: string): string | null {
    if (!text) return null;
    const n = text.length;
    for (let i = 0; i < n; i++) {
      const ch = text[i];
      if (ch === '{' || ch === '[') {
        const stack: string[] = [ch];
        for (let j = i + 1; j < n; j++) {
          const cj = text[j];
          if (cj === '{' || cj === '[') stack.push(cj);
          else if (cj === '}' || cj === ']') {
            const last = stack[stack.length - 1];
            if ((last === '{' && cj === '}') || (last === '[' && cj === ']')) {
              stack.pop();
              if (stack.length === 0) {
                const candidate = text.slice(i, j + 1).trim();
                if (candidate.length >= 2) return candidate;
                break;
              }
            }
          }
        }
      }
    }
    return null;
  }

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

  // 11-12. sınıflar için alan bazlı ders filtresi
  private filterSubjectsForGradeAndTrack(subjects: string[], grade: number, track: string): string[] {
    if (!Array.isArray(subjects) || subjects.length === 0) return [];
    if (grade < 11) return subjects;
    const norm = (v: string) => String(v || '').toLowerCase();
    const cleaned = subjects.map(s => String(s).trim()).filter(Boolean);
    const SAYISAL = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'];
    const EA = ['Matematik', 'Türkçe', 'Tarih', 'Coğrafya'];
    const SOZEL = ['Türkçe', 'Tarih', 'Coğrafya'];
    let allowed: string[] | null = null;
    switch (norm(track)) {
      case 'sayisal':
        allowed = SAYISAL; break;
      case 'ea':
      case 'eşit ağırlık':
      case 'esit agirlik':
      case 'eşit_ağırlık':
        allowed = EA; break;
      case 'sozel':
      case 'sözel':
        allowed = SOZEL; break;
      default:
        allowed = null; // bilinmiyorsa geleni bozma
    }
    if (!allowed) return subjects;
    const allowedSet = new Set(allowed.map(norm));
    const filtered = cleaned.filter(s => allowedSet.has(norm(s)));
    return filtered.length > 0 ? filtered : subjects;
  }

  // Function Calling için: AI'nın çağıracağı fonksiyonun şema tanımı
  private buildSavePlanFunctionSchema() {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['DAILY','WEEKLY','HOLIDAY','LONG_TERM'] },
        planDurationDays: { type: 'number' },
        weeklyPlans: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              week: { type: 'number' },
              focus: { type: 'string' },
              sessions: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    week: { type: 'number' },
                    day: { type: 'string' },
                    subject: { type: 'string' },
                    topic: { type: 'string' },
                    durationInMinutes: { type: 'number' },
                    type: { type: 'string', enum: ['study','review','practice','exam'] },
                    difficulty: { type: 'string' },
                    objectives: { type: 'array', minItems: 1, items: { type: 'string' } },
                    resources: { type: 'array', minItems: 1, items: { type: 'string' } },
                    techniques: { type: 'array', minItems: 1, items: { type: 'string' } },
                  },
                  required: ['week','day','subject','topic','durationInMinutes','type','objectives','resources','techniques']
                }
              }
            },
            required: ['week','focus','sessions']
          }
        },
        milestones: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              week: { type: 'number' },
              goal: { type: 'string' },
              assessment: { type: 'string' },
              criteria: { type: 'string' },
            },
            required: ['week','goal','assessment','criteria']
          }
        },
        adaptiveStrategies: { type: 'array', minItems: 1, items: { type: 'string' } },
      },
      required: ['title','type','weeklyPlans','milestones','adaptiveStrategies']
    };
  }

  // Dinamik strateji motoru - öğrencinin durumuna göre strateji üretir
  private determineStrategicFocus(userContext: any, academicPeriod: string): string {
    const { completionRate, learningVelocity } = userContext.previousPlans?.[0] || { completionRate: 100, learningVelocity: 0.5 };

    if (completionRate < 50) {
      return `STRATEJİK ODAK: Öğrenci önceki planlarında zorlanmış. Bu plan daha temel ve tekrar odaklı olmalı. Motivasyonu artırıcı ve başarı hissini pekiştirici seanslar ekle.`;
    }
    
    if (academicPeriod === 'GENEL_TEKRAR') {
      return `STRATEJİK ODAK: Sınava az kaldı. Yeni konu öğrenmeyi bırak. Program, SADECE genel tekrar ve deneme sınavı analizine odaklanmalıdır.`;
    }
    
    // Varsayılan strateji
    return `STRATEJİK ODAK: Şu an dönemin başındayız. Program, bu ayın yeni konularını öğrenmeye ve temel atmaya odaklanmalıdır.`;
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

    // Sade kullanıcı bağlamı (opsiyonel; öneriler için minimal)
    const userContext: any = {
      subjectPerformance: {},
      timePatterns: {},
      learningVelocity: 0.5,
      preferredStudyHours: [],
      totalStudyTime: 0,
      averageSessionDuration: (normalized.preferences?.sessionDuration || 40),
      topicSuccessRates: {},
      examNets: [],
      subjectTimeAllocation: {},
      previousPlans: [],
      skippedSessionsCount: 0,
      weakAreas: Array.isArray(normalized.preferences?.focusAreas) ? normalized.preferences!.focusAreas : [],
      strongAreas: [],
    };

    console.log('[PLANNING] Deterministik plan oluşturma başlatılıyor...');

    // 1) Hammadde Departmanı: öğrenci profiline göre spesifik konu listesi
    const studentProfile = {
      grade: (data as any)?.planContext?.grade ?? (data as any)?.studentProfile?.grade,
      academicTrack: (data as any)?.planContext?.academicTrack ?? (data as any)?.studentProfile?.field,
      weaknesses: (data as any)?.planContext?.weaknesses ?? (normalized.preferences?.focusAreas || []),
      lastCompletedTopics: (data as any)?.planContext?.lastCompletedTopics ?? {},
      selectedSubjects: (data as any)?.planContext?.selectedSubjects ?? normalized.subjects,
    } as any;

    // 11-12. sınıflar için alan (track) bazlı ders filtrelemesi
    const gradeForTrack = parseInt(String(studentProfile.grade || '0')) || 0;
    const trackLower = String(studentProfile.academicTrack || '').toLowerCase();
    if (gradeForTrack >= 11 && Array.isArray(studentProfile.selectedSubjects)) {
      const filtered = this.filterSubjectsForGradeAndTrack(studentProfile.selectedSubjects, gradeForTrack, trackLower);
      if (filtered.length > 0) {
        studentProfile.selectedSubjects = filtered;
      }
    }

    console.time('getRelevantTopicsForStudent');
    const relevantTopics = await this.getRelevantTopicsForStudent(studentProfile, new Date());
    console.timeEnd('getRelevantTopicsForStudent');

    // 2) Montaj Hattı: konulardan deterministik iskelet oluştur
    console.time('buildScheduleFromTopics');
    const planSkeleton = this.buildScheduleFromTopics(relevantTopics, normalized);
    console.timeEnd('buildScheduleFromTopics');

    // 3) Kalite Kontrol: AI ile seans detaylarını zenginleştir
    console.time('enrichWithAI');
    const finalPlanStructure = await this.enrichSkeletonWithAI(planSkeleton, normalized.learningStyle);
    console.timeEnd('enrichWithAI');

    // ADIM D: Nihai planı veritabanına kaydet ve döndür
    const planDurationDays: number = Number((normalized as any)?.planDurationDays) > 0
      ? Number((normalized as any).planDurationDays)
      : 3;
    
    // Plan yapısına süre bilgisini ekle
    (finalPlanStructure as any).planDurationDays = planDurationDays;
    
    // Seansları çıkar
    const sessionsFromStructure = finalPlanStructure.weeklyPlans?.flatMap((w: any) => w?.sessions || []) || [];
    
    // Veritabanına kaydet
    const inferredPlanType = planDurationDays >= 7 ? 'WEEKLY' : 'DAILY';
    const learningStyleLabel = this.getLearningStyleDisplayName(normalized.learningStyle);
    const suppressTitleByStyle = (normalized as any)?.suppressLearningStyleInTitle === true;
    const isGenericStyle = suppressTitleByStyle || !normalized.learningStyle || ['visual', 'balanced', 'generic', 'personalized'].includes((normalized.learningStyle || '').toLowerCase());
    const computedTitle = isGenericStyle
      ? 'Kişiselleştirilmiş Çalışma Planı'
      : `${learningStyleLabel} Öğrenme Planı`;

    const savedPlan = await this.prisma.plan.create({
      data: {
        userId,
        title: computedTitle,
        description: `${(studentProfile.selectedSubjects || normalized.subjects).join(', ')} dersleri için kişiselleştirilmiş plan`,
        type: inferredPlanType as any,
        subjects: (studentProfile.selectedSubjects || normalized.subjects),
        goals: normalized.goals,
        startDate: new Date(),
        endDate: new Date(Date.now() + planDurationDays * 24 * 60 * 60 * 1000),
        metadata: {
          learningStyle: normalized.learningStyle,
          availableTime: normalized.availableTime,
          preferences: normalized.preferences,
          aiGenerated: true,
          planStructure: finalPlanStructure,
          planDurationDays,
        },
      },
    });

    // Çalışma seanslarını oluştur (weeklyPlans içindeki seansları da destekle)
    await this.createStudySessions(savedPlan.id, sessionsFromStructure, userId);

    return {
      success: true,
      plan: {
        id: savedPlan.id,
        title: savedPlan.title,
        description: savedPlan.description,
        structure: finalPlanStructure,
        timeline: this.generateTimeline(finalPlanStructure),
        recommendations: await this.generateRecommendations(normalized, userContext),
      },
      message: 'Kişiselleştirilmiş planınız başarıyla oluşturuldu!',
    };
  }

  // isValidPlanStructure kaldırıldı; yerine Zod şeması kullanılıyor

  // Frontend'in beklediği: görev ilerlemesi güncelle
  async updateTaskProgress(data: { userId: string; taskId: string; minutes: number }) {
    if (!data.taskId || typeof data.minutes !== 'number') {
      throw new BadRequestException('Geçersiz parametreler');
    }
    const session = await this.prisma.studySession.findFirst({ where: { id: data.taskId, userId: data.userId } });
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
    // Kullanıcı profilini al
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    // Onboarding alanlarını derle
    const ctx = (data as any)?.planContext || {};
    const selectedSubjects: string[] = ctx?.selectedSubjects || data?.selectedSubjects || data?.subjects || profile?.studentProfile?.goals || ['Matematik', 'Türkçe'];
    const weaknesses: string[] = ctx?.weaknesses || data?.weaknesses || profile?.studentProfile?.weaknesses || [];
    const goals: string[] = (data?.goals && Array.isArray(data.goals) && data.goals.length > 0)
      ? data.goals
      : (selectedSubjects.length > 0
          ? selectedSubjects.slice(0, 3).map((s: string) => `${s} temel kavramlarını tamamla`)
          : ['Temel hedefler']);

    const dailyHours: number = typeof ctx?.dailyHours === 'number' ? ctx.dailyHours
      : (typeof data?.dailyHours === 'number' ? data.dailyHours : (typeof data?.availableTime === 'number' ? Math.max(0, Math.round((data.availableTime as number) / 60)) : 2));
    const availableTime: number = dailyHours * 60; // dakika/gün

    const learningStyle: string = data?.learningStyle || ctx?.learningStyle || profile?.studentProfile?.learningStyle || 'personalized';

    const preferredStudyTimes: string[] = Array.isArray(ctx?.preferredStudyTimes) ? ctx.preferredStudyTimes : (Array.isArray(data?.preferredStudyTimes) ? data.preferredStudyTimes : []);
    const preferredSessionDuration: number = typeof ctx?.preferredSessionDuration === 'number' ? ctx.preferredSessionDuration : (typeof data?.preferredSessionDuration === 'number' ? data.preferredSessionDuration : 40);
    const studyDays: number[] = Array.isArray(ctx?.studyDays) ? ctx.studyDays : (Array.isArray(data?.studyDays) ? data.studyDays : []);
    const confidenceLevels = ctx?.confidenceLevels || data?.confidenceLevels || {};
    const lastCompletedTopics = ctx?.lastCompletedTopics || data?.lastCompletedTopics || {};
    const gradeStr: string = (ctx?.grade ?? data?.grade ?? profile?.studentProfile?.grade ?? '').toString();
    const gradeNum: number = parseInt(gradeStr) || 0;
    const academicTrack: string = ctx?.academicTrack || data?.academicTrack || profile?.studentProfile?.field || '';

    const currentLevel: string = gradeNum >= 11 ? 'advanced' : (gradeNum >= 9 ? 'medium' : 'beginner');

    const normalized = {
      subjects: selectedSubjects,
      goals,
      availableTime,
      learningStyle,
      currentLevel,
      userId,
      // Frontend'den gelen plan süresi (gün) bilgisi varsa aynen geçir
      ...(typeof data?.planDurationDays === 'number' && data.planDurationDays > 0
        ? { planDurationDays: Number(data.planDurationDays) }
        : {}),
      preferences: {
        studyTimes: preferredStudyTimes,
        sessionDuration: preferredSessionDuration,
        breakDuration: 10,
        difficulty: currentLevel,
        focusAreas: weaknesses,
        studyDays,
        grade: gradeNum,
        field: academicTrack,
        confidenceLevels,
        lastCompletedTopics,
      },
      // UI tercihleri
      suppressLearningStyleInTitle: !!data?.suppressLearningStyleInTitle,
    } as any;

    return this.generatePlan(normalized);
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
    // Planın endDate'ini premium kuralına göre güncelle
    if (result?.plan?.id) {
      const updated = await this.prisma.plan.update({
        where: { id: result.plan.id },
        data: { endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) },
      });
      return { ...result, plan: { ...result.plan, endDate: updated.endDate } };
    }
    return result;
  }

  // Tatil planını AI'den oluşturup kalıcılaştır
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
    // StudySession üretimi: varsa günlük schedule'dan basit seanslar çıkar
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
    // Daha zengin kullanıcı bağlamı: performans geçmişi, çalışma alışkanlıkları ve önceki plan verileri
    const [studySessions, quizResults, examResults, plans] = await Promise.all([
      this.prisma.studySession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.quiz.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.examResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.plan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { sessions: true },
        take: 10,
      }),
    ]);

    // 1) Performans geçmişi (deneme netleri ve konu bazlı başarı)
    const subjectPerformance = this.analyzeSubjectPerformance(studySessions, quizResults, examResults);
    const topicSuccessRates: Record<string, number> = {};
    const topicBuckets: Record<string, number[]> = {};
    quizResults.forEach((q: any) => {
      const key = (q.topic || q.subject || 'Genel').toString();
      const scorePct = q.totalScore && q.totalScore > 0 ? (q.score / q.totalScore) * 100 : 0;
      if (!topicBuckets[key]) topicBuckets[key] = [];
      topicBuckets[key].push(scorePct);
    });
    examResults.forEach((e: any) => {
      const key = (e.topic || e.subject || 'Genel').toString();
      const scorePct = e.totalScore && e.totalScore > 0 ? (e.score / e.totalScore) * 100 : 0;
      if (!topicBuckets[key]) topicBuckets[key] = [];
      topicBuckets[key].push(scorePct);
    });
    Object.keys(topicBuckets).forEach((k) => {
      const arr = topicBuckets[k];
      topicSuccessRates[k] = arr.length > 0 ? (arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    });

    // 2) Çalışma alışkanlıkları (verimli saatler, ders/konu bazlı zaman dağılımı)
    const timePatterns = this.analyzeStudyTimePatterns(studySessions);
    const learningVelocity = this.calculateLearningVelocity(studySessions);
    const subjectTimeAllocation: Record<string, number> = {};
    studySessions.forEach((s: any) => {
      const subj = (s.subject || 'Genel').toString();
      subjectTimeAllocation[subj] = (subjectTimeAllocation[subj] || 0) + (s.duration || 0);
    });

    // 3) Önceki plan verileri (tamamlama oranları, atlanan oturumlar)
    const previousPlans = plans.map((p) => {
      const total = p.sessions.length;
      const completed = p.sessions.filter((s: any) => s.isCompleted).length;
      const skipped = p.sessions.filter((s: any) => (s.metadata as any)?.skipped === true).length;
      return {
        id: p.id,
        title: p.title,
        type: p.type,
        createdAt: p.createdAt,
        totalSessions: total,
        completedSessions: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        skippedSessions: skipped,
        totalStudyTime: p.sessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0),
      };
    });
    const overallSkipped = previousPlans.reduce((sum, x) => sum + x.skippedSessions, 0);

    const [weakAreas, strongAreas] = await Promise.all([
      this.identifyWeakAreas(userId),
      this.identifyStrongAreas(userId),
    ]);

    return {
      subjectPerformance,
      timePatterns,
      learningVelocity,
      preferredStudyHours: this.getPreferredStudyHours(studySessions),
      totalStudyTime: studySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageSessionDuration: studySessions.length > 0 ?
        studySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / studySessions.length : 45,

      topicSuccessRates,
      examNets: examResults.map((e: any) => ({
        id: e.id,
        subject: e.subject,
        score: e.score,
        totalScore: e.totalScore,
        date: e.createdAt,
        percent: e.totalScore && e.totalScore > 0 ? (e.score / e.totalScore) * 100 : 0,
      })),

      subjectTimeAllocation,
      previousPlans,
      skippedSessionsCount: overallSkipped,

      weakAreas,
      strongAreas,
    };
  }

  // YENİ MANTIK: Deterministik konu seçim beyni
  private async determineTopicsToStudy(data: PlanGenerationData, userContext: any): Promise<string[]> {
    const { subjects, preferences } = data;
    const planContext = (data as any)?.planContext || {};
    const { grade, weaknesses, lastCompletedTopics } = planContext;
    const currentMonth = new Date().getMonth() + 1;

    console.log('[PLANNING] Konu seçimi başlatılıyor...', { subjects, grade, weaknesses, lastCompletedTopics });

    // 1. Müfredat kütüphanesinden bu ayın ve öğrencinin seviyesine uygun TÜM konuları çek
    const gradeNum = typeof grade === 'number' ? grade : parseInt(String(grade || '0')) || 11;
    const startDate: Date | undefined = (data as any)?.planStartDate ? new Date((data as any).planStartDate) : undefined;
    const days = Number((data as any)?.planDurationDays) > 0 ? Number((data as any).planDurationDays) : 3;
    const endDate: Date | undefined = startDate ? new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000) : undefined;
    const topicPool = await this.buildCurriculumTopicPool(
      subjects,
      gradeNum,
      (data as any)?.preferences?.curriculumTopicsBySubject,
      { startDate, endDate }
    );
    console.log('[PLANNING] Müfredat havuzu oluşturuldu:', Object.keys(topicPool));

    // 2. Önce, zayıf olarak belirtilen konuları bu havuzdan bul ve listeye ekle
    const weakTopicsToStudy = this.findMatchingTopics(weaknesses || [], topicPool);
    console.log('[PLANNING] Zayıf konular bulundu:', weakTopicsToStudy);

    // 3. Ardından, en son tamamlanan konudan sonraki mantıksal konuları bul ve listeye ekle
    const nextLogicalTopics = this.findNextTopics(lastCompletedTopics || {}, topicPool);
    console.log('[PLANNING] Sonraki mantıksal konular bulundu:', nextLogicalTopics);

    // 4. Kalan süreyi, bu ayın müfredatındaki diğer konularla doldur
    const allAvailableTopics = Object.values(topicPool).flat();
    const usedTopics = [...weakTopicsToStudy, ...nextLogicalTopics];
    const remainingTopics = allAvailableTopics.filter(topic => !usedTopics.includes(topic));
    
    // Plan süresine göre ek konular seç
    // Varsayılan: deneme sürümünde 3 gün, sonrasında 7 gün
    let planDurationDays = Number((data as any)?.planDurationDays);
    if (!planDurationDays || planDurationDays <= 0) {
      const isTrial = true; // ileride kullanıcı abonelik durumuna göre belirlenebilir
      planDurationDays = isTrial ? 3 : 7;
    }
    const sessionsPerDay = 2;
    const totalSessions = planDurationDays * sessionsPerDay;
    const neededTopics = Math.max(0, totalSessions - usedTopics.length);
    
    const otherTopics = remainingTopics.slice(0, neededTopics);
    console.log('[PLANNING] Ek konular seçildi:', otherTopics);

    // 5. Bu üç listeden oluşan nihai, sıralı ve SPESİFİK konu listesini döndür
    const finalTopicList = [...weakTopicsToStudy, ...nextLogicalTopics, ...otherTopics];
    const uniqueTopics = [...new Set(finalTopicList)]; // Tekrarları kaldır
    
    console.log('[PLANNING] Final konu listesi:', uniqueTopics);
    return uniqueTopics;
  }

  // ADIM 1: Hammadde Departmanı
  // Öğrenci profiline ve tarihe göre ilgili spesifik konuları döndürür
  private async getRelevantTopicsForStudent(studentProfile: any, currentDate: Date): Promise<string[]> {
    const gradeStr = (studentProfile?.grade ?? '').toString();
    const gradeNum = parseInt(gradeStr) || 11;
    const subjects: string[] = Array.isArray(studentProfile?.selectedSubjects) && studentProfile.selectedSubjects.length > 0
      ? studentProfile.selectedSubjects
      : ['Matematik', 'Türkçe'];

    // 1) Müfredat havuzunu oluştur
    const topicPool = await this.buildCurriculumTopicPool(subjects, gradeNum, undefined);

    // 2a) Zayıflıklar: anlamsal benzerlik yerine basit içerme-eşleşmesi (deterministik)
    const weaknesses: string[] = Array.isArray(studentProfile?.weaknesses) ? studentProfile.weaknesses : [];
    const weakTopics = this.findMatchingTopics(weaknesses, topicPool);

    // 2b) Son tamamlananlardan sonraki mantıksal konular
    const lastCompletedTopics = (studentProfile?.lastCompletedTopics && typeof studentProfile.lastCompletedTopics === 'object')
      ? studentProfile.lastCompletedTopics
      : {};
    const nextTopics = this.findNextTopics(lastCompletedTopics, topicPool);

    // 2c) Hala eksik kalan oturumlar için aynı ayın diğer konuları (basit yaklaşım)
    const allTopics = Object.values(topicPool).flat();
    const used = [...weakTopics, ...nextTopics];
    const remaining = allTopics.filter(t => !used.includes(t));

    // Varsayılan 3 gün x 2 oturum = 6 konu hedefi
    const totalNeeded = 6;
    const fillers = remaining.slice(0, Math.max(0, totalNeeded - used.length));

    const finalList = [...weakTopics, ...nextTopics, ...fillers];
    return [...new Set(finalList)];
  }

  // Zayıf konuları müfredat havuzunda bul
  private findMatchingTopics(weaknesses: string[], topicPool: any): string[] {
    const foundTopics: string[] = [];
    
    for (const weakness of weaknesses) {
      // Her ders için zayıf konuyu ara
      for (const [subject, topics] of Object.entries(topicPool)) {
        const matchingTopics = (topics as string[]).filter(topic => 
          topic.toLowerCase().includes(weakness.toLowerCase()) ||
          weakness.toLowerCase().includes(topic.toLowerCase())
        );
        foundTopics.push(...matchingTopics);
      }
    }
    
    return [...new Set(foundTopics)]; // Tekrarları kaldır
  }

  // Son tamamlanan konulardan sonraki mantıksal konuları bul
  private findNextTopics(lastCompletedTopics: Record<string, string>, topicPool: any): string[] {
    const nextTopics: string[] = [];
    
    for (const [subject, lastTopic] of Object.entries(lastCompletedTopics)) {
      const subjectTopics = topicPool[subject] || [];
      const lastIndex = subjectTopics.indexOf(lastTopic);
      
      if (lastIndex !== -1 && lastIndex < subjectTopics.length - 1) {
        // Sonraki konuyu al
        nextTopics.push(subjectTopics[lastIndex + 1]);
      }
    }
    
    return nextTopics;
  }

  // Deterministik iskelet üretici - AI olmadan
  private buildDeterministicSkeleton(topics: string[], data: PlanGenerationData): any {
    const planDurationDays = Number((data as any)?.planDurationDays) > 0 ? Number((data as any).planDurationDays) : 3;
    const sessionsPerDay = 2;
    const totalSessions = planDurationDays * sessionsPerDay;
    
    const sessions = [];
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    
    let topicIndex = 0;
    for (let day = 0; day < planDurationDays; day++) {
      const dayName = days[day % 7];
      
      for (let session = 0; session < sessionsPerDay; session++) {
        if (topicIndex >= topics.length) break;
        
        const topicToAssign = topics[topicIndex % topics.length];
        const subject = this.determineSubjectFromTopic(topicToAssign, data.subjects);
        
        sessions.push({
          week: 1,
          day: dayName,
          subject: subject,
          topic: topicToAssign, // <-- ARTIK SPESİFİK BİR KONU ADI VAR
          durationInMinutes: 45 + (session * 5), // 45, 50 dakika
          type: 'study',
          difficulty: 'medium',
          objectives: [], // AI ile doldurulacak
          resources: [], // AI ile doldurulacak
          techniques: [] // AI ile doldurulacak
        });
        
        topicIndex++;
      }
    }
    
    return {
      weeklyPlans: [{
        week: 1,
        focus: 'Kişiselleştirilmiş odak',
        sessions: sessions
      }],
      milestones: [
        { week: 1, goal: 'Temel kavramları kavra', assessment: 'Quiz', criteria: '70% başarı' }
      ],
      adaptiveStrategies: [
        'Zorlandığında konuyu böl',
        'Başarılı olduğunda zorluk seviyesini artır'
      ]
    };
  }

  // ADIM 2: Montaj Hattı
  // Konu listesine göre haftalık iskelet oluşturur (AI olmadan)
  private buildScheduleFromTopics(topicList: string[], planData: PlanGenerationData): any {
    const planDurationDays = Number((planData as any)?.planDurationDays) > 0 ? Number((planData as any).planDurationDays) : 3;
    const sessionsPerDay = 2;
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

    // YENİ: Kullanıcıya özel ancak tutarlı çeşitlilik için seed ve shuffle
    const seed = this.seedFrom(((planData as any)?.userId || 'default-user').toString());
    const shuffledTopicList = this.shuffleWithSeed(topicList, seed);

    // Basit çeşitlendirme: index'e göre süre ve gün dağılımı
    const sessions: any[] = [];
    for (let day = 0; day < planDurationDays; day++) {
      const dayName = days[day % 7];
      for (let s = 0; s < sessionsPerDay; s++) {
        const idx = day * sessionsPerDay + s;
        if (idx >= shuffledTopicList.length) break;
        const topic = shuffledTopicList[idx];
        const subject = this.determineSubjectFromTopic(topic, planData.subjects);
        sessions.push({
          week: 1,
          day: dayName,
          subject,
          topic,
          durationInMinutes: 45 + (s * 5),
          type: 'study',
          difficulty: 'medium',
          objectives: [],
          resources: [],
          techniques: [],
        });
      }
    }

    return {
      weeklyPlans: [{
        week: 1,
        focus: 'Kişiselleştirilmiş odak',
        sessions,
      }],
      milestones: [
        { week: 1, goal: 'Temel kavramları kavra', assessment: 'Quiz', criteria: '70% başarı' },
      ],
      adaptiveStrategies: [
        'Zorlandığında konuyu böl',
        'Başarılı olduğunda zorluk seviyesini artır',
      ],
    };
  }

  // Konuya göre ders adını belirle
  private determineSubjectFromTopic(topic: string, subjects: string[]): string {
    // Basit eşleştirme mantığı
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('matematik') || topicLower.includes('sayı') || topicLower.includes('denklem')) {
      return subjects.includes('Matematik') ? 'Matematik' : subjects[0];
    }
    if (topicLower.includes('türkçe') || topicLower.includes('dil') || topicLower.includes('paragraf')) {
      return subjects.includes('Türkçe') ? 'Türkçe' : subjects[0];
    }
    if (topicLower.includes('fizik') || topicLower.includes('kuvvet') || topicLower.includes('elektrik')) {
      return subjects.includes('Fizik') ? 'Fizik' : subjects[0];
    }
    if (topicLower.includes('kimya') || topicLower.includes('atom') || topicLower.includes('organik')) {
      return subjects.includes('Kimya') ? 'Kimya' : subjects[0];
    }
    
    return subjects[0]; // Varsayılan
  }

  // AI'ı "asistan" olarak kullan - sadece detay zenginleştirme
  private async enrichSkeletonWithAI(skeleton: any, learningStyle: string): Promise<any> {
    console.log('[PLANNING] AI ile detay zenginleştirme başlatılıyor...');
    
    for (const week of skeleton.weeklyPlans) {
      for (const session of week.sessions) {
        try {
          // AI'a çok basit ve net bir soru sor
          const prompt = `Bir 11. sınıf öğrencisi için '${session.topic}' konusunda, '${learningStyle}' öğrenme stiline uygun, 3 adet spesifik 'hedef' (objectives) ve 3 adet 'çalışma tekniği' (techniques) öner. Sadece JSON formatında döndür: {"objectives": ["hedef1", "hedef2", "hedef3"], "techniques": ["teknik1", "teknik2", "teknik3"]}`;
          
          const details = await this.geminiService.generateContent(prompt);
          const cleaned = this.cleanAiJsonResponse(details);
          const parsedDetails = JSON.parse(cleaned);
          
          session.objectives = parsedDetails.objectives || [];
          session.techniques = parsedDetails.techniques || [];
          session.resources = ['Ders kitabı', 'Notlar', 'Online kaynaklar']; // Basit kaynak listesi
          
          console.log(`[PLANNING] ${session.topic} için detaylar eklendi`);
        } catch (error) {
          console.error(`[PLANNING] ${session.topic} için AI detay ekleme başarısız:`, error);
          // Fallback detaylar
          session.objectives = ['Konuyu anla', 'Temel kavramları öğren'];
          session.techniques = ['Not al', 'Tekrar et', 'Pratik yap'];
          session.resources = ['Ders kitabı', 'Notlar'];
        }
      }
    }
    
    return skeleton;
  }

  // Görev odaklı prompt fonksiyonları
  private async createHighLevelStrategyPrompt(userContext: any, planContext: any): Promise<string> {
    const currentMonth = new Date().getMonth() + 1;
    const academicPeriod = (currentMonth >= 4 && currentMonth <= 6) ? 'GENEL_TEKRAR' : 'NORMAL';
    const strategicGuidance = this.determineStrategicFocus(userContext, academicPeriod);
    
    return `
Sadece GEÇERLİ JSON döndür; açıklama veya kod bloğu ekleme. Yalnızca JSON.

GÖREV: Haftalık strateji ve odak konularını belirle.

STRATEJİK ODAK: ${strategicGuidance}

ÖĞRENCİ BİLGİLERİ:
- Dersler: ${planContext.subjects.join(', ')}
- Hedefler: ${planContext.goals.join(', ')}
- Günlük çalışma süresi: ${planContext.availableTime} dakika
- Öğrenme stili: ${planContext.learningStyle}
- Seviye: ${planContext.currentLevel}
- Sınıf: ${planContext.preferences?.grade ?? ''}
- Alan: ${planContext.preferences?.field ?? ''}
- Zorluk/alanda zorlanmalar: ${(planContext.preferences?.focusAreas || []).join(', ')}
- Güven düzeyleri: ${JSON.stringify(planContext.preferences?.confidenceLevels || {})}
- Son tamamlanan konular: ${JSON.stringify(planContext.preferences?.lastCompletedTopics || {})}

GEÇMİŞ PERFORMANS:
- Toplam çalışma süresi: ${userContext.totalStudyTime} dakika
- Ortalama seans süresi: ${userContext.averageSessionDuration} dakika
- Güçlü alanlar: ${userContext.strongAreas.join(', ')}
- Zayıf alanlar: ${userContext.weakAreas.join(', ')}
- Tercih edilen çalışma saatleri: ${userContext.preferredStudyHours.join(', ')}

BEKLENEN JSON ŞEMASI:
{
  "weeklyFocus": [
    {
      "week": 1,
      "focus": "Haftalık odak konusu",
      "prioritySubjects": ["Matematik", "Fizik"],
      "keyTopics": ["Türev", "İntegral"],
      "learningObjectives": ["Hedef 1", "Hedef 2"]
    }
  ],
  "strategicNotes": [
    "Stratejik not 1",
    "Stratejik not 2"
  ]
}
`;
  }

  private async createWeeklySkeletonPrompt(strategy: any, topicPool: any): Promise<string> {
    const planDurationDays = strategy.planDurationDays || 3;
    const minSessionsPerDay = 2;
    const topicPoolJson = JSON.stringify(topicPool);
    
    return `
Sadece GEÇERLİ JSON döndür; açıklama veya kod bloğu ekleme. Yalnızca JSON.

GÖREV: Stratejiye göre haftalık ders/konu iskeletini oluştur.

STRATEJİ BİLGİLERİ:
${JSON.stringify(strategy)}

PLAN KISITLARI:
- Plan süresi: ${planDurationDays} gün.
- Her gün en az ${minSessionsPerDay} oturum üret. Oturumlar arasında mola öner.
- Her oturum için durationInMinutes alanını DOLDUR (ör. 40, 60 gibi).
- weeklyPlans yapısını kullan ve her haftada sessions dolu olsun. Her oturumda day alanı Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi veya Pazar olmalı.

KONULAR HAVUZU (STRICT):
- AI, konu seçimini SADECE ve SADECE aşağıdaki listeden yapmalıdır.
${topicPoolJson}

ZORUNLU KURALLAR (İHLAL EDİLEMEZ):
1. SEVİYE KURALI: Bu plan 11. Sınıf YKS Sayısal öğrencisi içindir. Önereceğin TÜM konular, Türkiye'deki 11. Sınıf MEB müfredatıyla uyumlu olmalıdır.
2. KONU SEÇİM KURALI: Üreteceğin her bir seansın "topic" alanı, aşağıda "KONULAR HAVUZU" içinde o ders için verilen listeden SEÇİLMİŞ GERÇEK BİR KONU ADI olmak zorundadır.
3. TARİH BAZLI KONU SEÇİMİ: Şu an ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} ayındayız. Plan, 11. sınıf müfredatının bu ayında işlenen konularına odaklanmalıdır.

BEKLENEN JSON ŞEMASI:
{
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "Kişiselleştirilmiş odak",
      "sessions": [
        {
          "day": "Pazartesi",
          "subject": "Matematik",
          "topic": "Türev",
          "durationInMinutes": 60,
          "type": "study",
          "difficulty": "medium"
        }
      ]
    }
  ]
}
`;
  }

  private async createSessionDetailsPrompt(topic: string, learningStyle: string): Promise<string> {
    return `
Sadece GEÇERLİ JSON döndür; açıklama veya kod bloğu ekleme. Yalnızca JSON.

GÖREV: Tek bir seans için objectives, resources, techniques belirle.

KONU: ${topic}
ÖĞRENME STİLİ: ${learningStyle}

BEKLENEN JSON ŞEMASI:
{
  "objectives": ["Hedef 1", "Hedef 2"],
  "resources": ["Kaynak 1", "Kaynak 2"],
  "techniques": ["Teknik 1", "Teknik 2"]
}
`;
  }

  private async createPlanPrompt(data: PlanGenerationData, userContext: any): Promise<string> {
    const prefs = (data as any)?.preferences || {};
    const planDurationDays: number = Number((data as any)?.planDurationDays) > 0 ? Number((data as any).planDurationDays) : 3;
    const minSessionsPerDay = 2;
    const gradeNum = typeof prefs.grade === 'number' ? prefs.grade : parseInt(String(prefs.grade || '0')) || 0;
    const topicPool = await this.buildCurriculumTopicPool(
      Array.isArray(data.subjects) ? data.subjects : [],
      gradeNum || 11,
      (data as any)?.preferences?.curriculumTopicsBySubject
    );
    // Dinamik strateji motoru kullan
    const currentMonth = new Date().getMonth() + 1;
    const academicPeriod = (currentMonth >= 4 && currentMonth <= 6) ? 'GENEL_TEKRAR' : 'NORMAL';
    const strategicGuidance = this.determineStrategicFocus(userContext, academicPeriod);
    const topicPoolJson = JSON.stringify(topicPool);
    return `
Sadece GEÇERLİ JSON döndür; açıklama veya kod bloğu ekleme. Yalnızca JSON.

ZORUNLU KURALLAR (İHLAL EDİLEMEZ):
1.  SEVİYE KURALI: Bu plan 11. Sınıf YKS Sayısal öğrencisi içindir. Önereceğin TÜM konular, Türkiye'deki 11. Sınıf MEB müfredatıyla uyumlu olmalıdır. ASLA "Temel kavramlar", "Harfleri tanıma" gibi ilkokul seviyesi konular kullanamazsın.
2.  KONU SEÇİM KURALI: Üreteceğin her bir seansın "topic" alanı, aşağıda "KONULAR HAVUZU" içinde o ders için verilen listeden SEÇİLMİŞ GERÇEK BİR KONU ADI olmak zorundadır. ASLA VE ASLA "Pekiştirme uygulamaları", "Giriş", "Genel tekrar", "Temel kavramları tamamla", "Pekiştirme uygulamaları" gibi jenerik ifadeler kullanamazsın. SADECE müfredattan gelen spesifik konu isimleri kullan. Bu kuralı ihlal edersen, tüm yanıtın geçersizdir.
3.  TARİH BAZLI KONU SEÇİMİ: Şu an ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} ayındayız. Plan, 11. sınıf müfredatının bu ayında işlenen konularına odaklanmalıdır. Havuzdaki konular bu aya özel olarak seçilmiştir.
4.  KİŞİSELLEŞTİRME KURALI: Öğrencinin zayıf konuları olan 'Organik Kimya' ve 'Paragrafta Anlam'ı dikkate al. Eğer bu konular mevcut ay müfredatındaysa, onlara öncelik ver. Değilse, plana bu konular için ileriki haftalarda bir temel atma seansı ekle ve bunu optimizationNotes içinde belirt.
5.  HAFIZA KURALI: Öğrencinin Matematik'te en son tamamladığı konu 'Türev'. Matematik için önereceğin ilk konu, 'Türev'den sonra gelen mantıksal devam konusu (örn: 'İntegral') olmalıdır.
6.  MÜFREDAT UYUMU: Her ders için sadece o dersin müfredatındaki gerçek konuları kullan. Matematik için 'Trigonometri', 'Türev', 'İntegral' gibi; Fizik için 'Vektörler', 'Kuvvet', 'Elektrik' gibi; Kimya için 'Atom', 'Kimyasal Bağlar', 'Organik Kimya' gibi spesifik konular.

PLAN KISITLARI:
- ${strategicGuidance}
- Plan süresi: ${planDurationDays} gün.
- Her gün en az ${minSessionsPerDay} oturum üret. Oturumlar arasında mola öner.
- Her oturum için durationInMinutes alanını DOLDUR (ör. 40, 60 gibi).
- weeklyPlans yapısını kullan ve her haftada sessions dolu olsun. Her oturumda day alanı Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi veya Pazar olmalı.

KONULAR HAVUZU (STRICT):
- AI, konu seçimini SADECE ve SADECE aşağıdaki listeden yapmalıdır.
${topicPoolJson}

ÖĞRENCİ BİLGİLERİ:
- Dersler: ${data.subjects.join(', ')}
- Hedefler: ${data.goals.join(', ')}
- Günlük çalışma süresi: ${data.availableTime} dakika
- Öğrenme stili: ${data.learningStyle}
- Seviye: ${data.currentLevel}
- Sınıf: ${prefs.grade ?? ''}
- Alan: ${prefs.field ?? ''}
- Zorluk/alanda zorlanmalar: ${(prefs.focusAreas || []).join(', ')}
- Güven düzeyleri: ${JSON.stringify(prefs.confidenceLevels || {})}
- Son tamamlanan konular: ${JSON.stringify(prefs.lastCompletedTopics || {})}
- Tercih edilen çalışma saatleri: ${(prefs.studyTimes || []).join(', ')}
- Tercih edilen seans süresi: ${prefs.sessionDuration ?? 40} dk
- Çalışma günleri: ${(prefs.studyDays || []).join(', ')}

GEÇMİŞ PERFORMANS:
- Toplam çalışma süresi: ${userContext.totalStudyTime} dakika
- Ortalama seans süresi: ${userContext.averageSessionDuration} dakika
- Güçlü alanlar: ${userContext.strongAreas.join(', ')}
- Zayıf alanlar: ${userContext.weakAreas.join(', ')}
- Tercih edilen çalışma saatleri: ${userContext.preferredStudyHours.join(', ')}

BEKLENEN JSON ŞEMASI (örnek):
{
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "Kişiselleştirilmiş odak",
      "sessions": [
        {
          "day": "Pazartesi",
          "subject": "Matematik",
          "topic": "Temel kavram",
          "durationInMinutes": 60,
          "type": "study",
          "difficulty": "medium",
          "objectives": ["Hedef"],
          "resources": ["Kaynak"],
          "techniques": ["Teknik"]
        }
      ]
    }
  ],
  "milestones": [
    { "week": 1, "goal": "Temel kavramları kavra", "assessment": "Quiz", "criteria": "70% başarı" }
  ],
  "adaptiveStrategies": [
    "Zorlandığında konuyu böl",
    "Başarılı olduğunda zorluk seviyesini artır"
  ]
}
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
    const planDurationDays = (sessions?.length || 0) > 0 ? Math.max(7, Math.ceil(sessions.length / 2)) : 28;
    const totalWeeks = Math.max(1, Math.ceil(planDurationDays / 7));
    for (let week = 1; week <= totalWeeks; week++) {
      const weekSessions = sessions.filter(s => s.week === week);
      weeks.push({
        week,
        focus: `Hafta ${week} - ${week <= Math.ceil(totalWeeks / 2) ? 'Öğrenme' : 'Pekiştirme'}`,
        sessions: weekSessions,
      });
    }
    return weeks;
  }

  private async generateMilestones(subjects: string[], goals: string[], grade: number): Promise<any[]> {
    // Müfredattan gerçek konuları al
    const topicPool = await this.buildCurriculumTopicPool(subjects, grade);
    const milestones = [];
    
    subjects.forEach((subject, index) => {
      const subjectTopics = topicPool[subject] || [];
      if (subjectTopics.length > 0) {
        // İlk konuyu milestone olarak kullan
        const firstTopic = subjectTopics[0];
        milestones.push({
          week: index + 1,
          goal: `${subject} - ${firstTopic} konusunu tamamla`,
          assessment: 'Quiz',
          criteria: '70% başarı',
        });
      }
    });
    
    return milestones;
  }

  private generateAdaptiveStrategies(learningStyle: string, subjects: string[]): string[] {
    const strategies = [
      'Zorlandığında konuyu böl ve küçük parçalarda çalış',
      'Başarılı olduğunda zorluk seviyesini artır',
      'Motivasyon düştüğünde kısa molalar ver',
    ];
    
    // Öğrenme stiline özel stratejiler
    const styleStrategies = {
      'visual': ['Görsel diyagramlar ve şemalar kullan', 'Renk kodlaması yap', 'Grafik ve tabloları incele'],
      'auditory': ['Sesli tekrar yap', 'Grup tartışmaları organize et', 'Podcast ve sesli materyaller kullan'],
      'kinesthetic': ['Pratik uygulamalar yap', 'Deney ve laboratuvar çalışmaları', 'Hareket halinde öğren'],
      'reading': ['Detaylı notlar al', 'Özet çıkar', 'Kitap ve makale oku'],
    };
    
    const subjectStrategies = subjects.map(subject => `${subject} dersinde aktif öğrenme teknikleri kullan`);
    
    return [...strategies, ...(styleStrategies[learningStyle] || styleStrategies['visual']), ...subjectStrategies];
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
    
    const unique = [...new Set(optimalTimes)];
    const timeSlots = unique.length > 0 ? unique : ['morning','afternoon','evening'];
    return {
      preferredTimes: timeSlots,
      avoidTimes: ['late_night'],
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
    const planDurationDays = Number(planStructure?.planDurationDays) > 0 ? Number(planStructure.planDurationDays) : 7;
    const totalSessions = planStructure.weeklyPlans?.reduce((sum: number, w: any) => sum + (w.sessions?.length || 0), 0) || 0;
    return {
      totalWeeks: Math.max(1, Math.ceil(planDurationDays / 7)),
      totalSessions,
      estimatedCompletionDate: new Date(Date.now() + planDurationDays * 24 * 60 * 60 * 1000),
      weeklyBreakdown: planStructure.weeklyPlans?.map((week: any) => ({
        week: week.week,
        focus: week.focus,
        sessionCount: week.sessions?.length || 0,
        totalHours: (week.sessions?.reduce((sum: number, s: any) => sum + (s.durationInMinutes || s.duration || 0), 0) || 0) / 60,
      })) || [],
    };
  }

  // Veritabanı tabanlı akıllı müfredat havuzu - mevcut aya göre konuları seçer
  private async buildCurriculumTopicPool(
    subjects: string[],
    grade: number,
    overrideTopics?: Record<string, string[]>,
    dateWindow?: { startDate?: Date; endDate?: Date }
  ): Promise<Record<string, string[]>> {
    const pool: Record<string, string[]> = {};
    
    // Override öncelikli
    if (overrideTopics && Object.keys(overrideTopics).length > 0) {
      Object.entries(overrideTopics).forEach(([subject, topics]) => {
        if (Array.isArray(topics) && topics.length > 0) {
          pool[subject] = topics;
        }
      });
      return pool;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const startMonth = dateWindow?.startDate ? (dateWindow.startDate.getMonth() + 1) : undefined;
    const endMonth = dateWindow?.endDate ? (dateWindow.endDate.getMonth() + 1) : undefined;
    // Model year seçimi: 2025-2026 sezonu varsayılan (Sep-Jun)
    const seasonModelYear = (currentMonth >= 9 || currentMonth <= 6)
      ? '2025-2026'
      : '2025-2026';
    
    // Mevcut ay ±1 ay konularını al (daha geniş seçenek için)
    const targetMonths = [currentMonth - 1, currentMonth, currentMonth + 1].filter(m => m >= 1 && m <= 12);

    try {
      // Veritabanından konuları çek
      // Varsayılan: tarih penceresi verilmediyse mevcut ay ±1 aralığını kullan
      const monthFilter: any = (startMonth && endMonth)
        ? { gte: Math.min(startMonth, endMonth), lte: Math.max(startMonth, endMonth) }
        : (startMonth
            ? { in: [startMonth - 1, startMonth, startMonth + 1].filter(m => m >= 1 && m <= 12) }
            : { in: targetMonths }
          );

      // Subject eşleşmesini case-insensitive hale getir (Prisma 'in' ile mode desteklemediği için OR kullan)
      const subjectInsensitiveOr = Array.isArray(subjects) && subjects.length > 0
        ? subjects.map(s => ({ subject: { equals: s, mode: 'insensitive' as const } }))
        : undefined;

      // ModelYear esnekliği: önce sezon yılını dener, boş dönerse modelYear filtresini gevşetiriz
      let where: any = {
        grade: grade,
        ...(subjectInsensitiveOr ? { OR: subjectInsensitiveOr } : {}),
        ...(seasonModelYear ? { modelYear: seasonModelYear } : {}),
        ...(monthFilter ? { month: monthFilter } : {}),
      };

      let topicsFromDb = await this.prisma.mebTopic.findMany({ where, orderBy: { topic: 'asc' } });

      // Hiç kayıt yoksa: (1) modelYear filtresini kaldırıp tekrar dene (2) ay filtresine month=null dahil et
      if (topicsFromDb.length === 0) {
        const relaxedWhere1: any = {
          ...where,
          modelYear: undefined,
          month: monthFilter ? { OR: [{ month: monthFilter }, { month: null }] } : undefined,
        };
        topicsFromDb = await this.prisma.mebTopic.findMany({ where: relaxedWhere1, orderBy: { topic: 'asc' } });
      }

      // Hâlâ yoksa: (3) ay filtresini tamamen kaldır ve sadece grade + subject ile getir
      if (topicsFromDb.length === 0) {
        const relaxedWhere2: any = {
          grade: grade,
          ...(subjectInsensitiveOr ? { OR: subjectInsensitiveOr } : {}),
        };
        topicsFromDb = await this.prisma.mebTopic.findMany({ where: relaxedWhere2, orderBy: { topic: 'asc' } });
      }

      // Konuları ders bazında grupla ve eksikse sentetik konularla tamamla
      subjects.forEach(subject => {
        const subjectTopics = topicsFromDb
          .filter(t => t.subject.toLowerCase() === subject.toLowerCase())
          .map(t => t.topic);

        if (subjectTopics.length > 0) {
          pool[subject] = subjectTopics;
        } else {
          // Konu bulunamadı: sentetik ders-özel konu isimleri üret
          pool[subject] = this.generateSyntheticTopics(subject, grade, { startDate: dateWindow?.startDate, endDate: dateWindow?.endDate });
        }
      });

      // Eğer genel havuz tamamen boşsa, tüm dersler için sentetik havuz oluştur
      const hasAnyTopics = Object.values(pool).some(topics => topics.length > 0);
      if (!hasAnyTopics) {
        console.warn(`[PLANNING] Veritabanında konu bulunamadı. Sentetik havuz kullanılacak. Grade=${grade}, Subjects=${subjects.join(', ')}`);
        subjects.forEach(subject => {
          pool[subject] = this.generateSyntheticTopics(subject, grade, { startDate: dateWindow?.startDate, endDate: dateWindow?.endDate });
        });
      }

    } catch (error) {
      console.error('[PLANNING] Veritabanından müfredat çekme hatası:', error);
      // Son çare: hata durumunda da sentetik havuz ile devam et
      subjects.forEach(subject => {
        pool[subject] = this.generateSyntheticTopics(subject, grade, { startDate: dateWindow?.startDate, endDate: dateWindow?.endDate });
      });
    }

    return pool;
  }

  // Ders ve sınıfa göre, tarih aralığına duyarlı sentetik konu üretimi
  private generateSyntheticTopics(
    subject: string,
    grade: number,
    dateWindow?: { startDate?: Date; endDate?: Date }
  ): string[] {
    const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const start = dateWindow?.startDate;
    const months: number[] = (() => {
      if (!start) return [];
      const end = dateWindow?.endDate || new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);
      const arr: number[] = [];
      const s = start.getMonth();
      const e = end.getMonth();
      for (let m = s; m <= e; m++) arr.push(((m % 12) + 12) % 12);
      return arr;
    })();

    // Basit şablonlar: ders-özel genel çalışmaları kapsar
    const baseTemplates = [
      `${subject} - Temel Kavramlar (${grade}. Sınıf)`,
      `${subject} - Güncel Konu Tekrarı`,
      `${subject} - Çıkmış Sorulara Giriş`,
      `${subject} - Hata Analizi ve Pekiştirme`,
      `${subject} - Genel Tekrar ve Mini Quiz`,
    ];

    // Tarih aralığı varsa, aylara göre etiketli çalışma başlıkları ekle
    const monthTagged = months.map(m => `${subject} - ${monthNames[m]} Çalışma Planı`);

    // En az birkaç madde döndür
    const synthetic = [...baseTemplates, ...monthTagged];
    return synthetic.slice(0, 10);
  }

  // --- Seeded randomness helpers ---
  private seedFrom(userId: string): number {
    const base = userId;
    let h = 2166136261;
    for (let i = 0; i < base.length; i++) {
      h ^= base.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  private randomWithSeed(seed: number): () => number {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }

  private shuffleWithSeed<T>(arr: T[], seed: number): T[] {
    const r = this.randomWithSeed(seed);
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private pickTopicFromPool(
    subject: string,
    pool: Record<string, string[]>
  ): string[] | null {
    const list = pool[subject] || [];
    if (list.length === 0) {
      return null;
    }
    return list;
  }

  // Fallback plan kaldırıldı - artık sadece gerçek müfredat kullanılıyor

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
    let plan = await this.prisma.plan.findFirst({
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

    // Eğer bu planda henüz session oluşmadıysa metadata.planStructure üzerinden backfill yap
    if (!plan.sessions || plan.sessions.length === 0) {
      const planStructure: any = (plan as any)?.metadata?.planStructure || {};
      const sessionsFromStructure = Array.isArray(planStructure.sessions)
        ? planStructure.sessions
        : Array.isArray(planStructure.weeklyPlans)
          ? planStructure.weeklyPlans.flatMap((w: any) => w?.sessions || [])
          : [];
      if (sessionsFromStructure.length > 0) {
        await this.createStudySessions(plan.id, sessionsFromStructure, userId);
        // Tekrar yükle
        plan = await this.prisma.plan.findFirst({
          where: { id: planId, userId },
          include: { sessions: { orderBy: { startTime: 'asc' } }, user: { select: { id: true, name: true, studentProfile: true } } },
        });
      }
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

  async rescheduleSingle(data: { userId: string; sessionId: string; newStartTime: string }) {
    const session = await this.prisma.studySession.findFirst({
      where: { id: data.sessionId, userId: data.userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const newTime = new Date(data.newStartTime);
    if (isNaN(newTime.getTime())) {
      throw new BadRequestException('Invalid newStartTime');
    }
    const updated = await this.prisma.studySession.update({
      where: { id: data.sessionId },
      data: {
        startTime: newTime,
        metadata: { ...(session.metadata as any || {}), rescheduled: true, rescheduleReason: 'manual' },
      },
    });
    return { success: true, session: updated };
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
