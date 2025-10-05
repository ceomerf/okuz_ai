import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ErrorHandlerService } from '../errors/error-handler.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  constructor(
    private readonly errorHandler: ErrorHandlerService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Request bilgilerini logla
    this.structuredLogger.logApiRequest(
      request.method,
      request.url,
      0, // Henüz status code yok
      0, // Henüz duration yok
      request.user?.id
    );

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.structuredLogger.logPerformance(
          `${request.method} ${request.url}`,
          duration,
          {
            statusCode: response.statusCode,
            userId: request.user?.id,
          }
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Hata context'ini hazırla
        const errorContext = {
          userId: request.user?.id,
          operation: `${request.method} ${request.url}`,
          resource: request.params?.id || request.body?.id,
          metadata: {
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            duration,
            statusCode: error.status || 500,
          },
        };

        // Hatayı işle
        const handledError = this.errorHandler.handleError(error, errorContext);
        
        // Structured logging
        this.structuredLogger.error(
          `API Error: ${request.method} ${request.url}`,
          error.stack,
          errorContext
        );

        return throwError(() => handledError);
      })
    );
  }
}
