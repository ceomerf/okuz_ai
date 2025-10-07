import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AnalyticsService } from './analytics.service';
import { ANALYTICS_EVENT_KEY } from './analytics.decorator';

@Injectable()
export class AnalyticsInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly analyticsService: AnalyticsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const analyticsConfig = this.reflector.getAllAndOverride(ANALYTICS_EVENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!analyticsConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.trackEvent(analyticsConfig, request, user, response, startTime);
        },
        error: (error) => {
          this.trackError(analyticsConfig, request, user, error, startTime);
        },
      })
    );
  }

  private async trackEvent(
    config: any,
    request: any,
    user: any,
    response: any,
    startTime: number
  ): Promise<void> {
    try {
      if (!user?.id) return;

      const { event, properties = {}, trackPerformance } = config;
      const duration = Date.now() - startTime;

      const eventProperties = {
        ...properties,
        method: request.method,
        url: request.url,
        status_code: response?.status || 200,
        response_time: duration,
        user_agent: request.headers['user-agent'],
        ip_address: request.ip,
      };

      if (trackPerformance) {
        eventProperties.performance = {
          duration,
          memory_usage: process.memoryUsage(),
        };
      }

      await this.analyticsService.trackEvent(
        event,
        user.id,
        eventProperties,
        request.sessionId,
        {
          endpoint: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  private async trackError(
    config: any,
    request: any,
    user: any,
    error: any,
    startTime: number
  ): Promise<void> {
    try {
      if (!user?.id) return;

      const { event, properties = {} } = config;
      const duration = Date.now() - startTime;

      await this.analyticsService.trackError(user.id, {
        error: error.name || 'UnknownError',
        message: error.message,
        stack: error.stack,
        context: {
          ...properties,
          method: request.method,
          url: request.url,
          duration,
          user_agent: request.headers['user-agent'],
          ip_address: request.ip,
        },
      });
    } catch (analyticsError) {
      console.error('Analytics error tracking failed:', analyticsError);
    }
  }
}
