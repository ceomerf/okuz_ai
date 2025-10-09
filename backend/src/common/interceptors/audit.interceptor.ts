import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    const method: string = req.method;
    const url: string = req.originalUrl || req.url;
    const user = req.user || {};
    const userId: string | undefined = user.id;
    const ipAddress: string | undefined = req.ip;
    const userAgent: string | undefined = req.headers['user-agent'];
    const correlationId: string = req.headers['x-request-id'] || randomUUID();

    const shouldLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!shouldLog) {
      return next.handle();
    }

    const entityType = this.extractEntityType(url);
    const entityId = this.extractEntityId(req);

    const metadataBase = {
      method,
      url,
      correlationId,
      query: req.query,
      params: req.params,
      headers: {
        'content-type': req.headers['content-type'],
      },
    } as Record<string, any>;

    return next.handle().pipe(
      tap(async (responseBody) => {
        await this.auditService.logAction({
          userId: userId || 'anonymous',
          action: `${method} ${url}`,
          entityType: entityType || 'unknown',
          entityId: entityId || 'n/a',
          oldValues: {},
          newValues: this.safeBody(req.body),
          ipAddress,
          userAgent,
          metadata: { ...metadataBase, status: 'success', responseSample: this.sampleResponse(responseBody) },
        });
      }),
      catchError((err) => {
        // Log failure as well
        this.auditService
          .logAction({
            userId: userId || 'anonymous',
            action: `${method} ${url}`,
            entityType: entityType || 'unknown',
            entityId: entityId || 'n/a',
            oldValues: {},
            newValues: this.safeBody(req.body),
            ipAddress,
            userAgent,
            metadata: { ...metadataBase, status: 'error', error: err?.message || String(err) },
          })
          .catch(() => void 0);

        throw err;
      }),
    );
  }

  private extractEntityType(url: string): string | undefined {
    // e.g. /api/v1/admin/users/123 -> users
    const parts = url.split('?')[0].split('/').filter(Boolean);
    if (parts.length === 0) return undefined;
    // Try to find a resource-like segment (skip api, v1, admin)
    const skip = new Set(['api', 'v1', 'v2', 'admin']);
    for (const p of parts) {
      if (!skip.has(p)) return p;
    }
    return parts[parts.length - 1];
  }

  private extractEntityId(req: any): string | undefined {
    return req.params?.id || req.params?.userId || req.params?.roleId || undefined;
  }

  private safeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const clone = { ...body } as Record<string, any>;
    // scrub secrets
    for (const key of Object.keys(clone)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('secret') || lower.includes('token')) {
        clone[key] = '[REDACTED]';
      }
    }
    return clone;
  }

  private sampleResponse(resp: any): any {
    if (resp && typeof resp === 'object') {
      const { data, success, message } = resp as any;
      return { success, message, hasData: Boolean(data) };
    }
    return undefined;
  }
}


