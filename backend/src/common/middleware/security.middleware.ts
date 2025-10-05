import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  constructor(private readonly structuredLogger: StructuredLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Security headers ekle
    this.addSecurityHeaders(res);
    
    // Request logging
    this.logRequest(req);
    
    // Suspicious activity detection
    this.detectSuspiciousActivity(req);
    
    next();
  }

  private addSecurityHeaders(res: Response): void {
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Content Type Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Frame Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
  }

  private logRequest(req: Request): void {
    const suspiciousPatterns = [
      /\.\./, // Path traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript injection
      /eval\(/i, // Code injection
    ];

    const userAgent = req.headers['user-agent'] || '';
    const url = req.url;
    const method = req.method;

    // Suspicious pattern detection
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(url) || pattern.test(userAgent)
    );

    if (isSuspicious) {
      this.structuredLogger.logSecurityEvent(
        'Suspicious request detected',
        req.user?.id,
        {
          ip: req.ip,
          userAgent,
          url,
          method,
          headers: req.headers,
        }
      );
    }

    // Normal request logging
    this.structuredLogger.logApiRequest(
      method,
      url,
      0, // Status code will be set later
      0, // Duration will be calculated later
      req.user?.id
    );
  }

  private detectSuspiciousActivity(req: Request): void {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    
    // Rate limiting için basit IP tracking
    // Gerçek implementasyonda Redis kullanılmalı
    const suspiciousIps = new Set<string>();
    const requestCounts = new Map<string, number>();
    
    // IP-based rate limiting detection
    const currentCount = requestCounts.get(ip) || 0;
    requestCounts.set(ip, currentCount + 1);
    
    if (currentCount > 100) { // 100 requests threshold
      suspiciousIps.add(ip);
      
      this.structuredLogger.logSecurityEvent(
        'High request volume detected',
        req.user?.id,
        {
          ip,
          requestCount: currentCount,
          userAgent,
        }
      );
    }
    
    // User-Agent analysis
    if (this.isSuspiciousUserAgent(userAgent)) {
      this.structuredLogger.logSecurityEvent(
        'Suspicious User-Agent detected',
        req.user?.id,
        {
          ip,
          userAgent,
        }
      );
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /go-http/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}
