import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface NotificationPreference {
  id: string;
  userId: string;
  type: string;
  channel: 'push' | 'email' | 'sms' | 'websocket';
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
    timezone: string;
  };
  filters: {
    categories: string[];
    keywords: string[];
    minPriority: number;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferenceUpdate {
  enabled?: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  filters?: {
    categories: string[];
    keywords: string[];
    minPriority: number;
  };
  metadata?: Record<string, any>;
}

export interface NotificationPreferenceStats {
  totalPreferences: number;
  preferencesByType: Record<string, number>;
  preferencesByChannel: Record<string, number>;
  averagePreferencesPerUser: number;
  mostCommonSettings: {
    frequency: string;
    quietHours: boolean;
    categories: string[];
  };
}

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);
  private readonly defaultPreferences: Record<string, NotificationPreference> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly metrics: MetricsService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultPreferences();
  }

  /**
   * Varsayılan tercihleri başlat
   */
  private initializeDefaultPreferences(): void {
    // Plan notifications
    this.defaultPreferences['plan.reminder'] = {
      id: 'default-plan-reminder',
      userId: 'default',
      type: 'plan.reminder',
      channel: 'push',
      enabled: true,
      frequency: 'immediate',
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'Europe/Istanbul',
      },
      filters: {
        categories: ['planning'],
        keywords: ['reminder', 'session'],
        minPriority: 1,
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Achievement notifications
    this.defaultPreferences['achievement.unlocked'] = {
      id: 'default-achievement',
      userId: 'default',
      type: 'achievement.unlocked',
      channel: 'push',
      enabled: true,
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Europe/Istanbul',
      },
      filters: {
        categories: ['gamification'],
        keywords: ['achievement', 'badge', 'reward'],
        minPriority: 2,
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Weekly report
    this.defaultPreferences['weekly.report'] = {
      id: 'default-weekly-report',
      userId: 'default',
      type: 'weekly.report',
      channel: 'email',
      enabled: true,
      frequency: 'weekly',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Europe/Istanbul',
      },
      filters: {
        categories: ['report'],
        keywords: ['weekly', 'progress', 'summary'],
        minPriority: 1,
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.logger.log(`Initialized ${Object.keys(this.defaultPreferences).length} default preferences`);
  }

  /**
   * Kullanıcı tercihlerini getir
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      // Cache'den al
      const cacheKey = `notification_preferences:${userId}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }

      // Veritabanından al
      const preferences = await (this.prisma as any).notificationPreference.findMany({
        where: { userId },
        orderBy: { type: 'asc' },
      });

      const result = preferences.map((pref: any) => this.mapToPreference(pref));

      // Cache'e kaydet
      await this.cache.set(cacheKey, JSON.stringify(result), 300); // 5 dakika

      return result;
    } catch (error) {
      this.logger.error(`Failed to get user preferences: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Belirli tip tercih getir
   */
  async getPreference(
    userId: string,
    type: string
  ): Promise<NotificationPreference | null> {
    try {
      const preference = await (this.prisma as any).notificationPreference.findFirst({
        where: { userId, type },
      });

      return preference ? this.mapToPreference(preference) : null;
    } catch (error) {
      this.logger.error(`Failed to get preference: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Tercih oluştur veya güncelle
   */
  async upsertPreference(
    userId: string,
    type: string,
    preference: NotificationPreferenceUpdate
  ): Promise<NotificationPreference> {
    try {
      const existing = await (this.prisma as any).notificationPreference.findFirst({
        where: { userId, type },
      });

      let result;
      if (existing) {
        // Güncelle
        result = await (this.prisma as any).notificationPreference.update({
          where: { id: existing.id },
          data: {
            ...(preference as any),
            updatedAt: new Date(),
          },
        });
      } else {
        // Oluştur
        result = await (this.prisma as any).notificationPreference.create({
          data: {
            userId,
            type,
            channel: (preference as any).channel || 'email',
            frequency: preference.frequency || 'immediate',
            quietHours: (preference.quietHours ?? undefined) as any,
            filters: (preference.filters ?? undefined) as any,
            metadata: (preference.metadata ?? undefined) as any,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Cache'i temizle
      await this.cache.del(`notification_preferences:${userId}`);

      // Event emit
      this.eventEmitter.emit('notification.preference.updated', {
        userId,
        type,
        preference: this.mapToPreference(result),
        timestamp: new Date(),
      });

      this.logger.log(`Preference updated for user ${userId}: ${type}`);
      
      return this.mapToPreference(result);
    } catch (error) {
      this.logger.error(`Failed to upsert preference: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to update notification preference');
    }
  }

  /**
   * Tercih sil
   */
  async deletePreference(userId: string, type: string): Promise<void> {
    try {
      await (this.prisma as any).notificationPreference.deleteMany({
        where: { userId, type },
      });

      // Cache'i temizle
      await this.cache.del(`notification_preferences:${userId}`);

      // Event emit
      this.eventEmitter.emit('notification.preference.deleted', {
        userId,
        type,
        timestamp: new Date(),
      });

      this.logger.log(`Preference deleted for user ${userId}: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to delete preference: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to delete notification preference');
    }
  }

  /**
   * Kullanıcı için varsayılan tercihleri oluştur
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreference[]> {
    try {
      const preferences: NotificationPreference[] = [];

      for (const [type, defaultPref] of Object.entries(this.defaultPreferences)) {
        const preference = await (this.prisma as any).notificationPreference.create({
          data: {
            userId,
            type,
            channel: defaultPref.channel,
            enabled: defaultPref.enabled,
            frequency: defaultPref.frequency,
            quietHours: defaultPref.quietHours,
            filters: defaultPref.filters,
            metadata: defaultPref.metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        preferences.push(this.mapToPreference(preference));
      }

      // Cache'i temizle
      await this.cache.del(`notification_preferences:${userId}`);

      this.logger.log(`Created default preferences for user ${userId}`);
      
      return preferences;
    } catch (error) {
      this.logger.error(`Failed to create default preferences: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to create default preferences');
    }
  }

  /**
   * Bildirim gönderilebilir mi kontrol et
   */
  async canSendNotification(
    userId: string,
    type: string,
    channel: 'push' | 'email' | 'sms' | 'websocket',
    priority: number = 1
  ): Promise<{
    canSend: boolean;
    reason?: string;
    preference?: NotificationPreference;
  }> {
    try {
      const preference = await this.getPreference(userId, type);
      if (!preference) {
        return { canSend: false, reason: 'No preference found' };
      }

      // Tercih aktif mi kontrol et
      if (!preference.enabled) {
        return { canSend: false, reason: 'Preference disabled', preference };
      }

      // Kanal uyumlu mu kontrol et
      if (preference.channel !== channel) {
        return { canSend: false, reason: 'Channel mismatch', preference };
      }

      // Öncelik yeterli mi kontrol et
      if (priority < preference.filters.minPriority) {
        return { canSend: false, reason: 'Priority too low', preference };
      }

      // Sessiz saatlerde mi kontrol et
      if (preference.quietHours.enabled) {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('tr-TR', { 
          hour12: false, 
          timeZone: preference.quietHours.timezone 
        });
        
        const startTime = preference.quietHours.start;
        const endTime = preference.quietHours.end;
        
        if (this.isInQuietHours(currentTime, startTime, endTime)) {
          return { canSend: false, reason: 'Quiet hours active', preference };
        }
      }

      return { canSend: true, preference };
    } catch (error) {
      this.logger.error(`Failed to check notification permission: ${error instanceof Error ? error.message : String(error)}`);
      return { canSend: false, reason: 'Error checking permission' };
    }
  }

  /**
   * Sessiz saatlerde mi kontrol et
   */
  private isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start <= end) {
      // Normal saatler (örn: 22:00 - 08:00)
      return current >= start || current <= end;
    } else {
      // Gece yarısı geçen saatler (örn: 22:00 - 08:00)
      return current >= start || current <= end;
    }
  }

  /**
   * Saat formatını dakikaya çevir
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Tercih istatistikleri getir
   */
  async getPreferenceStats(): Promise<NotificationPreferenceStats> {
    try {
      // Cache'den al
      const cached = await this.cache.get('notification_preference_stats');
      if (cached) {
        return JSON.parse(cached as string);
      }

      const preferences = await (this.prisma as any).notificationPreference.findMany({
        select: {
          type: true,
          channel: true,
          enabled: true,
          frequency: true,
          quietHours: true,
          filters: true,
        },
      });

      const totalPreferences = preferences.length;
      
      const preferencesByType: Record<string, number> = {};
      const preferencesByChannel: Record<string, number> = {};
      
      preferences.forEach((pref: any) => {
        preferencesByType[pref.type] = (preferencesByType[pref.type] || 0) + 1;
        preferencesByChannel[pref.channel] = (preferencesByChannel[pref.channel] || 0) + 1;
      });

      // En yaygın ayarlar
      const frequencyCounts: Record<string, number> = {};
      const quietHoursCounts = { enabled: 0, disabled: 0 };
      const categoryCounts: Record<string, number> = {};

      preferences.forEach((pref: any) => {
        frequencyCounts[pref.frequency] = (frequencyCounts[pref.frequency] || 0) + 1;
        
        if ((pref.quietHours as any)?.enabled) {
          quietHoursCounts.enabled++;
        } else {
          quietHoursCounts.disabled++;
        }

        if ((pref.filters as any)?.categories) {
          (pref.filters as any).categories.forEach((category: string) => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
        }
      });

      const mostCommonFrequency = Object.entries(frequencyCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'immediate';
      
      const mostCommonCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      const result: NotificationPreferenceStats = {
        totalPreferences,
        preferencesByType,
        preferencesByChannel,
        averagePreferencesPerUser: 0, // TODO: Calculate
        mostCommonSettings: {
          frequency: mostCommonFrequency,
          quietHours: quietHoursCounts.enabled > quietHoursCounts.disabled,
          categories: mostCommonCategories,
        },
      };

      // Cache'e kaydet
      await this.cache.set('notification_preference_stats', JSON.stringify(result), 600); // 10 dakika

      return result;
    } catch (error) {
      this.logger.error(`Failed to get preference stats: ${error instanceof Error ? error.message : String(error)}`);
      return {
        totalPreferences: 0,
        preferencesByType: {},
        preferencesByChannel: {},
        averagePreferencesPerUser: 0,
        mostCommonSettings: {
          frequency: 'immediate',
          quietHours: false,
          categories: [],
        },
      };
    }
  }

  /**
   * Toplu tercih güncelleme
   */
  async bulkUpdatePreferences(
    userId: string,
    updates: Record<string, NotificationPreferenceUpdate>
  ): Promise<NotificationPreference[]> {
    try {
      const results: NotificationPreference[] = [];

      for (const [type, update] of Object.entries(updates)) {
        const preference = await this.upsertPreference(userId, type, update);
        results.push(preference);
      }

      this.logger.log(`Bulk updated ${results.length} preferences for user ${userId}`);
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to bulk update preferences: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to bulk update preferences');
    }
  }

  /**
   * Tercih şablonu oluştur
   */
  async createPreferenceTemplate(
    name: string,
    template: Omit<NotificationPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    try {
      await (this.prisma as any).notificationPreferenceTemplate.create({
        data: {
          name,
          type: template.type,
          channel: template.channel,
          enabled: template.enabled,
          frequency: template.frequency,
          quietHours: (template.quietHours ?? undefined) as any,
          filters: (template.filters ?? undefined) as any,
          metadata: (template.metadata ?? undefined) as any,
        },
      });

      this.logger.log(`Created preference template: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to create preference template: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to create preference template');
    }
  }

  /**
   * Tercih şablonundan oluştur
   */
  async createFromTemplate(
    userId: string,
    templateName: string
  ): Promise<NotificationPreference> {
    try {
      const template = await (this.prisma as any).notificationPreferenceTemplate.findFirst({
        where: { name: templateName },
      });

      if (!template) {
        throw new NotFoundException(`Preference template not found: ${templateName}`);
      }

      const preference = await (this.prisma as any).notificationPreference.create({
        data: {
          userId,
          type: template.type,
          channel: template.channel,
          enabled: template.enabled,
          frequency: template.frequency,
          quietHours: (template.quietHours ?? undefined) as any,
          filters: (template.filters ?? undefined) as any,
          metadata: (template.metadata ?? undefined) as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Cache'i temizle
      await this.cache.del(`notification_preferences:${userId}`);

      this.logger.log(`Created preference from template ${templateName} for user ${userId}`);
      
      return this.mapToPreference(preference);
    } catch (error) {
      this.logger.error(`Failed to create from template: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to create preference from template');
    }
  }

  /**
   * Mapping function
   */
  private mapToPreference(data: any): NotificationPreference {
    return {
      id: data.id,
      userId: data.userId,
      type: data.type,
      channel: data.channel,
      enabled: data.enabled,
      frequency: data.frequency,
      quietHours: data.quietHours,
      filters: data.filters,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
