import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlanningService } from './planning.service';
import { QueueService } from '../services/queue.service';
import { MetricsService } from '../monitoring/metrics.service';
import IORedis from 'ioredis';

@Injectable()
export class ReplanService {
  private readonly logger = new Logger(ReplanService.name);
  private readonly redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

  constructor(
    private readonly prisma: PrismaService,
    private readonly planningService: PlanningService,
    private readonly queue: QueueService,
    private readonly metrics: MetricsService,
  ) {}

  // Her gece 02:00'de günlük kapanış analizi
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyReevaluationJob() {
    const lockKey = 'cron:dailyReevaluationJob:lock';
    const locked = await this.redis.set(lockKey, '1', 'EX', 3600, 'NX');
    if (locked !== 'OK') {
      this.logger.warn('Daily re-evaluation job is already running. Skipping.');
      return;
    }
    const logCtx = { job: 'dailyReevaluation', startedAt: new Date().toISOString() };
    const startTime = Date.now();
    this.logger.log(JSON.stringify({ level: 'info', msg: 'job_started', ...logCtx }));
    
    try {
      await this.enqueueReevaluationJobs('daily');
      const duration = Date.now() - startTime;
      this.metrics.recordCronJobDuration('dailyReevaluation', duration, true);
      this.logger.log(JSON.stringify({ level: 'info', msg: 'job_completed', ...logCtx, completedAt: new Date().toISOString() }));
    } catch (e) {
      const duration = Date.now() - startTime;
      this.metrics.recordCronJobDuration('dailyReevaluation', duration, false);
      this.logger.error(JSON.stringify({ level: 'error', msg: 'job_failed', ...logCtx, error: (e as any)?.message || String(e) }));
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // Her pazartesi 03:00'te haftalık ayarlamalar
  @Cron(CronExpression.EVERY_WEEK)
  async weeklyReevaluationJob() {
    const lockKey = 'cron:weeklyReevaluationJob:lock';
    const locked = await this.redis.set(lockKey, '1', 'EX', 7200, 'NX');
    if (locked !== 'OK') {
      this.logger.warn('Weekly re-evaluation job is already running. Skipping.');
      return;
    }
    const logCtx = { job: 'weeklyReevaluation', startedAt: new Date().toISOString() };
    const startTime = Date.now();
    this.logger.log(JSON.stringify({ level: 'info', msg: 'job_started', ...logCtx }));
    
    try {
      await this.enqueueReevaluationJobs('weekly');
      const duration = Date.now() - startTime;
      this.metrics.recordCronJobDuration('weeklyReevaluation', duration, true);
      this.logger.log(JSON.stringify({ level: 'info', msg: 'job_completed', ...logCtx, completedAt: new Date().toISOString() }));
    } catch (e) {
      const duration = Date.now() - startTime;
      this.metrics.recordCronJobDuration('weeklyReevaluation', duration, false);
      this.logger.error(JSON.stringify({ level: 'error', msg: 'job_failed', ...logCtx, error: (e as any)?.message || String(e) }));
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // Kuyruğa ekleme: kullanıcı başına job oluştur
  async enqueueReevaluationJobs(scope: 'daily' | 'weekly' = 'weekly') {
    const activePlans = await this.prisma.plan.findMany({
      where: { isActive: true },
      select: { id: true, userId: true },
    });
    for (const plan of activePlans) {
      // Idempotency: aynı kullanıcı/plan/scope için aynı zaman penceresinde tek iş
      const bucket = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const jobId = `${scope}:${plan.userId}:${plan.id}:${bucket}`;
      await this.queue.addJob(
        'replan',
        { scope, userId: plan.userId, planId: plan.id },
        { removeOnComplete: 1000, removeOnFail: 1000, jobId }
      );
    }
  }

  // Worker tarafında kullanılacak işleyici (ayrı süreçte de kullanılabilir)
  async processReevaluationJob(payload: { scope: 'daily' | 'weekly'; userId: string; planId: string }) {
    const { scope, userId, planId } = payload;
    try {
      // Bağlamı analiz et (son hafta/son gün metrikleri için mevcut metod kullanılır)
      const context = await (this.planningService as any).analyzeUserContext(userId);

        // Basit kurallar: başarı yüksek → süre azalt, zorluk artır; başarı düşük → süre artır, tekrar ekle
        const subjectPerf = context.subjectPerformance || {};
        const adjustments: Array<{ subject: string; durationFactor: number; difficultyDelta: number; addReview: boolean }>
          = [];

        for (const key of Object.keys(subjectPerf)) {
          const perf = subjectPerf[key] || 0;
          if (perf >= 85) {
            adjustments.push({ subject: key, durationFactor: 0.9, difficultyDelta: +1, addReview: false });
          } else if (perf < 60) {
            adjustments.push({ subject: key, durationFactor: 1.2, difficultyDelta: -1, addReview: true });
          }
        }

        if (adjustments.length === 0) return;

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
            planId,
            startTime: { gte: startOfNextWeek, lt: endOfNextWeek },
          },
        });

        // Uyum yüzdesi: planlanan vs. tamamlanan süre/oturum
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => (s as any).isCompleted).length;
        const plannedMinutes = sessions.reduce((sum, s) => sum + ((s as any).duration || 0), 0);
        const actualMinutes = sessions.filter(s => (s as any).isCompleted).reduce((sum, s) => sum + ((s as any).duration || 0), 0);
        const compliance = {
          sessionCompletionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
          timeCompletionRate: plannedMinutes > 0 ? Math.round((actualMinutes / plannedMinutes) * 100) : 0,
        };

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
            data: { duration: newDuration, metadata: { ...(newMeta as any), compliance } as any },
          });

          // Başarısı düşük alanlar için ek tekrar seansı ekle
          if (adj.addReview) {
            const extraStart = new Date(sess.startTime);
            extraStart.setDate(extraStart.getDate() + 1);
            await this.prisma.studySession.create({
              data: {
                planId,
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
      this.logger.log(JSON.stringify({ level: 'info', msg: 'plan_adjusted', userId, planId, adjustmentCount: adjustments.length }));
      
      // Proaktif bildirim: program değişikliği
      try {
        const realtime = (this as any).realtimeGateway;
        if (realtime?.publishUserNotification) {
          realtime.publishUserNotification(userId, {
            type: 'schedule_updated',
            title: 'Program Güncellendi',
            message: 'Yarının programı performansınıza göre güncellendi.',
            priority: 'low',
          });
        }
      } catch (e) {
        this.logger.warn(JSON.stringify({ level: 'warn', msg: 'realtime_notification_failed', userId, planId, error: (e as any)?.message || String(e) }));
      }
    } catch (e) {
      this.logger.error(JSON.stringify({ level: 'error', msg: 'plan_adjust_failed', userId, planId, error: (e as any)?.message || String(e) }));
    }
  }
}


