import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';

export interface NotificationData {
  id: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string;
  role?: string;
  room?: string;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);

  constructor(private webSocketGateway: WebSocketGateway) {}

  // Kullanıcıya özel bildirim gönder
  async sendNotificationToUser(userId: string, notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    try {
      const notificationData: NotificationData = {
        id: this.generateId(),
        timestamp: new Date(),
        ...notification,
      };

      await this.webSocketGateway.sendToUser(userId, 'notification', notificationData);
      
      this.logger.log(`Bildirim gönderildi: ${userId} - ${notification.title}`);
      return { success: true, notificationId: notificationData.id };
    } catch (error) {
      this.logger.error('Kullanıcıya bildirim gönderme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Role göre bildirim gönder
  async sendNotificationToRole(role: string, notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    try {
      const notificationData: NotificationData = {
        id: this.generateId(),
        timestamp: new Date(),
        ...notification,
      };

      await this.webSocketGateway.sendToRole(role, 'notification', notificationData);
      
      this.logger.log(`Role bildirim gönderildi: ${role} - ${notification.title}`);
      return { success: true, notificationId: notificationData.id };
    } catch (error) {
      this.logger.error('Role bildirim gönderme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Tüm kullanıcılara bildirim gönder
  async sendNotificationToAll(notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    try {
      const notificationData: NotificationData = {
        id: this.generateId(),
        timestamp: new Date(),
        ...notification,
      };

      await this.webSocketGateway.sendToAll('notification', notificationData);
      
      this.logger.log(`Genel bildirim gönderildi: ${notification.title}`);
      return { success: true, notificationId: notificationData.id };
    } catch (error) {
      this.logger.error('Genel bildirim gönderme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Room'a bildirim gönder
  async sendNotificationToRoom(room: string, notification: Omit<NotificationData, 'id' | 'timestamp'>) {
    try {
      const notificationData: NotificationData = {
        id: this.generateId(),
        timestamp: new Date(),
        ...notification,
      };

      await this.webSocketGateway.sendToRoom(room, 'notification', notificationData);
      
      this.logger.log(`Room bildirim gönderildi: ${room} - ${notification.title}`);
      return { success: true, notificationId: notificationData.id };
    } catch (error) {
      this.logger.error('Room bildirim gönderme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Anomali bildirimi gönder
  async sendAnomalyAlert(anomaly: {
    type: string;
    severity: string;
    message: string;
    data: any;
  }) {
    const notification = {
      type: (anomaly.severity === 'CRITICAL' ? 'ERROR' : 
             anomaly.severity === 'HIGH' ? 'WARNING' : 'INFO') as 'ERROR' | 'WARNING' | 'INFO',
      title: `Anomali Tespit Edildi: ${anomaly.type}`,
      message: anomaly.message,
      data: anomaly.data,
    };

    // Admin'lere gönder
    return this.sendNotificationToRole('ADMIN', notification);
  }

  // Sistem durumu bildirimi
  async sendSystemStatus(status: {
    status: 'ONLINE' | 'MAINTENANCE' | 'ERROR';
    message: string;
    details?: any;
  }) {
    const notification = {
      type: (status.status === 'ERROR' ? 'ERROR' : 
             status.status === 'MAINTENANCE' ? 'WARNING' : 'INFO') as 'ERROR' | 'WARNING' | 'INFO',
      title: `Sistem Durumu: ${status.status}`,
      message: status.message,
      data: status.details,
    };

    return this.sendNotificationToAll(notification);
  }

  // Kullanıcı aktivitesi bildirimi
  async sendUserActivityNotification(userId: string, activity: {
    type: string;
    description: string;
    data?: any;
  }) {
    const notification = {
      type: 'INFO' as 'INFO',
      title: 'Yeni Aktivite',
      message: activity.description,
      data: activity.data,
    };

    return this.sendNotificationToUser(userId, notification);
  }

  // Dashboard güncelleme bildirimi
  async sendDashboardUpdate(dashboardId: string, update: {
    type: 'WIDGET_ADDED' | 'WIDGET_REMOVED' | 'WIDGET_UPDATED' | 'LAYOUT_CHANGED';
    message: string;
    data?: any;
  }) {
    const notification = {
      type: 'INFO' as 'INFO',
      title: 'Dashboard Güncellendi',
      message: update.message,
      data: { dashboardId, ...update },
    };

    return this.sendNotificationToRoom(`dashboard_${dashboardId}`, notification);
  }

  // Bağlı kullanıcı sayısını al
  getConnectedUsersCount(): number {
    return this.webSocketGateway.getConnectedUsersCount();
  }

  // Bağlı kullanıcıları al
  getConnectedUsers(): string[] {
    return this.webSocketGateway.getConnectedUsers();
  }

  // Ping gönder
  async sendPing() {
    try {
      await this.webSocketGateway.sendToAll('ping', {
        timestamp: new Date().toISOString(),
        message: 'Server ping',
      });
      return { success: true };
    } catch (error) {
      this.logger.error('Ping gönderme hatası:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
