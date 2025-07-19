import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class HttpError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // V8 stack trace'ini korur
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Firebase errors handling
  if (error.message?.includes('auth/')) {
    statusCode = 401;
    message = 'Kimlik doğrulama hatası';
  } else if (error.message?.includes('not-found')) {
    statusCode = 404;
    message = 'Kaynak bulunamadı';
  } else if (error.message?.includes('permission-denied')) {
    statusCode = 403;
    message = 'Erişim reddedildi';
  } else if (error.message?.includes('invalid-argument')) {
    statusCode = 400;
    message = 'Geçersiz parametreler';
  }

  // Development ortamında detaylı error
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse: any = {
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (isDevelopment) {
    errorResponse.stack = error.stack;
    errorResponse.details = error.message;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`❌ Server Error [${statusCode}]:`, {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  } else {
    logger.warn(`⚠️ Client Error [${statusCode}]:`, {
      message: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new HttpError(`Route ${req.originalUrl} bulunamadı`, 404);
  next(error);
};

// Async error catcher
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
}; 