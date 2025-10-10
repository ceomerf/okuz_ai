import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { RealtimeNotificationsService, RealtimeNotification, NotificationStats, NotificationPreferences } from './realtime-notifications.service';

@Controller('notifications')
export class RealtimeNotificationsController {
  constructor(private readonly realtimeNotificationsService: RealtimeNotificationsService) {}

  @Post('send')
  async sendNotification(@Body() notificationData: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    userId?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'system' | 'user' | 'payment' | 'learning' | 'security';
    metadata?: any;
  }): Promise<void> {
    try {
      await this.realtimeNotificationsService.sendNotification(notificationData);
    } catch (error) {
      throw new HttpException(
        'Failed to send notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('limit') limit?: string
  ): Promise<RealtimeNotification[]> {
    try {
      const limitNumber = limit ? parseInt(limit, 10) : 50;
      return await this.realtimeNotificationsService.getUserNotifications(userId, limitNumber);
    } catch (error) {
      throw new HttpException(
        'Failed to get user notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':notificationId/read')
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Body() body: { userId: string }
  ): Promise<void> {
    try {
      await this.realtimeNotificationsService.markAsRead(notificationId, body.userId);
    } catch (error) {
      throw new HttpException(
        'Failed to mark notification as read',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string): Promise<void> {
    try {
      await this.realtimeNotificationsService.markAllAsRead(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to mark all notifications as read',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId/stats')
  async getNotificationStats(@Param('userId') userId: string): Promise<NotificationStats> {
    try {
      return await this.realtimeNotificationsService.getNotificationStats(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to get notification stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId/preferences')
  async getUserPreferences(@Param('userId') userId: string): Promise<NotificationPreferences> {
    try {
      return await this.realtimeNotificationsService.getUserPreferences(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to get user preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('user/:userId/preferences')
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      await this.realtimeNotificationsService.updateUserPreferences(userId, preferences);
    } catch (error) {
      throw new HttpException(
        'Failed to update user preferences',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':notificationId')
  async deleteNotification(
    @Param('notificationId') notificationId: string,
    @Body() body: { userId: string }
  ): Promise<void> {
    try {
      await this.realtimeNotificationsService.deleteNotification(notificationId, body.userId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('user/:userId/all')
  async deleteAllNotifications(@Param('userId') userId: string): Promise<void> {
    try {
      await this.realtimeNotificationsService.deleteAllNotifications(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete all notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('system')
  async sendSystemNotification(@Body() notificationData: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<void> {
    try {
      await this.realtimeNotificationsService.sendSystemNotification(
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.priority || 'medium'
      );
    } catch (error) {
      throw new HttpException(
        'Failed to send system notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('learning')
  async sendLearningNotification(@Body() notificationData: {
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<void> {
    try {
      await this.realtimeNotificationsService.sendLearningNotification(
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.priority || 'medium'
      );
    } catch (error) {
      throw new HttpException(
        'Failed to send learning notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('payment')
  async sendPaymentNotification(@Body() notificationData: {
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<void> {
    try {
      await this.realtimeNotificationsService.sendPaymentNotification(
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.priority || 'high'
      );
    } catch (error) {
      throw new HttpException(
        'Failed to send payment notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('security')
  async sendSecurityNotification(@Body() notificationData: {
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<void> {
    try {
      await this.realtimeNotificationsService.sendSecurityNotification(
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.priority || 'urgent'
      );
    } catch (error) {
      throw new HttpException(
        'Failed to send security notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
