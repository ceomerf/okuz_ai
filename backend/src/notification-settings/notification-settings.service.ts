import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kullanıcı bildirim ayarlarını getir
   */
  async getUserNotificationSettings(userId: string) {
    let settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Varsayılan ayarları oluştur
      settings = await this.createDefaultSettings(userId);
    }

    return settings;
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  async updateNotificationSettings(userId: string, settingsData: {
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
    enableStudyReminders?: boolean;
    enableAchievementAlerts?: boolean;
    enableProgressUpdates?: boolean;
    enableSystemMessages?: boolean;
    defaultSnoozeMinutes?: number;
    enablePushNotifications?: boolean;
    enableEmailNotifications?: boolean;
  }) {
    return this.prisma.notificationSettings.upsert({
      where: { userId },
      update: settingsData,
      create: {
        userId,
        ...settingsData,
      },
    });
  }

  /**
   * Bildirimi snooze et
   */
  async snoozeNotification(userId: string, notificationId: string, snoozeMinutes: number) {
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + snoozeMinutes);

    return this.prisma.notificationSnooze.create({
      data: {
        userId,
        notificationId,
        snoozeUntil,
        reason: 'User requested snooze',
      },
    });
  }

  /**
   * Tüm bildirimleri snooze et
   */
  async snoozeAllNotifications(userId: string, snoozeMinutes: number) {
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + snoozeMinutes);

    return this.prisma.notificationSnooze.create({
      data: {
        userId,
        snoozeUntil,
        reason: 'User requested snooze all',
      },
    });
  }

  /**
   * Snooze durumunu kontrol et
   */
  async isNotificationSnoozed(userId: string, notificationId?: string): Promise<boolean> {
    const now = new Date();
    
    const snooze = await this.prisma.notificationSnooze.findFirst({
      where: {
        userId,
        OR: [
          { notificationId },
          { notificationId: null }, // Tüm bildirimler için snooze
        ],
        snoozeUntil: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    return !!snooze;
  }

  /**
   * Sessiz saatlerde mi kontrol et
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    const settings = await this.getUserNotificationSettings(userId);
    
    if (!settings.quietHoursStart || !settings.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString('tr-TR', { 
      timeZone: settings.timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    const startTime = settings.quietHoursStart;
    const endTime = settings.quietHoursEnd;

    // Gece yarısını geçen durumlar için özel kontrol
    if (startTime > endTime) {
      // 22:00 - 08:00 gibi durumlar
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // 09:00 - 17:00 gibi durumlar
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Bildirim gönderilebilir mi kontrol et
   */
  async canSendNotification(userId: string, notificationType: string): Promise<boolean> {
    // Snooze kontrolü
    const isSnoozed = await this.isNotificationSnoozed(userId);
    if (isSnoozed) {
      return false;
    }

    // Sessiz saatler kontrolü
    const isQuietHours = await this.isInQuietHours(userId);
    if (isQuietHours) {
      return false;
    }

    // Bildirim türü kontrolü
    const settings = await this.getUserNotificationSettings(userId);
    
    switch (notificationType) {
      case 'STUDY_REMINDER':
        return settings.enableStudyReminders;
      case 'ACHIEVEMENT':
        return settings.enableAchievementAlerts;
      case 'PROGRESS':
        return settings.enableProgressUpdates;
      case 'SYSTEM':
        return settings.enableSystemMessages;
      default:
        return true;
    }
  }

  /**
   * Aktif snooze'ları getir
   */
  async getActiveSnoozes(userId: string) {
    const now = new Date();
    
    return this.prisma.notificationSnooze.findMany({
      where: {
        userId,
        snoozeUntil: { gt: now },
      },
      orderBy: { snoozeUntil: 'asc' },
    });
  }

  /**
   * Snooze'u iptal et
   */
  async cancelSnooze(userId: string, snoozeId: string) {
    return this.prisma.notificationSnooze.delete({
      where: {
        id: snoozeId,
        userId,
      },
    });
  }

  /**
   * Süresi dolmuş snooze'ları temizle
   */
  async cleanupExpiredSnoozes() {
    const now = new Date();
    
    const result = await this.prisma.notificationSnooze.deleteMany({
      where: {
        snoozeUntil: { lt: now },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired snoozes`);
    return result;
  }

  /**
   * Bildirim geçmişi
   */
  async getNotificationHistory(userId: string, limit: number = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Bildirim istatistikleri
   */
  async getNotificationStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, read, unread, byType] = await Promise.all([
      this.prisma.notification.count({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          isRead: true,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _count: true,
      }),
    ]);

    return {
      total,
      read,
      unread,
      readRate: total > 0 ? (read / total) * 100 : 0,
      byType: byType.map(item => ({
        type: item.type,
        count: item._count,
      })),
    };
  }

  // Yardımcı metodlar
  private async createDefaultSettings(userId: string) {
    return this.prisma.notificationSettings.create({
      data: {
        userId,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'Europe/Istanbul',
        enableStudyReminders: true,
        enableAchievementAlerts: true,
        enableProgressUpdates: true,
        enableSystemMessages: true,
        defaultSnoozeMinutes: 30,
        enablePushNotifications: true,
        enableEmailNotifications: true,
      },
    });
  }
}
