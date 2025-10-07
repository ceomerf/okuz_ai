import { Logger } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  service?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
  // Ek bağlam alanları (esnek)
  error?: string;
  stack?: string;
  resource?: string;
  value?: number | string;
  url?: string;
  statusCode?: number;
  table?: string;
  key?: string;
  hit?: boolean;
  success?: boolean;
  promptType?: string;
  tokens?: number;
  cost?: number;
  channel?: string;
  type?: string;
  event?: string;
  job?: string;
  status?: string;
  tags?: Record<string, string>;
  responseTime?: number;
  [extra: string]: any;
}

export class LoggerUtil {
  private static logger = new Logger('Application');

  static log(level: LogLevel, message: string, context?: LogContext): void {
    const logData = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    switch (level) {
      case LogLevel.ERROR:
        this.logger.error(message, JSON.stringify(logData));
        break;
      case LogLevel.WARN:
        this.logger.warn(message, JSON.stringify(logData));
        break;
      case LogLevel.INFO:
        this.logger.log(message, JSON.stringify(logData));
        break;
      case LogLevel.DEBUG:
        this.logger.debug(message, JSON.stringify(logData));
        break;
      case LogLevel.VERBOSE:
        this.logger.verbose(message, JSON.stringify(logData));
        break;
    }
  }

  static error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    });
  }

  static warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  static info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  static debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  static verbose(message: string, context?: LogContext): void {
    this.log(LogLevel.VERBOSE, message, context);
  }

  static performance(operation: string, duration: number, context?: LogContext): void {
    this.log(LogLevel.INFO, `Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      type: 'performance',
    });
  }

  static security(event: string, context?: LogContext): void {
    this.log(LogLevel.WARN, `Security: ${event}`, {
      ...context,
      type: 'security',
    });
  }

  static audit(action: string, resource: string, context?: LogContext): void {
    this.log(LogLevel.INFO, `Audit: ${action}`, {
      ...context,
      action,
      resource,
      type: 'audit',
    });
  }

  static business(metric: string, value: number, context?: LogContext): void {
    this.log(LogLevel.INFO, `Business: ${metric}`, {
      ...context,
      metric,
      value,
      type: 'business',
    });
  }

  static api(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    this.log(LogLevel.INFO, `API: ${method} ${url}`, {
      ...context,
      method,
      url,
      statusCode,
      duration,
      type: 'api',
    });
  }

  static database(operation: string, table: string, duration: number, context?: LogContext): void {
    this.log(LogLevel.DEBUG, `Database: ${operation}`, {
      ...context,
      operation,
      table,
      duration,
      type: 'database',
    });
  }

  static cache(operation: string, key: string, hit: boolean, duration: number, context?: LogContext): void {
    this.log(LogLevel.DEBUG, `Cache: ${operation}`, {
      ...context,
      operation,
      key,
      hit,
      duration,
      type: 'cache',
    });
  }

  static external(service: string, operation: string, duration: number, success: boolean, context?: LogContext): void {
    this.log(LogLevel.INFO, `External: ${service} ${operation}`, {
      ...context,
      service,
      operation,
      duration,
      success,
      type: 'external',
    });
  }

  static ai(model: string, promptType: string, tokens: number, duration: number, cost: number, context?: LogContext): void {
    this.log(LogLevel.INFO, `AI: ${model} ${promptType}`, {
      ...context,
      model,
      promptType,
      tokens,
      duration,
      cost,
      type: 'ai',
    });
  }

  static notification(channel: string, type: string, userId: string, success: boolean, context?: LogContext): void {
    this.log(LogLevel.INFO, `Notification: ${channel} ${type}`, {
      ...context,
      channel,
      type,
      userId,
      success,
      category: 'notification',
    });
  }

  static websocket(event: string, userId: string, success: boolean, context?: LogContext): void {
    this.log(LogLevel.DEBUG, `WebSocket: ${event}`, {
      ...context,
      event,
      userId,
      success,
      type: 'websocket',
    });
  }

  static queue(job: string, status: string, duration: number, context?: LogContext): void {
    this.log(LogLevel.INFO, `Queue: ${job}`, {
      ...context,
      job,
      status,
      duration,
      type: 'queue',
    });
  }

  static health(service: string, status: string, responseTime: number, context?: LogContext): void {
    this.log(LogLevel.INFO, `Health: ${service}`, {
      ...context,
      service,
      status,
      responseTime,
      type: 'health',
    });
  }

  static metrics(metric: string, value: number, tags: Record<string, string>, context?: LogContext): void {
    this.log(LogLevel.INFO, `Metrics: ${metric}`, {
      ...context,
      metric,
      value,
      tags,
      type: 'metrics',
    });
  }
}
