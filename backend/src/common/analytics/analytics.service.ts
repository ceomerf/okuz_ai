import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../queue/queue.service';

export interface AnalyticsEvent {
  event: string;
  userId: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface UserProperties {
  userId: string;
  email: string;
  name: string;
  role: string;
  segments: string[];
  createdAt: Date;
  lastActiveAt: Date;
  subscriptionStatus?: string;
  planType?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {
    this.isEnabled = this.configService.get<string>('ANALYTICS_ENABLED', 'true') === 'true';
  }

  /**
   * Track a user event
   */
  async trackEvent(
    event: string,
    userId: string,
    properties: Record<string, any> = {},
    sessionId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const analyticsEvent: AnalyticsEvent = {
        event,
        userId,
        properties,
        timestamp: new Date(),
        sessionId,
        context,
      };

      // Send to analytics queue for processing
      await this.queueService.add('analytics', 'track-event', analyticsEvent);

      this.logger.log(`Event tracked: ${event} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to track event ${event}: ${error.message}`);
    }
  }

  /**
   * Track user registration
   */
  async trackUserRegistration(userId: string, userData: {
    email: string;
    name: string;
    role: string;
    registrationMethod: string;
  }): Promise<void> {
    await this.trackEvent('user_registered', userId, {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      registration_method: userData.registrationMethod,
      registration_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track plan creation
   */
  async trackPlanCreation(userId: string, planData: {
    planId: string;
    planType: string;
    subjects: string[];
    duration: number;
    goals: string[];
  }): Promise<void> {
    await this.trackEvent('plan_created', userId, {
      plan_id: planData.planId,
      plan_type: planData.planType,
      subjects: planData.subjects,
      duration: planData.duration,
      goals: planData.goals,
      creation_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track smart tool usage
   */
  async trackSmartToolUsage(userId: string, toolData: {
    tool: string;
    subject?: string;
    grade?: string;
    duration?: number;
    success: boolean;
  }): Promise<void> {
    await this.trackEvent('smart_tool_used', userId, {
      tool: toolData.tool,
      subject: toolData.subject,
      grade: toolData.grade,
      duration: toolData.duration,
      success: toolData.success,
      usage_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track session completion
   */
  async trackSessionCompletion(userId: string, sessionData: {
    sessionId: string;
    subject: string;
    duration: number;
    performance: number;
    completed: boolean;
  }): Promise<void> {
    await this.trackEvent('session_completed', userId, {
      session_id: sessionData.sessionId,
      subject: sessionData.subject,
      duration: sessionData.duration,
      performance: sessionData.performance,
      completed: sessionData.completed,
      completion_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track subscription events
   */
  async trackSubscriptionEvent(userId: string, subscriptionData: {
    event: 'started' | 'renewed' | 'cancelled' | 'expired';
    planType: string;
    amount: number;
    currency: string;
    paymentMethod: string;
  }): Promise<void> {
    await this.trackEvent(`subscription_${subscriptionData.event}`, userId, {
      plan_type: subscriptionData.planType,
      amount: subscriptionData.amount,
      currency: subscriptionData.currency,
      payment_method: subscriptionData.paymentMethod,
      event_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track feature flag evaluation
   */
  async trackFeatureFlagEvaluation(userId: string, flagData: {
    flagKey: string;
    enabled: boolean;
    variant?: string;
    reason: string;
  }): Promise<void> {
    await this.trackEvent('feature_flag_evaluated', userId, {
      flag_key: flagData.flagKey,
      enabled: flagData.enabled,
      variant: flagData.variant,
      reason: flagData.reason,
      evaluation_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track user engagement
   */
  async trackUserEngagement(userId: string, engagementData: {
    action: string;
    page?: string;
    feature?: string;
    duration?: number;
    value?: number;
  }): Promise<void> {
    await this.trackEvent('user_engagement', userId, {
      action: engagementData.action,
      page: engagementData.page,
      feature: engagementData.feature,
      duration: engagementData.duration,
      value: engagementData.value,
      engagement_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track conversion events
   */
  async trackConversion(userId: string, conversionData: {
    funnel: string;
    step: string;
    value?: number;
    properties?: Record<string, any>;
  }): Promise<void> {
    await this.trackEvent('conversion', userId, {
      funnel: conversionData.funnel,
      step: conversionData.step,
      value: conversionData.value,
      ...conversionData.properties,
      conversion_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Identify user properties
   */
  async identifyUser(userId: string, properties: UserProperties): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.queueService.add('analytics', 'identify-user', {
        userId,
        properties,
        timestamp: new Date(),
      });

      this.logger.log(`User identified: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to identify user ${userId}: ${error.message}`);
    }
  }

  /**
   * Track page views
   */
  async trackPageView(userId: string, pageData: {
    page: string;
    title?: string;
    url?: string;
    referrer?: string;
    properties?: Record<string, any>;
  }): Promise<void> {
    await this.trackEvent('page_viewed', userId, {
      page: pageData.page,
      title: pageData.title,
      url: pageData.url,
      referrer: pageData.referrer,
      ...pageData.properties,
      view_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track errors
   */
  async trackError(userId: string, errorData: {
    error: string;
    message: string;
    stack?: string;
    context?: Record<string, any>;
  }): Promise<void> {
    await this.trackEvent('error_occurred', userId, {
      error: errorData.error,
      message: errorData.message,
      stack: errorData.stack,
      ...errorData.context,
      error_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(dateRange: { start: Date; end: Date }): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    topEvents: Array<{ event: string; count: number }>;
    topUsers: Array<{ userId: string; eventCount: number }>;
  }> {
    // This would typically query your analytics database
    // For now, return mock data
    return {
      totalEvents: 0,
      uniqueUsers: 0,
      topEvents: [],
      topUsers: [],
    };
  }
}
