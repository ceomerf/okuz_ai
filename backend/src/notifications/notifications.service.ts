import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async sendNotification(notificationData: any) {
    return { message: 'Send notification implementation' };
  }

  async getNotifications(userId: string) {
    return { message: 'Get notifications implementation' };
  }

  async markAsRead(notificationId: string) {
    return { message: 'Mark as read implementation' };
  }

  async deleteNotification(notificationId: string) {
    return { message: 'Delete notification implementation' };
  }

  // Seans öncesi 10 dk hatırlatıcı
  @Cron(CronExpression.EVERY_MINUTE)
  async sessionReminders() {
    const now = new Date();
    const inTen = new Date(now.getTime() + 10 * 60 * 1000);
    const sessions = await (this.prisma as any).studySession.findMany({
      where: {
        startTime: { gte: now, lte: inTen },
        isCompleted: false,
      },
      select: { id: true, userId: true, subject: true, topic: true, startTime: true },
    });
    for (const s of sessions) {
      try {
        // Burada gerçek push/WS entegrasyonu çağrılabilir
        this.logger.log(`Reminder -> user:${s.userId} subject:${s.subject} topic:${s.topic}`);
      } catch (e) {
        this.logger.warn(`Reminder failed: ${(e as any)?.message || e}`);
      }
    }
  }

  // Gün sonu çalıştım/çalışmadım teyidi (22:00)
  @Cron('0 22 * * *')
  async dailyCheckIn() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const sessions = await (this.prisma as any).studySession.groupBy({
      by: ['userId'],
      where: { startTime: { gte: today, lt: tomorrow } },
      _count: { _all: true },
    });
    for (const g of sessions) {
      try {
        this.logger.log(`Daily check-in -> user:${g.userId} count:${g._count._all}`);
      } catch (e) {
        this.logger.warn(`Daily check-in failed: ${(e as any)?.message || e}`);
      }
    }
  }

  // Haftalık rapor bildirimi (Pazar 20:00)
  @Cron('0 20 * * 0')
  async weeklyReportReady() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    const users = await (this.prisma as any).user.findMany({ select: { id: true } });
    for (const u of users) {
      try {
        this.logger.log(`Weekly report -> user:${u.id}`);
      } catch (e) {
        this.logger.warn(`Weekly report notify failed: ${(e as any)?.message || e}`);
      }
    }
  }
}
