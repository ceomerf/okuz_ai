import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlanningService } from './planning.service';

@Injectable()
export class ReplanService {
  private readonly logger = new Logger(ReplanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planningService: PlanningService,
  ) {}

  // Her gece 02:00'de günlük kapanış analizi
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyReevaluationJob() {
    this.logger.log('🕑 Daily re-evaluation job started');
    await this.reEvaluateAndAdjustPlans('daily');
  }

  // Her pazartesi 03:00'te haftalık ayarlamalar
  @Cron(CronExpression.EVERY_WEEK)
  async weeklyReevaluationJob() {
    this.logger.log('📅 Weekly re-evaluation job started');
    await this.reEvaluateAndAdjustPlans('weekly');
  }

  // Çekirdek metot: son dönemi analiz et ve gelecek haftayı ayarla
  async reEvaluateAndAdjustPlans(scope: 'daily' | 'weekly' = 'weekly') {
    // Aktif planı olan kullanıcıları bul
    const activePlans = await this.prisma.plan.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    for (const plan of activePlans) {
      const userId = plan.userId;
      try {
        // Bağlamı analiz et (son hafta/son gün metrikleri için mevcut metod kullanılır)
        const context = await (this.planningService as any).analyzeUserContext(userId);

        // Basit kurallar: başarı yüksek → süre azalt, zorluk artır; başarı düşük → süre artır, tekrar ekle
        const subjectPerf = context.subjectPerformance || {};
        const adjustments: Array<{ subject: string; durationFactor: number; difficultyDelta: number; addReview: boolean }>
          = [];

        Object.keys(subjectPerf).forEach((key) => {
          const perf = subjectPerf[key] || 0;
          if (perf >= 85) {
            adjustments.push({ subject: key, durationFactor: 0.9, difficultyDelta: +1, addReview: false });
          } else if (perf < 60) {
            adjustments.push({ subject: key, durationFactor: 1.2, difficultyDelta: -1, addReview: true });
          }
        });

        if (adjustments.length === 0) continue;

        // Gelecek hafta aralığını belirle
        const now = new Date();
        const startOfNextWeek = new Date(now);
        const day = startOfNextWeek.getDay();
        const diffToMonday = (8 - (day === 0 ? 7 : day)) % 7; // Pazartesi için
        startOfNextWeek.setDate(startOfNextWeek.getDate() + (scope === 'weekly' ? diffToMonday : 1));
        startOfNextWeek.setHours(0,0,0,0);
        const endOfNextWeek = new Date(startOfNextWeek);
        endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

        // Bu planın gelecek haftaya ait seanslarını çek
        const sessions = await this.prisma.studySession.findMany({
          where: {
            userId,
            planId: plan.id,
            startTime: { gte: startOfNextWeek, lt: endOfNextWeek },
          },
        });

        const difficultyLevels = ['easy','medium','hard','expert'];
        const clampDifficulty = (d?: string, delta?: number) => {
          const idx = Math.max(0, Math.min(difficultyLevels.length - 1, Math.max(0, difficultyLevels.indexOf((d || 'medium').toLowerCase())) + (delta || 0)));
          return difficultyLevels[idx];
        };

        // Ayarlamaları uygula
        for (const sess of sessions) {
          const adj = adjustments.find(a => (sess.subject || '').toLowerCase() === a.subject.toLowerCase());
          if (!adj) continue;

          const newDuration = Math.max(20, Math.round((sess.duration || 40) * adj.durationFactor));
          const newMeta = {
            ...(sess.metadata as any || {}),
            difficulty: clampDifficulty((sess.metadata as any)?.difficulty, adj.difficultyDelta),
            adjustedAt: new Date(),
            adjustmentReason: 'periodic_replan',
          };

          await this.prisma.studySession.update({
            where: { id: sess.id },
            data: { duration: newDuration, metadata: newMeta as any },
          });

          // Başarısı düşük alanlar için ek tekrar seansı ekle
          if (adj.addReview) {
            const extraStart = new Date(sess.startTime);
            extraStart.setDate(extraStart.getDate() + 1);
            await this.prisma.studySession.create({
              data: {
                planId: plan.id,
                userId,
                subject: sess.subject,
                topic: sess.topic,
                duration: Math.max(30, Math.floor((sess.duration || 40) * 0.8)),
                startTime: extraStart,
                metadata: { type: 'review', generatedBy: 'replan', baseSessionId: sess.id },
              },
            });
          }
        }

        this.logger.log(`✅ Adjusted plan for user ${userId} with ${adjustments.length} subject adjustments`);
      } catch (e) {
        this.logger.error(`❌ Replan failed for user ${userId}: ${e}`);
      }
    }
  }
}


