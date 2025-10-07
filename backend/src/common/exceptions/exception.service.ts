import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { LoggingService } from '../logging/logging.service';

export interface ExceptionContext {
  userId?: string;
  planId?: string;
  sessionId?: string;
  operation?: string;
  [key: string]: any;
}

@Injectable()
export class ExceptionService {
  private readonly logger = new Logger(ExceptionService.name);

  constructor(
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Planning specific error handling
   */
  handlePlanningError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Planning error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      return error;
    }

    // Handle specific planning errors
    if (error.message?.includes('Plan not found')) {
      return new NotFoundException(message);
    }

    if (error.message?.includes('Invalid plan data')) {
      return new BadRequestException(message);
    }

    if (error.message?.includes('Plan already exists')) {
      return new ConflictException(message);
    }

    // Default to internal server error
    return new InternalServerErrorException(message);
  }

  /**
   * AI service error handling
   */
  handleAIError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`AI error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    if (error.message?.includes('Rate limit exceeded')) {
      return new BadRequestException('AI service rate limit exceeded. Please try again later.');
    }

    if (error.message?.includes('Invalid API key')) {
      return new InternalServerErrorException('AI service configuration error');
    }

    if (error.message?.includes('Model not available')) {
      return new BadRequestException('Requested AI model is not available');
    }

    return new InternalServerErrorException(message);
  }

  /**
   * Database error handling
   */
  handleDatabaseError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Database error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    if (error.message?.includes('Unique constraint')) {
      return new ConflictException('Resource already exists');
    }

    if (error.message?.includes('Foreign key constraint')) {
      return new BadRequestException('Invalid reference to related resource');
    }

    if (error.message?.includes('Connection timeout')) {
      return new InternalServerErrorException('Database connection timeout');
    }

    return new InternalServerErrorException(message);
  }

  /**
   * Validation error handling
   */
  handleValidationError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Validation error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    return new BadRequestException(message);
  }

  /**
   * Authentication error handling
   */
  handleAuthError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Authentication error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    return new BadRequestException(message);
  }

  /**
   * Authorization error handling
   */
  handleAuthorizationError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Authorization error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    return new BadRequestException(message);
  }

  /**
   * Rate limiting error handling
   */
  handleRateLimitError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Rate limit error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    return new BadRequestException(message);
  }

  /**
   * Cache error handling
   */
  handleCacheError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Cache error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    // Cache errors should not break the application
    return new InternalServerErrorException('Cache service temporarily unavailable');
  }

  /**
   * Queue error handling
   */
  handleQueueError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Queue error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    return new InternalServerErrorException('Background job service temporarily unavailable');
  }

  /**
   * External service error handling
   */
  handleExternalServiceError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`External service error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    if (error.message?.includes('timeout')) {
      return new InternalServerErrorException('External service timeout');
    }

    if (error.message?.includes('network')) {
      return new InternalServerErrorException('External service network error');
    }

    return new InternalServerErrorException(message);
  }

  /**
   * Generic error handling
   */
  handleGenericError(error: any, message: string, context: ExceptionContext = {}): Error {
    this.loggingService.error(`Generic error: ${message}`, {
      ...context,
      error: error.message,
      stack: error.stack,
    });

    return new InternalServerErrorException(message);
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    try {
      const now = new Date();
      let startTime: Date;

      switch (timeframe) {
        case 'hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      // This would require a proper error tracking system
      // For now, return mock data
      return {
        timeframe,
        totalErrors: 0,
        errorTypes: {},
        topErrors: [],
        errorRate: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get error statistics', { error: (error instanceof Error ? error.message : String(error)) });
      return null;
    }
  }
}
