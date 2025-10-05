import { Injectable, Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

export interface ErrorContext {
  userId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  /**
   * Hataları loglar ve kullanıcı dostu mesajlar döndürür
   */
  handleError(error: any, context?: ErrorContext): HttpException {
    // Log the error with context
    this.logError(error, context);

    // Return appropriate HTTP exception
    if (error instanceof HttpException) {
      return error;
    }

    // Handle specific error types
    if (error.code === 'P2002') {
      return this.handleUniqueConstraintError(error, context);
    }

    if (error.code === 'P2025') {
      return this.handleRecordNotFoundError(error, context);
    }

    if (error.name === 'ValidationError') {
      return this.handleValidationError(error, context);
    }

    // Default to internal server error
    return this.handleGenericError(error, context);
  }

  private logError(error: any, context?: ErrorContext): void {
    const logContext = {
      ...context,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
    };

    if (error.status >= 500) {
      this.logger.error('Server Error', error.stack, JSON.stringify(logContext));
    } else if (error.status >= 400) {
      this.logger.warn('Client Error', error.message, JSON.stringify(logContext));
    } else {
      this.logger.log('Error Handled', error.message, JSON.stringify(logContext));
    }
  }

  private handleUniqueConstraintError(error: any, context?: ErrorContext): HttpException {
    const field = error.meta?.target?.[0] || 'field';
    return new HttpException(
      {
        message: `${field} already exists`,
        field,
        timestamp: new Date().toISOString(),
        type: 'UNIQUE_CONSTRAINT_ERROR'
      },
      409
    );
  }

  private handleRecordNotFoundError(error: any, context?: ErrorContext): HttpException {
    return new HttpException(
      {
        message: 'Record not found',
        resource: context?.resource,
        timestamp: new Date().toISOString(),
        type: 'RECORD_NOT_FOUND'
      },
      404
    );
  }

  private handleValidationError(error: any, context?: ErrorContext): HttpException {
    return new HttpException(
      {
        message: 'Validation failed',
        details: error.details,
        timestamp: new Date().toISOString(),
        type: 'VALIDATION_ERROR'
      },
      400
    );
  }

  private handleGenericError(error: any, context?: ErrorContext): HttpException {
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : error.message;

    return new HttpException(
      {
        message,
        timestamp: new Date().toISOString(),
        type: 'INTERNAL_SERVER_ERROR'
      },
      500
    );
  }

  /**
   * Hata istatistiklerini toplar
   */
  async collectErrorStats(): Promise<any> {
    // Bu metod error tracking servisi ile entegre edilebilir
    return {
      totalErrors: 0,
      errorTypes: {},
      lastError: null,
    };
  }
}
