import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
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

@Injectable()
export class PlanValidationService {
  private readonly logger = new Logger(PlanValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plan yapısını doğrula
   */
  validatePlan(plan: PlanStructure): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Temel alanlar kontrolü
    if (!plan.title || plan.title.trim().length === 0) {
      errors.push('Plan başlığı boş olamaz');
    }

    if (!plan.description || plan.description.trim().length === 0) {
      warnings.push('Plan açıklaması boş');
    }

    if (!plan.subjects || plan.subjects.length === 0) {
      errors.push('En az bir ders seçilmelidir');
    }

    if (!plan.goals || plan.goals.length === 0) {
      warnings.push('Hedefler belirtilmedi');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Plan güncelleme verilerini doğrula
   */
  validatePlanUpdate(data: any): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Güncelleme verilerini kontrol et
    if (data.title && data.title.trim().length === 0) {
      errors.push('Plan başlığı boş olamaz');
    }

    if (data.subjects && (!Array.isArray(data.subjects) || data.subjects.length === 0)) {
      errors.push('En az bir ders seçilmelidir');
    }

    if (data.goals && (!Array.isArray(data.goals) || data.goals.length === 0)) {
      warnings.push('Hedefler belirtilmedi');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Oturum yapısını doğrula
   */
  validateSession(session: SessionStructure): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!session.subject || session.subject.trim().length === 0) {
      errors.push('Ders adı boş olamaz');
    }

    if (!session.topic || session.topic.trim().length === 0) {
      errors.push('Konu adı boş olamaz');
    }

    if (!session.duration || session.duration <= 0) {
      errors.push('Süre pozitif bir değer olmalıdır');
    }

    if (session.duration > 300) {
      warnings.push('Oturum süresi çok uzun (5 saatten fazla)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Plan karmaşıklığını değerlendir
   */
  assessPlanComplexity(plan: PlanStructure): {
    complexity: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  } {
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Ders sayısına göre karmaşıklık
    if (plan.subjects.length > 5) {
      factors.push('Çok fazla ders');
      recommendations.push('Ders sayısını azaltmayı düşünün');
    }

    // Hedef sayısına göre karmaşıklık
    if (plan.goals.length > 10) {
      factors.push('Çok fazla hedef');
      recommendations.push('Hedefleri öncelik sırasına koyun');
    }

    // Süreye göre karmaşıklık
    if (plan.duration && plan.duration > 30) {
      factors.push('Uzun süreli plan');
      recommendations.push('Planı daha küçük parçalara bölün');
    }

    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (factors.length >= 3) {
      complexity = 'high';
    } else if (factors.length >= 1) {
      complexity = 'medium';
    }

    return {
      complexity,
      factors,
      recommendations
    };
  }

  /**
   * Plan uyumluluğunu kontrol et
   */
  async checkPlanCompatibility(userId: string, plan: PlanStructure): Promise<PlanValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Kullanıcının mevcut planlarını kontrol et
      const existingPlans = await (this.prisma as any).plan.findMany({
        where: {
          userId,
          isActive: true
        }
      });

      if (existingPlans.length > 0) {
        warnings.push('Aktif planlar mevcut');
        suggestions.push('Mevcut planları tamamladıktan sonra yeni plan oluşturun');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
    } catch (error) {
      this.logger.error(`Plan compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors: ['Plan uyumluluk kontrolü başarısız'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Birden fazla oturumu doğrula
   */
  validateSessions(sessions: SessionStructure[]): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    sessions.forEach((session, index) => {
      const sessionValidation = this.validateSession(session);
      if (!sessionValidation.isValid) {
        errors.push(`Session ${index + 1}: ${sessionValidation.errors.join(', ')}`);
      }
      warnings.push(...sessionValidation.warnings.map(w => `Session ${index + 1}: ${w}`));
      suggestions.push(...sessionValidation.suggestions.map(s => `Session ${index + 1}: ${s}`));
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Kullanıcı için plan doğrulama
   */
  async validatePlanForUser(plan: PlanStructure, userId: string): Promise<PlanValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Temel plan doğrulama
      const basicValidation = this.validatePlan(plan);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);
      suggestions.push(...basicValidation.suggestions);

      // Kullanıcı uyumluluk kontrolü
      const compatibilityCheck = await this.checkPlanCompatibility(userId, plan);
      if (!compatibilityCheck.isValid) {
        errors.push(...compatibilityCheck.errors);
      }
      warnings.push(...compatibilityCheck.warnings);
      suggestions.push(...compatibilityCheck.suggestions);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
    } catch (error) {
      this.logger.error(`Plan validation for user failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors: ['Plan doğrulama başarısız'],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Optimizasyon önerileri oluştur
   */
  generateOptimizationSuggestions(plan: PlanStructure): string[] {
    const suggestions: string[] = [];

    // Ders sayısı kontrolü
    if (plan.subjects.length > 5) {
      suggestions.push('Çok fazla ders seçilmiş. Ders sayısını azaltmayı düşünün.');
    }

    // Hedef kontrolü
    if (plan.goals.length > 10) {
      suggestions.push('Çok fazla hedef belirlenmiş. Hedefleri öncelik sırasına koyun.');
    }

    // Süre kontrolü
    if (plan.duration && plan.duration > 30) {
      suggestions.push('Uzun süreli plan. Planı daha küçük parçalara bölün.');
    }

    return suggestions;
  }
}