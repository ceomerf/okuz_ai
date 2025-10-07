import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // CSRF token'ı kontrol et
    const csrfToken = this.extractCsrfToken(request);
    const sessionToken = this.getSessionToken(request);

    if (!csrfToken || !sessionToken || !this.verifyCsrfToken(csrfToken, sessionToken)) {
      throw new ForbiddenException('CSRF token validation failed');
    }

    // Response'a yeni CSRF token ekle
    this.setCsrfToken(response, sessionToken);

    return true;
  }

  private extractCsrfToken(request: Request): string | null {
    // Header'dan al (önerilen)
    const headerToken = request.headers['x-csrf-token'] as string;
    if (headerToken) return headerToken;

    // Body'den al (form submission için)
    const bodyToken = (request.body as any)?._csrf;
    if (bodyToken) return bodyToken;

    // Query parameter'dan al (GET request'ler için)
    const queryToken = request.query._csrf as string;
    if (queryToken) return queryToken;

    return null;
  }

  private getSessionToken(request: Request): string | null {
    // Session'dan CSRF token al
    return ((request as any).session as any)?.csrfToken || null;
  }

  private verifyCsrfToken(token: string, sessionToken: string): boolean {
    try {
      // Timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(sessionToken, 'hex')
      );
    } catch {
      return false;
    }
  }

  private setCsrfToken(response: Response, sessionToken: string): void {
    // Response header'a CSRF token ekle
    response.setHeader('X-CSRF-Token', sessionToken);
  }

  // CSRF token oluşturma utility
  static generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// CSRF token middleware
export function csrfMiddleware(req: Request, res: Response, next: Function) {
  if (!(req as any).session) {
    (req as any).session = {} as any;
  }

  // Session'da CSRF token yoksa oluştur
  if (!((req as any).session as any).csrfToken) {
    ((req as any).session as any).csrfToken = CsrfGuard.generateCsrfToken();
  }

  // Her response'a CSRF token ekle
  res.setHeader('X-CSRF-Token', ((req as any).session as any).csrfToken);
  next();
}
