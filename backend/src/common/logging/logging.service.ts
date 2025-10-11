import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface LogContext {
  userId?: string;
  planId?: string;
  sessionId?: string;
  requestId?: string;
  operation?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context: LogContext;
  timestamp: Date;
  service: string;
  correlationId?: string;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Debug level logging
   */
  debug(message: string, context: LogContext = {}): void {
    this.logger.debug(message, context);
    this.logToDatabase('debug', message, context);
  }

  /**
   * Info level logging
   */
  log(message: string, context: LogContext = {}): void {
    this.logger.log(message, context);
    this.logToDatabase('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context: LogContext = {}): void {
    this.logger.warn(message, context);
    this.logToDatabase('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context: LogContext = {}): void {
    this.logger.error(message, context);
    this.logToDatabase('error', message, context);
  }

  /**
   * Planning specific logging
   */
  logPlanningOperation(operation: string, context: LogContext = {}): void {
    this.log(`Planning operation: ${operation}`, {
      ...context,
      operation,
      service: 'planning',
    });
  }

  /**
   * AI operation logging
   */
  logAIOperation(operation: string, context: LogContext = {}): void {
    this.log(`AI operation: ${operation}`, {
      ...context,
      operation,
      service: 'ai',
    });
  }

  /**
   * Performance logging
   */
  logPerformance(operation: string, duration: number, context: LogContext = {}): void {
    this.log(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      service: 'performance',
    });
  }

  /**
   * Security logging
   */
  logSecurity(event: string, context: LogContext = {}): void {
    this.warn(`Security event: ${event}`, {
      ...context,
      event,
      service: 'security',
    });
  }

  /**
   * Database logging
   */
  private async logToDatabase(level: string, message: string, context: LogContext): Promise<void> {
    try {
      // Only log to database in production or when explicitly enabled
      const shouldLogToDb = this.configService.get<string>('NODE_ENV') === 'production' || 
                           this.configService.get<boolean>('LOG_TO_DATABASE', false);

      if (!shouldLogToDb) {
        return;
      }

      await (this.prisma as any).logEntry.create({
        data: {
          level,
          message,
          context: JSON.stringify(context),
          timestamp: new Date(),
          service: context.service || 'planning',
          correlationId: context.correlationId,
          userId: context.userId,
        },
      });
    } catch (error) {
      // Don't throw error for logging failures
      this.logger.error('Failed to log to database', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Get logs for a user
   */
  async getUserLogs(userId: string, limit: number = 100): Promise<LogEntry[]> {
    try {
      const logs = await (this.prisma as any).logEntry.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return logs.map((log: any) => ({
        level: log.level as any,
        message: log.message,
        context: JSON.parse(log.context || '{}'),
        timestamp: log.timestamp,
        service: log.service,
        correlationId: log.correlationId ?? undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to get user logs', { userId, error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Get logs for a service
   */
  async getServiceLogs(service: string, limit: number = 100): Promise<LogEntry[]> {
    try {
      const logs = await (this.prisma as any).logEntry.findMany({
        where: { service },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return logs.map((log: any) => ({
        level: log.level as any,
        message: log.message,
        context: JSON.parse(log.context || '{}'),
        timestamp: log.timestamp,
        service: log.service,
        correlationId: log.correlationId ?? undefined,
      }));
    } catch (error) {
      this.logger.error('Failed to get service logs', { service, error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Clean old logs
   */
  async cleanOldLogs(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await (this.prisma as any).logEntry.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      this.log(`Cleaned logs older than ${daysToKeep} days`);
    } catch (error) {
      this.logger.error('Failed to clean old logs', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
