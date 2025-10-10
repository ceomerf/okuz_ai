import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export interface RealtimeNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'user' | 'payment' | 'learning' | 'security';
  metadata?: any;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
  };
  byCategory: {
    system: number;
    user: number;
    payment: number;
    learning: number;
    security: number;
  };
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  categories: {
    system: boolean;
    user: boolean;
    payment: boolean;
    learning: boolean;
    security: boolean;
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeNotificationsService {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeNotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async sendNotification(notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    try {
      // Veritabanına kaydet
      const savedNotification = await this.prisma.notification.create({
        data: {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          userId: notification.userId,
          priority: notification.priority,
          category: notification.category,
          metadata: notification.metadata,
          read: false,
          createdAt: new Date(),
        },
      });

      // WebSocket ile gerçek zamanlı gönder
      if (notification.userId) {
        // Belirli kullanıcıya gönder
        this.server.to(`user_${notification.userId}`).emit('notification', {
          id: savedNotification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: savedNotification.createdAt.toISOString(),
          read: false,
          priority: notification.priority,
          category: notification.category,
          metadata: notification.metadata,
        });
      } else {
        // Tüm kullanıcılara gönder (sistem bildirimi)
        this.server.emit('notification', {
          id: savedNotification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: savedNotification.createdAt.toISOString(),
          read: false,
          priority: notification.priority,
          category: notification.category,
          metadata: notification.metadata,
        });
      }

      this.logger.log(`Notification sent: ${notification.title}`);
    } catch (error) {
      this.logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<RealtimeNotification[]> {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      return notifications.map(notification => ({
        id: notification.id,
        type: notification.type as any,
        title: notification.title,
        message: notification.message,
        userId: notification.userId,
        timestamp: notification.createdAt.toISOString(),
        read: notification.read,
        priority: notification.priority as any,
        category: notification.category as any,
        metadata: notification.metadata,
      }));
    } catch (error) {
      this.logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: { read: true },
      });

      // WebSocket ile güncelleme gönder
      this.server.to(`user_${userId}`).emit('notification_read', {
        notificationId,
        read: true,
      });
    } catch (error) {
      this.logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: { read: true },
      });

      // WebSocket ile güncelleme gönder
      this.server.to(`user_${userId}`).emit('all_notifications_read', {
        userId,
        read: true,
      });
    } catch (error) {
      this.logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const [total, unread, byType, byCategory] = await Promise.all([
        this.prisma.notification.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, read: false } }),
        this.getNotificationsByType(userId),
        this.getNotificationsByCategory(userId),
      ]);

      return {
        total,
        unread,
        byType,
        byCategory,
      };
    } catch (error) {
      this.logger.error('Failed to get notification stats:', error);
      throw error;
    }
  }

  private async getNotificationsByType(userId: string) {
    try {
      const [info, success, warning, error] = await Promise.all([
        this.prisma.notification.count({ where: { userId, type: 'info' } }),
        this.prisma.notification.count({ where: { userId, type: 'success' } }),
        this.prisma.notification.count({ where: { userId, type: 'warning' } }),
        this.prisma.notification.count({ where: { userId, type: 'error' } }),
      ]);

      return { info, success, warning, error };
    } catch (error) {
      this.logger.warn('Could not get notifications by type:', error);
      return { info: 0, success: 0, warning: 0, error: 0 };
    }
  }

  private async getNotificationsByCategory(userId: string) {
    try {
      const [system, user, payment, learning, security] = await Promise.all([
        this.prisma.notification.count({ where: { userId, category: 'system' } }),
        this.prisma.notification.count({ where: { userId, category: 'user' } }),
        this.prisma.notification.count({ where: { userId, category: 'payment' } }),
        this.prisma.notification.count({ where: { userId, category: 'learning' } }),
        this.prisma.notification.count({ where: { userId, category: 'security' } }),
      ]);

      return { system, user, payment, learning, security };
    } catch (error) {
      this.logger.warn('Could not get notifications by category:', error);
      return { system: 0, user: 0, payment: 0, learning: 0, security: 0 };
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await this.prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Varsayılan tercihleri oluştur
        return await this.createDefaultPreferences(userId);
      }

      return {
        userId: preferences.userId,
        email: preferences.email,
        push: preferences.push,
        sms: preferences.sms,
        inApp: preferences.inApp,
        categories: {
          system: preferences.systemNotifications,
          user: preferences.userNotifications,
          payment: preferences.paymentNotifications,
          learning: preferences.learningNotifications,
          security: preferences.securityNotifications,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await this.prisma.notificationPreferences.create({
        data: {
          userId,
          email: true,
          push: true,
          sms: false,
          inApp: true,
          systemNotifications: true,
          userNotifications: true,
          paymentNotifications: true,
          learningNotifications: true,
          securityNotifications: true,
        },
      });

      return {
        userId: preferences.userId,
        email: preferences.email,
        push: preferences.push,
        sms: preferences.sms,
        inApp: preferences.inApp,
        categories: {
          system: preferences.systemNotifications,
          user: preferences.userNotifications,
          payment: preferences.paymentNotifications,
          learning: preferences.learningNotifications,
          security: preferences.securityNotifications,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create default preferences:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      await this.prisma.notificationPreferences.upsert({
        where: { userId },
        update: {
          email: preferences.email,
          push: preferences.push,
          sms: preferences.sms,
          inApp: preferences.inApp,
          systemNotifications: preferences.categories?.system,
          userNotifications: preferences.categories?.user,
          paymentNotifications: preferences.categories?.payment,
          learningNotifications: preferences.categories?.learning,
          securityNotifications: preferences.categories?.security,
        },
        create: {
          userId,
          email: preferences.email ?? true,
          push: preferences.push ?? true,
          sms: preferences.sms ?? false,
          inApp: preferences.inApp ?? true,
          systemNotifications: preferences.categories?.system ?? true,
          userNotifications: preferences.categories?.user ?? true,
          paymentNotifications: preferences.categories?.payment ?? true,
          learningNotifications: preferences.categories?.learning ?? true,
          securityNotifications: preferences.categories?.security ?? true,
        },
      });

      // WebSocket ile tercih güncellemesi gönder
      this.server.to(`user_${userId}`).emit('preferences_updated', {
        userId,
        preferences,
      });
    } catch (error) {
      this.logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await this.prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId,
        },
      });

      // WebSocket ile silme bildirimi gönder
      this.server.to(`user_${userId}`).emit('notification_deleted', {
        notificationId,
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete notification:', error);
      throw error;
    }
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      await this.prisma.notification.deleteMany({
        where: { userId },
      });

      // WebSocket ile tüm bildirimlerin silindiği bildirimi gönder
      this.server.to(`user_${userId}`).emit('all_notifications_deleted', {
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to delete all notifications:', error);
      throw error;
    }
  }

  // WebSocket bağlantı yönetimi
  handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Kullanıcı odasına katılma
  joinUserRoom(client: any, userId: string) {
    client.join(`user_${userId}`);
    this.logger.log(`User ${userId} joined their notification room`);
  }

  // Kullanıcı odasından çıkma
  leaveUserRoom(client: any, userId: string) {
    client.leave(`user_${userId}`);
    this.logger.log(`User ${userId} left their notification room`);
  }

  // Sistem bildirimi gönderme
  async sendSystemNotification(
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<void> {
    await this.sendNotification({
      type,
      title,
      message,
      priority,
      category: 'system',
    });
  }

  // Öğrenme bildirimi gönderme
  async sendLearningNotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<void> {
    await this.sendNotification({
      type,
      title,
      message,
      userId,
      priority,
      category: 'learning',
    });
  }

  // Ödeme bildirimi gönderme
  async sendPaymentNotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'high'
  ): Promise<void> {
    await this.sendNotification({
      type,
      title,
      message,
      userId,
      priority,
      category: 'payment',
    });
  }

  // Güvenlik bildirimi gönderme
  async sendSecurityNotification(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'urgent'
  ): Promise<void> {
    await this.sendNotification({
      type,
      title,
      message,
      userId,
      priority,
      category: 'security',
    });
  }
}
