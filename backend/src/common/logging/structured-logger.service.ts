import { Injectable, Logger, LoggerService, LogLevel } from '@nestjs/common';

export interface LogContext {
  userId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
  requestId?: string;
  sessionId?: string;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);

  log(message: string, context?: LogContext): void {
    this.writeLog('log', message, context);
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.writeLog('error', message, context, {
      name: 'Error',
      message,
      stack: trace,
    });
  }

  warn(message: string, context?: LogContext): void {
    this.writeLog('warn', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.writeLog('debug', message, context);
  }

  verbose(message: string, context?: LogContext): void {
    this.writeLog('verbose', message, context);
  }

  /**
   * İş operasyonları için özel log metodu
   */
  logBusinessOperation(operation: string, userId?: string, metadata?: Record<string, any>): void {
    this.log(`Business operation: ${operation}`, {
      userId,
      operation,
      metadata,
    });
  }

  /**
   * Performans metrikleri için log
   */
  logPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.log(`Performance: ${operation} took ${duration}ms`, {
      operation,
      metadata: {
        ...metadata,
        duration,
        performance: true,
      },
    });
  }

  /**
   * Güvenlik olayları için log
   */
  logSecurityEvent(event: string, userId?: string, metadata?: Record<string, any>): void {
    this.warn(`Security event: ${event}`, {
      userId,
      operation: 'security',
      metadata: {
        ...metadata,
        securityEvent: true,
        event,
      },
    });
  }

  /**
   * API istekleri için log
   */
  logApiRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
    this.log(`API Request: ${method} ${url} - ${statusCode}`, {
      userId,
      operation: 'api_request',
      metadata: {
        method,
        url,
        statusCode,
        duration,
      },
    });
  }

  private writeLog(level: LogLevel, message: string, context?: LogContext, error?: any): void {
    const logEntry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    // Production'da JSON formatında log
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      // Development'da daha okunabilir format
      const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
      const errorStr = error ? `\nError: ${error.name} - ${error.message}` : '';
      
      console.log(`[${level.toUpperCase()}] ${message}${contextStr}${errorStr}`);
    }
  }
}
