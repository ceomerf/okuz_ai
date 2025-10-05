import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Özel hata sınıfları - Daha iyi hata yönetimi için
 */

export class BusinessLogicException extends HttpException {
  constructor(message: string, context?: string) {
    super(
      {
        message,
        context,
        timestamp: new Date().toISOString(),
        type: 'BUSINESS_LOGIC_ERROR'
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class ValidationException extends HttpException {
  constructor(message: string, field?: string) {
    super(
      {
        message,
        field,
        timestamp: new Date().toISOString(),
        type: 'VALIDATION_ERROR'
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
      
    super(
      {
        message,
        resource,
        id,
        timestamp: new Date().toISOString(),
        type: 'RESOURCE_NOT_FOUND'
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class UnauthorizedAccessException extends HttpException {
  constructor(action?: string) {
    const message = action 
      ? `Unauthorized to perform action: ${action}`
      : 'Unauthorized access';
      
    super(
      {
        message,
        action,
        timestamp: new Date().toISOString(),
        type: 'UNAUTHORIZED_ACCESS'
      },
      HttpStatus.UNAUTHORIZED
    );
  }
}

export class RateLimitExceededException extends HttpException {
  constructor(limit: number, window: string) {
    super(
      {
        message: `Rate limit exceeded. Maximum ${limit} requests per ${window}`,
        limit,
        window,
        timestamp: new Date().toISOString(),
        type: 'RATE_LIMIT_EXCEEDED'
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

export class ExternalServiceException extends HttpException {
  constructor(service: string, originalError?: any) {
    super(
      {
        message: `External service '${service}' is unavailable`,
        service,
        originalError: process.env.NODE_ENV === 'development' ? originalError : undefined,
        timestamp: new Date().toISOString(),
        type: 'EXTERNAL_SERVICE_ERROR'
      },
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}

export class DatabaseException extends HttpException {
  constructor(operation: string, originalError?: any) {
    super(
      {
        message: `Database operation '${operation}' failed`,
        operation,
        originalError: process.env.NODE_ENV === 'development' ? originalError : undefined,
        timestamp: new Date().toISOString(),
        type: 'DATABASE_ERROR'
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
