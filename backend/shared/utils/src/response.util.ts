import { BaseResponse, PaginatedResponse } from '../../common/src/interfaces/base.interface';

export class ResponseUtil {
  static success<T>(data: T, message?: string, requestId?: string): BaseResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static error(message: string, error?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message,
      error,
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
    requestId?: string
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      message,
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static created<T>(data: T, message?: string, requestId?: string): BaseResponse<T> {
    return {
      success: true,
      data,
      message: message || 'Resource created successfully',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static updated<T>(data: T, message?: string, requestId?: string): BaseResponse<T> {
    return {
      success: true,
      data,
      message: message || 'Resource updated successfully',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static deleted(message?: string, requestId?: string): BaseResponse {
    return {
      success: true,
      message: message || 'Resource deleted successfully',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static notFound(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Resource not found',
      error: 'NOT_FOUND',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static unauthorized(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Unauthorized access',
      error: 'UNAUTHORIZED',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static forbidden(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Forbidden access',
      error: 'FORBIDDEN',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static badRequest(message?: string, error?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Bad request',
      error: error || 'BAD_REQUEST',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static internalError(message?: string, error?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Internal server error',
      error: error || 'INTERNAL_ERROR',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static conflict(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Resource conflict',
      error: 'CONFLICT',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static tooManyRequests(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Too many requests',
      error: 'TOO_MANY_REQUESTS',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static serviceUnavailable(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Service unavailable',
      error: 'SERVICE_UNAVAILABLE',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static timeout(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Request timeout',
      error: 'TIMEOUT',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static validationError(errors: string[], requestId?: string): BaseResponse {
    return {
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      data: { errors },
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static rateLimitExceeded(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Rate limit exceeded',
      error: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  static maintenanceMode(message?: string, requestId?: string): BaseResponse {
    return {
      success: false,
      message: message || 'Service under maintenance',
      error: 'MAINTENANCE_MODE',
      timestamp: new Date(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
