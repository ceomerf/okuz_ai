import { Injectable, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class PlanValidationService {
  
  // AI plan yapısı doğrulama şemaları
  private readonly aiSessionSchema = z.object({
    subject: z.string().min(1),
    topic: z.string().min(1),
    durationInMinutes: z.number().int().positive(),
    type: z.string().min(1).transform((val) => {
      const lowerVal = (val || 'study').toLowerCase();
      return ['study', 'review', 'practice', 'exam'].includes(lowerVal) ? lowerVal : 'study';
    }),
    difficulty: z.string().optional(),
    week: z.number().int().positive(),
    day: z.string().min(1),
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
    weeklyPlans: z.array(this.aiWeeklyPlanSchema).min(1),
    milestones: z.array(z.object({
      week: z.number().int().positive(),
      goal: z.string().min(1),
      assessment: z.string().min(1),
      criteria: z.string().min(1),
    })).min(1),
    adaptiveStrategies: z.array(z.string()).min(1),
  });

  /**
   * Plan verilerini doğrular
   */
  validatePlan(planData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Temel alanları kontrol et
      if (!planData.title || planData.title.trim().length === 0) {
        errors.push('Plan başlığı gerekli');
      }

      if (!planData.subjects || !Array.isArray(planData.subjects) || planData.subjects.length === 0) {
        errors.push('En az bir ders seçilmelidir');
      }

      if (!planData.goals || !Array.isArray(planData.goals) || planData.goals.length === 0) {
        errors.push('En az bir hedef belirtilmelidir');
      }

      if (planData.startDate && planData.endDate) {
        const startDate = new Date(planData.startDate);
        const endDate = new Date(planData.endDate);
        
        if (startDate >= endDate) {
          errors.push('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
        }
      }

      // AI plan yapısını doğrula
      if (planData.mode === 'ai' && planData.weeklyPlans) {
        const aiValidation = this.validateAiPlanStructure(planData);
        if (!aiValidation.isValid) {
          errors.push(...aiValidation.errors);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Plan doğrulama sırasında hata oluştu'],
      };
    }
  }

  /**
   * AI plan yapısını doğrular
   */
  validateAiPlanStructure(planData: any): { isValid: boolean; errors: string[] } {
    try {
      this.aiPlanSchema.parse(planData);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return {
        isValid: false,
        errors: ['AI plan yapısı geçersiz'],
      };
    }
  }

  /**
   * Study session verilerini doğrular
   */
  validateStudySession(sessionData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!sessionData.subject || sessionData.subject.trim().length === 0) {
      errors.push('Ders adı gerekli');
    }

    if (!sessionData.topic || sessionData.topic.trim().length === 0) {
      errors.push('Konu adı gerekli');
    }

    if (!sessionData.startTime) {
      errors.push('Başlangıç zamanı gerekli');
    } else {
      const startTime = new Date(sessionData.startTime);
      if (isNaN(startTime.getTime())) {
        errors.push('Geçerli bir başlangıç zamanı gerekli');
      }
    }

    if (!sessionData.duration || sessionData.duration <= 0) {
      errors.push('Geçerli bir süre gerekli (dakika)');
    }

    if (sessionData.duration && sessionData.duration > 300) {
      errors.push('Çalışma süresi 5 saatten fazla olamaz');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Plan güncelleme verilerini doğrular
   */
  validatePlanUpdate(updateData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Sadece güncellenebilir alanları kontrol et
    const allowedFields = ['title', 'description', 'subjects', 'goals', 'isActive'];
    const providedFields = Object.keys(updateData);
    
    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      errors.push(`Bu alanlar güncellenemez: ${invalidFields.join(', ')}`);
    }

    if (updateData.title !== undefined && (!updateData.title || updateData.title.trim().length === 0)) {
      errors.push('Plan başlığı boş olamaz');
    }

    if (updateData.subjects !== undefined && (!Array.isArray(updateData.subjects) || updateData.subjects.length === 0)) {
      errors.push('En az bir ders seçilmelidir');
    }

    if (updateData.goals !== undefined && (!Array.isArray(updateData.goals) || updateData.goals.length === 0)) {
      errors.push('En az bir hedef belirtilmelidir');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * İş kurallarını kontrol eder
   */
  assertBusinessRules(planData: any): any {
    const errors: string[] = [];

    // Maksimum plan süresi kontrolü
    if (planData.planDurationWeeks && planData.planDurationWeeks > 52) {
      errors.push('Plan süresi 52 haftadan fazla olamaz');
    }

    // Minimum plan süresi kontrolü
    if (planData.planDurationWeeks && planData.planDurationWeeks < 1) {
      errors.push('Plan süresi en az 1 hafta olmalıdır');
    }

    // Günlük maksimum çalışma süresi kontrolü
    if (planData.dailyMaxMinutes && planData.dailyMaxMinutes > 480) {
      errors.push('Günlük maksimum çalışma süresi 8 saatten fazla olamaz');
    }

    // Ders sayısı kontrolü
    if (planData.subjects && planData.subjects.length > 10) {
      errors.push('En fazla 10 ders seçilebilir');
    }

    // Yük dengesi: günlük toplam 6 saati aşmasın
    const sessions = Array.isArray((planData as any)?.sessions) ? (planData as any).sessions : [];
    const perDay: Record<string, number> = {};
    sessions.forEach((s: any) => {
      const day = (s.day || 'unknown').toString().toLowerCase();
      perDay[day] = (perDay[day] || 0) + (s.duration || s.durationInMinutes || 0);
    });
    Object.entries(perDay).forEach(([day, total]) => {
      if (total > 6 * 60) {
        errors.push(`Günlük toplam süre çok yüksek (${day}: ${total} dk)`);
      }
    });

    // Basit tekrar/önşart uyarısı: aynı gün aynı konu aşırı tekrar
    const topicSeq = sessions.map((s: any) => `${s.subject}::${s.topic}::${(s.day || '').toString().toLowerCase()}`);
    const seen = new Set<string>();
    for (const key of topicSeq) {
      if (seen.has(key)) {
        errors.push('Aynı gün aynı konu aşırı tekrar içeriyor');
        break;
      }
      seen.add(key);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Session'ları doğrular
   */
  validateSessions(sessions: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(sessions)) {
      errors.push('Sessions bir dizi olmalıdır');
      return { isValid: false, errors };
    }

    if (sessions.length === 0) {
      errors.push('En az bir çalışma seansı gerekli');
      return { isValid: false, errors };
    }

    sessions.forEach((session, index) => {
      const sessionValidation = this.validateStudySession(session);
      if (!sessionValidation.isValid) {
        errors.push(`Session ${index + 1}: ${sessionValidation.errors.join(', ')}`);
      }
    });

    // Zaman çakışması kontrolü
    const timeConflicts = this.checkTimeConflicts(sessions);
    if (timeConflicts.length > 0) {
      errors.push(`Zaman çakışmaları: ${timeConflicts.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Zaman çakışmalarını kontrol eder
   */
  private checkTimeConflicts(sessions: any[]): string[] {
    const conflicts: string[] = [];
    const sessionTimes: Array<{ start: Date; end: Date; index: number }> = [];

    sessions.forEach((session, index) => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(startTime.getTime() + (session.duration || 0) * 60000);
      
      sessionTimes.push({ start: startTime, end: endTime, index });
    });

    // Her session'ı diğerleriyle karşılaştır
    for (let i = 0; i < sessionTimes.length; i++) {
      for (let j = i + 1; j < sessionTimes.length; j++) {
        const session1 = sessionTimes[i];
        const session2 = sessionTimes[j];

        if (this.isTimeOverlap(session1, session2)) {
          conflicts.push(`Session ${session1.index + 1} ve Session ${session2.index + 1} çakışıyor`);
        }
      }
    }

    return conflicts;
  }

  /**
   * İki zaman aralığının çakışıp çakışmadığını kontrol eder
   */
  private isTimeOverlap(session1: { start: Date; end: Date }, session2: { start: Date; end: Date }): boolean {
    return session1.start < session2.end && session2.start < session1.end;
  }

  /**
   * JSON yanıtını temizler
   */
  cleanAiJsonResponse(text: string): string {
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

  /**
   * İlk JSON bloğunu çıkarır
   */
  extractFirstJsonBlock(text: string): string | null {
    const firstBrace = text.indexOf('{');
    if (firstBrace === -1) return null;

    let braceCount = 0;
    let endIndex = firstBrace;

    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    return text.substring(firstBrace, endIndex + 1);
  }
}