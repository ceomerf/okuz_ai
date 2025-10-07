import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NotificationSettingsService } from './notification-settings.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('notification-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationSettingsController {
  constructor(private readonly notificationSettingsService: NotificationSettingsService) {}

  /**
   * Kullanıcı bildirim ayarlarını getir
   */
  @Get()
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async getUserNotificationSettings(@Request() req: AuthenticatedRequest) {
    return this.notificationSettingsService.getUserNotificationSettings(req.user.id);
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  @Put()
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async updateNotificationSettings(
    @Request() req: AuthenticatedRequest,
    @Body() settingsData: {
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
    }
  ) {
    return this.notificationSettingsService.updateNotificationSettings(req.user.id, settingsData);
  }

  /**
   * Bildirimi snooze et
   */
  @Post('snooze/:notificationId')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async snoozeNotification(
    @Request() req: AuthenticatedRequest,
    @Param('notificationId') notificationId: string,
    @Body() body: { snoozeMinutes: number }
  ) {
    return this.notificationSettingsService.snoozeNotification(
      req.user.id,
      notificationId,
      body.snoozeMinutes
    );
  }

  /**
   * Tüm bildirimleri snooze et
   */
  @Post('snooze-all')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async snoozeAllNotifications(
    @Request() req: AuthenticatedRequest,
    @Body() body: { snoozeMinutes: number }
  ) {
    return this.notificationSettingsService.snoozeAllNotifications(
      req.user.id,
      body.snoozeMinutes
    );
  }

  /**
   * Aktif snooze'ları getir
   */
  @Get('snoozes')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async getActiveSnoozes(@Request() req: AuthenticatedRequest) {
    return this.notificationSettingsService.getActiveSnoozes(req.user.id);
  }

  /**
   * Snooze'u iptal et
   */
  @Delete('snoozes/:snoozeId')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async cancelSnooze(
    @Request() req: AuthenticatedRequest,
    @Param('snoozeId') snoozeId: string
  ) {
    return this.notificationSettingsService.cancelSnooze(req.user.id, snoozeId);
  }

  /**
   * Bildirim geçmişi
   */
  @Get('history')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async getNotificationHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.notificationSettingsService.getNotificationHistory(req.user.id, limitNum);
  }

  /**
   * Bildirim istatistikleri
   */
  @Get('stats')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async getNotificationStats(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string
  ) {
    const daysNum = days ? parseInt(days) : 30;
    return this.notificationSettingsService.getNotificationStats(req.user.id, daysNum);
  }

  /**
   * Snooze durumunu kontrol et
   */
  @Get('snooze-status')
  @Roles('STUDENT', 'PARENT', 'TEACHER', 'ADMIN')
  async getSnoozeStatus(
    @Request() req: AuthenticatedRequest,
    @Query('notificationId') notificationId?: string
  ) {
    const isSnoozed = await this.notificationSettingsService.isNotificationSnoozed(
      req.user.id,
      notificationId
    );
    
    return { isSnoozed };
  }
}
