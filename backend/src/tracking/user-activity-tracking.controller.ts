import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { UserActivityTrackingService, UserActivity, ActivitySummary, UserActivityAnalytics, ActivityFilter } from './user-activity-tracking.service';

@Controller('tracking')
export class UserActivityTrackingController {
  constructor(private readonly userActivityTrackingService: UserActivityTrackingService) {}

  @Post('activity')
  async trackActivity(@Body() activityData: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      await this.userActivityTrackingService.trackActivity(
        activityData.userId,
        activityData.action,
        activityData.resource,
        activityData.resourceId,
        activityData.metadata,
        activityData.ipAddress,
        activityData.userAgent,
        activityData.sessionId
      );
    } catch (error) {
      throw new HttpException(
        'Failed to track activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('page-view')
  async trackPageView(@Body() pageViewData: {
    userId: string;
    page: string;
    referrer?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      await this.userActivityTrackingService.trackPageView(
        pageViewData.userId,
        pageViewData.page,
        pageViewData.referrer,
        pageViewData.ipAddress,
        pageViewData.userAgent,
        pageViewData.sessionId
      );
    } catch (error) {
      throw new HttpException(
        'Failed to track page view',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('action')
  async trackUserAction(@Body() actionData: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      await this.userActivityTrackingService.trackUserAction(
        actionData.userId,
        actionData.action,
        actionData.resource,
        actionData.resourceId,
        actionData.metadata,
        actionData.ipAddress,
        actionData.userAgent,
        actionData.sessionId
      );
    } catch (error) {
      throw new HttpException(
        'Failed to track user action',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('error')
  async trackError(@Body() errorData: {
    userId: string;
    error: string;
    stack?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      await this.userActivityTrackingService.trackError(
        errorData.userId,
        errorData.error,
        errorData.stack,
        errorData.metadata,
        errorData.ipAddress,
        errorData.userAgent,
        errorData.sessionId
      );
    } catch (error) {
      throw new HttpException(
        'Failed to track error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  async trackLogin(@Body() loginData: {
    userId: string;
    method?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      await this.userActivityTrackingService.trackLogin(
        loginData.userId,
        loginData.method,
        loginData.ipAddress,
        loginData.userAgent,
        loginData.sessionId
      );
    } catch (error) {
      throw new HttpException(
        'Failed to track login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  async trackLogout(@Body() logoutData: {
    userId: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.userActivityTrackingService.trackLogout(
        logoutData.userId,
        logoutData.sessionId,
        logoutData.ipAddress,
        logoutData.userAgent
      );
    } catch (error) {
      throw new HttpException(
        'Failed to track logout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('activities')
  async getUserActivities(@Query() filter: ActivityFilter): Promise<UserActivity[]> {
    try {
      return await this.userActivityTrackingService.getUserActivities(filter);
    } catch (error) {
      throw new HttpException(
        'Failed to get user activities',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('summary')
  async getActivitySummary(@Query('period') period?: 'day' | 'week' | 'month' | 'year'): Promise<ActivitySummary> {
    try {
      return await this.userActivityTrackingService.getActivitySummary(period);
    } catch (error) {
      throw new HttpException(
        'Failed to get activity summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId/analytics')
  async getUserActivityAnalytics(@Param('userId') userId: string): Promise<UserActivityAnalytics> {
    try {
      return await this.userActivityTrackingService.getUserActivityAnalytics(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to get user activity analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
