import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
  beforeBreadcrumb?: (breadcrumb: Sentry.Breadcrumb) => Sentry.Breadcrumb | null;
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.initializeSentry();
  }

  /**
   * Sentry'yi başlat
   */
  private async initializeSentry(): Promise<void> {
    try {
      const dsn = this.configService.get<string>('SENTRY_DSN');
      if (!dsn) {
        this.logger.warn('SENTRY_DSN not configured, skipping Sentry initialization');
        return;
      }

      const config: SentryConfig = {
        dsn,
        environment: this.configService.get<string>('NODE_ENV', 'development'),
        release: this.configService.get<string>('SENTRY_RELEASE', '1.0.0'),
        tracesSampleRate: this.configService.get<number>('SENTRY_TRACES_SAMPLE_RATE', 0.1),
        profilesSampleRate: this.configService.get<number>('SENTRY_PROFILES_SAMPLE_RATE', 0.1),
        beforeSend: this.beforeSend.bind(this),
        beforeBreadcrumb: this.beforeBreadcrumb.bind(this),
      };

      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        tracesSampleRate: config.tracesSampleRate,
        profilesSampleRate: config.profilesSampleRate,
        integrations: [
          // v8 API: fonksiyon çağrıları ile integration oluşturulur
          Sentry.httpIntegration(),
          Sentry.prismaIntegration(),
          Sentry.onUncaughtExceptionIntegration(),
          Sentry.onUnhandledRejectionIntegration(),
        ],
        beforeSend: config.beforeSend as any,
        beforeBreadcrumb: config.beforeBreadcrumb,
        attachStacktrace: true,
        sendDefaultPii: false,
        maxBreadcrumbs: 50,
        debug: this.configService.get<boolean>('SENTRY_DEBUG', false),
      });

      this.isInitialized = true;
      this.logger.log('Sentry initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Sentry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Error gönder
   */
  captureException(error: Error, context?: ErrorContext): void {
    if (!this.isInitialized) return;

    try {
      Sentry.withScope((scope) => {
        if (context?.userId) {
          scope.setUser({ id: context.userId });
        }
        
        if (context?.requestId) {
          scope.setTag('requestId', context.requestId);
        }
        
        if (context?.operation) {
          scope.setTag('operation', context.operation);
        }
        
        if (context?.metadata) {
          scope.setContext('metadata', context.metadata);
        }

        Sentry.captureException(error);
      });
    } catch (err) {
      this.logger.error(`Failed to capture exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Message gönder
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: ErrorContext): void {
    if (!this.isInitialized) return;

    try {
      Sentry.withScope((scope) => {
        if (context?.userId) {
          scope.setUser({ id: context.userId });
        }
        
        if (context?.requestId) {
          scope.setTag('requestId', context.requestId);
        }
        
        if (context?.operation) {
          scope.setTag('operation', context.operation);
        }
        
        if (context?.metadata) {
          scope.setContext('metadata', context.metadata);
        }

        scope.setLevel(level);
        Sentry.captureMessage(message);
      });
    } catch (err) {
      this.logger.error(`Failed to capture message: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Breadcrumb ekle
   */
  addBreadcrumb(message: string, category: string, level: Sentry.SeverityLevel = 'info', data?: any): void {
    if (!this.isInitialized) return;

    try {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000,
      });
    } catch (err) {
      this.logger.error(`Failed to add breadcrumb: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * User context set et
   */
  setUserContext(userId: string, userData?: { email?: string; role?: string; name?: string }): void {
    if (!this.isInitialized) return;

    try {
      Sentry.setUser({
        id: userId,
        email: userData?.email,
        username: userData?.name,
        extra: {
          role: userData?.role,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to set user context: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Tag ekle
   */
  setTag(key: string, value: string): void {
    if (!this.isInitialized) return;

    try {
      Sentry.setTag(key, value);
    } catch (err) {
      this.logger.error(`Failed to set tag: ${err instanceof Error ? err.message : String(err)}`);
      
    }
  }

  /**
   * Context ekle
   */
  setContext(key: string, context: any): void {
    if (!this.isInitialized) return;

    try {
      Sentry.setContext(key, context);
    } catch (err) {
      this.logger.error(`Failed to set context: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Transaction başlat
   */
  startTransaction(name: string, op: string): any {
    if (!this.isInitialized) return undefined;

    try {
      return Sentry.startSpan({
        name,
        op,
        attributes: {
          source: 'custom',
        },
      }, () => {});
    } catch (err) {
      this.logger.error(`Failed to start transaction: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  /**
   * Span oluştur
   */
  startSpan(transaction: any, name: string, op: string): any {
    if (!this.isInitialized || !transaction) return undefined;

    try {
      return transaction.startChild({
        name,
        op,
      });
    } catch (err) {
      this.logger.error(`Failed to start span: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  /**
   * Performance monitoring
   */
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    if (!this.isInitialized) {
      return fn();
    }

    const transaction = this.startTransaction(operation, 'function');
    if (!transaction) {
      return fn();
    }

    try {
      if (context?.userId) {
        this.setUserContext(context.userId);
      }

      const result = await fn();
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      this.captureException(error as Error, context);
      throw error;
    } finally {
      transaction.finish();
    }
  }

  /**
   * Database query monitoring
   */
  async monitorDatabaseQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    // v8: Scope#getSpan mevcut; getCurrentScope().getSpan()
    const span = (Sentry.getActiveSpan() as any)?.startChild({
      name: queryName,
      op: 'db.query',
    });

    try {
      const result = await query();
      span?.setStatus('ok');
      return result;
    } catch (error) {
      span?.setStatus('internal_error');
      this.captureException(error as Error, {
        ...context,
        operation: 'database_query',
        metadata: { queryName },
      });
      throw error;
    } finally {
      span?.finish();
    }
  }

  /**
   * HTTP request monitoring
   */
  async monitorHttpRequest<T>(
    url: string,
    method: string,
    request: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    const span = (Sentry.getActiveSpan() as any)?.startChild({
      name: `${method} ${url}`,
      op: 'http.client',
    });

    try {
      const result = await request();
      span?.setStatus('ok');
      return result;
    } catch (error) {
      span?.setStatus('internal_error');
      this.captureException(error as Error, {
        ...context,
        operation: 'http_request',
        metadata: { url, method },
      });
      throw error;
    } finally {
      span?.finish();
    }
  }

  /**
   * AI request monitoring
   */
  async monitorAIRequest<T>(
    promptType: string,
    model: string,
    request: () => Promise<T>,
    context?: ErrorContext
  ): Promise<T> {
    const span = (Sentry.getActiveSpan() as any)?.startChild({
      name: `AI ${promptType}`,
      op: 'ai.request',
    });

    try {
      const result = await request();
      span?.setStatus('ok');
      return result;
    } catch (error) {
      span?.setStatus('internal_error');
      this.captureException(error as Error, {
        ...context,
        operation: 'ai_request',
        metadata: { promptType, model },
      });
      throw error;
    } finally {
      span?.finish();
    }
  }

  /**
   * Before send hook
   */
  private beforeSend(event: Sentry.Event): Sentry.Event | null {
    try {
      // Sensitive data filtering
      if (event.request?.data) {
        event.request.data = this.filterSensitiveData(event.request.data);
      }

      if (event.extra) {
        event.extra = this.filterSensitiveData(event.extra);
      }

      // Rate limiting
      const rateLimitKey = `sentry_rate_limit:${event.event_id}`;
      // Implement rate limiting logic here

      return event;
    } catch (error) {
      this.logger.error(`Before send hook error: ${error instanceof Error ? error.message : String(error)}`);
      return event;
    }
  }

  /**
   * Before breadcrumb hook
   */
  private beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
    try {
      // Filter sensitive breadcrumbs
      if (breadcrumb.data) {
        breadcrumb.data = this.filterSensitiveData(breadcrumb.data);
      }

      return breadcrumb;
    } catch (error) {
      this.logger.error(`Before breadcrumb hook error: ${error instanceof Error ? error.message : String(error)}`);
      return breadcrumb;
    }
  }

  /**
   * Sensitive data filtering
   */
  private filterSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
    const filtered = { ...data };

    for (const key in filtered) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        filtered[key] = '[FILTERED]';
      } else if (typeof filtered[key] === 'object') {
        filtered[key] = this.filterSensitiveData(filtered[key]);
      }
    }

    return filtered;
  }

  /**
   * Health check
   */
  getHealthStatus(): { status: 'healthy' | 'unhealthy'; initialized: boolean } {
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      initialized: this.isInitialized,
    };
  }

  /**
   * Flush pending events
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return true;

    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      this.logger.error(`Failed to flush Sentry: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Close Sentry
   */
  async close(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await Sentry.close();
      this.isInitialized = false;
      this.logger.log('Sentry closed');
    } catch (error) {
      this.logger.error(`Failed to close Sentry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
