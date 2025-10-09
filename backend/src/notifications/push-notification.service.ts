import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { MetricsService } from '../monitoring/metrics.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConnectionManagerService } from '../realtime/connection-manager.service';
import * as webpush from 'web-push';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  url?: string;
}

export interface PushNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
  deliveryTime: number;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  platform: string;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly vapidKeys: {
    publicKey: string;
    privateKey: string;
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly connectionManager: ConnectionManagerService,
    @Optional() private readonly cache?: CacheService,
  ) {
    // VAPID keys
    this.vapidKeys = {
      publicKey: this.configService.get<string>('VAPID_PUBLIC_KEY') || '',
      privateKey: this.configService.get<string>('VAPID_PRIVATE_KEY') || '',
    };

    // Web-push konfigürasyonu
    webpush.setVapidDetails(
      'mailto:admin@okuz.ai',
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    );

    this.logger.log('PushNotificationService initialized');
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Cihaz kaydet
   */
  async registerDevice(
    userId: string,
    subscription: any,
    userAgent: string,
    platform: string
  ): Promise<DeviceInfo> {
    try {
      // Mevcut cihazı kontrol et
      const existingDevice = await (this.prisma as any).pushDevice.findFirst({
        where: {
          userId,
          endpoint: subscription.endpoint,
        },
      });

      if (existingDevice) {
        // Mevcut cihazı güncelle
        const updatedDevice = await (this.prisma as any).pushDevice.update({
          where: { id: existingDevice.id },
          data: {
            keys: subscription.keys,
            userAgent,
            platform,
            isActive: true,
            lastUsed: new Date(),
          },
        });

        this.logger.log(`Updated device for user ${userId}: ${updatedDevice.id}`);
        return this.mapToDeviceInfo(updatedDevice);
      }

      // Yeni cihaz kaydet
      const newDevice = await (this.prisma as any).pushDevice.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent,
          platform,
          isActive: true,
          lastUsed: new Date(),
        },
      });

      this.logger.log(`Registered new device for user ${userId}: ${newDevice.id}`);
      
      // Event emit
      this.eventEmitter.emit('device.registered', {
        userId,
        deviceId: newDevice.id,
        platform,
        timestamp: new Date(),
      });

      return this.mapToDeviceInfo(newDevice);
    } catch (error) {
      this.logger.error(`Failed to register device: ${this.getErrorMessage(error)}`);
      throw new BadRequestException('Failed to register device');
    }
  }

  /**
   * Cihaz sil
   */
  async unregisterDevice(deviceId: string): Promise<void> {
    try {
      await (this.prisma as any).pushDevice.delete({
        where: { id: deviceId },
      });

      this.logger.log(`Unregistered device: ${deviceId}`);
      
      // Event emit
      this.eventEmitter.emit('device.unregistered', {
        deviceId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to unregister device: ${this.getErrorMessage(error)}`);
      throw new BadRequestException('Failed to unregister device');
    }
  }

  /**
   * Kullanıcının cihazlarını getir
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      const devices = await (this.prisma as any).pushDevice.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { lastUsed: 'desc' },
      });

      return devices.map((device: any) => this.mapToDeviceInfo(device));
    } catch (error) {
      this.logger.error(`Failed to get user devices: ${this.getErrorMessage(error)}`);
      return [];
    }
  }

  /**
   * Push notification gönder
   */
  async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
    options: {
      deviceIds?: string[];
      priority?: 'high' | 'normal' | 'low';
      ttl?: number;
      urgency?: 'very-low' | 'low' | 'normal' | 'high';
    } = {}
  ): Promise<PushNotificationResult> {
    const startTime = Date.now();
    const result: PushNotificationResult = {
      success: false,
      sent: 0,
      failed: 0,
      errors: [],
      deliveryTime: 0,
    };

    try {
      // Kullanıcının cihazlarını al
      const devices = await this.getUserDevices(userId);
      
      if (devices.length === 0) {
        result.errors.push('No active devices found for user');
        return result;
      }

      // Belirli cihazlar seçilmişse filtrele
      const targetDevices = options.deviceIds 
        ? devices.filter(device => options.deviceIds!.includes(device.id))
        : devices;

      if (targetDevices.length === 0) {
        result.errors.push('No target devices found');
        return result;
      }

      // Her cihaza notification gönder
      const sendPromises = targetDevices.map(device => 
        this.sendToDevice(device, payload, options)
      );

      const results = await Promise.allSettled(sendPromises);
      
      // Sonuçları değerlendir
      for (const [index, promiseResult] of results.entries()) {
        if (promiseResult.status === 'fulfilled') {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push(`Device ${targetDevices[index].id}: ${promiseResult.reason}`);
        }
      }

      result.success = result.sent > 0;
      result.deliveryTime = Date.now() - startTime;

      // Metrikleri güncelle
      this.metrics.incrementCounter('push_notifications_sent_total', result.sent);
      this.metrics.incrementCounter('push_notifications_failed_total', result.failed);
      this.metrics.observeHistogram('push_notification_delivery_time_ms', result.deliveryTime);

      // Event emit
      this.eventEmitter.emit('notification.sent', {
        userId,
        type: 'push',
        title: payload.title,
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date(),
      });

      this.logger.log(`Push notification sent to user ${userId}: ${result.sent} sent, ${result.failed} failed`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${this.getErrorMessage(error)}`);
      result.errors.push(this.getErrorMessage(error));
      result.deliveryTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Belirli cihaza notification gönder
   */
  private async sendToDevice(
    device: DeviceInfo,
    payload: PushNotificationPayload,
    options: any
  ): Promise<void> {
    try {
      const pushSubscription = {
        endpoint: device.endpoint,
        keys: device.keys,
      };

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        tag: payload.tag,
        timestamp: payload.timestamp || Date.now(),
        url: payload.url,
      });

      const pushOptions = {
        TTL: options.ttl || 86400, // 24 saat
        urgency: options.urgency || 'normal',
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'aes128gcm',
        },
      };

      await webpush.sendNotification(pushSubscription, pushPayload, pushOptions);
      
      // Cihaz kullanımını güncelle
      await this.updateDeviceUsage(device.id);
      
      this.logger.log(`Push notification sent to device ${device.id}`);
    } catch (error) {
      this.logger.error(`Failed to send to device ${device.id}: ${this.getErrorMessage(error)}`);
      
      // Cihazı deaktive et (geçersiz endpoint)
      const statusCode = (error as any)?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await this.deactivateDevice(device.id);
      }
      
      throw error;
    }
  }

  /**
   * Toplu notification gönder
   */
  async sendBulkNotification(
    userIds: string[],
    payload: PushNotificationPayload,
    options: any = {}
  ): Promise<PushNotificationResult> {
    const startTime = Date.now();
    const result: PushNotificationResult = {
      success: false,
      sent: 0,
      failed: 0,
      errors: [],
      deliveryTime: 0,
    };

    try {
      // Her kullanıcı için notification gönder
      const sendPromises = userIds.map(userId => 
        this.sendNotification(userId, payload, options)
      );

      const results = await Promise.allSettled(sendPromises);
      
      // Sonuçları topla
      for (const promiseResult of results) {
        if (promiseResult.status === 'fulfilled') {
          const userResult = promiseResult.value;
          result.sent += userResult.sent;
          result.failed += userResult.failed;
          result.errors.push(...userResult.errors);
        } else {
          result.failed++;
          result.errors.push(promiseResult.reason);
        }
      }

      result.success = result.sent > 0;
      result.deliveryTime = Date.now() - startTime;

      this.logger.log(`Bulk push notification sent: ${result.sent} sent, ${result.failed} failed`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to send bulk push notification: ${this.getErrorMessage(error)}`);
      result.errors.push(this.getErrorMessage(error));
      result.deliveryTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * WebSocket üzerinden notification gönder
   */
  async sendRealtimeNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      // WebSocket bağlantısı kontrol et
      if (!this.connectionManager.isUserConnected(userId)) {
        this.logger.warn(`User ${userId} not connected via WebSocket`);
        return false;
      }

      // WebSocket üzerinden gönder
      const success = await this.connectionManager.sendToUser(userId, 'notification', {
        type: 'push',
        ...payload,
        timestamp: new Date(),
      });

      if (success) {
        this.logger.log(`Realtime notification sent to user ${userId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to send realtime notification: ${this.getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Cihaz kullanımını güncelle
   */
  private async updateDeviceUsage(deviceId: string): Promise<void> {
    try {
      await (this.prisma as any).pushDevice.update({
        where: { id: deviceId },
        data: { lastUsed: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to update device usage: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Cihazı deaktive et
   */
  private async deactivateDevice(deviceId: string): Promise<void> {
    try {
      await (this.prisma as any).pushDevice.update({
        where: { id: deviceId },
        data: { isActive: false },
      });
      
      this.logger.log(`Deactivated device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate device: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Eski cihazları temizle
   */
  async cleanupInactiveDevices(daysInactive: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const result = await (this.prisma as any).pushDevice.deleteMany({
        where: {
          isActive: false,
          lastUsed: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} inactive devices`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup inactive devices: ${this.getErrorMessage(error)}`);
      return 0;
    }
  }

  /**
   * Cihaz istatistikleri getir
   */
  async getDeviceStats(): Promise<{
    totalDevices: number;
    activeDevices: number;
    inactiveDevices: number;
    devicesByPlatform: Record<string, number>;
    averageDevicesPerUser: number;
  }> {
    try {
      const devices = await (this.prisma as any).pushDevice.findMany({
        select: {
          isActive: true,
          platform: true,
          userId: true,
        },
      });

      const totalDevices = devices.length;
      const activeDevices = devices.filter((d: any) => d.isActive).length;
      const inactiveDevices = totalDevices - activeDevices;

      const devicesByPlatform: Record<string, number> = {};
      devices.forEach((device: any) => {
        devicesByPlatform[device.platform] = (devicesByPlatform[device.platform] || 0) + 1;
      });

      const uniqueUsers = new Set(devices.map((d: any) => d.userId)).size;
      const averageDevicesPerUser = uniqueUsers > 0 ? totalDevices / uniqueUsers : 0;

      return {
        totalDevices,
        activeDevices,
        inactiveDevices,
        devicesByPlatform,
        averageDevicesPerUser,
      };
    } catch (error) {
      this.logger.error(`Failed to get device stats: ${this.getErrorMessage(error)}`);
      return {
        totalDevices: 0,
        activeDevices: 0,
        inactiveDevices: 0,
        devicesByPlatform: {},
        averageDevicesPerUser: 0,
      };
    }
  }

  /**
   * VAPID public key getir
   */
  getVapidPublicKey(): string {
    return this.vapidKeys.publicKey;
  }

  /**
   * DeviceInfo mapping
   */
  private mapToDeviceInfo(device: any): DeviceInfo {
    return {
      id: device.id,
      userId: device.userId,
      endpoint: device.endpoint,
      keys: device.keys,
      userAgent: device.userAgent,
      platform: device.platform,
      isActive: device.isActive,
      lastUsed: device.lastUsed,
      createdAt: device.createdAt,
    };
  }
}
