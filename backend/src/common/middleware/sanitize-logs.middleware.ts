import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = ['password', 'pass', 'token', 'authorization', 'secret', 'apiKey'];

function maskValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length <= 8) return '[REDACTED]';
    return `${value.slice(0, 2)}****${value.slice(-2)}`;
  }
  return '[REDACTED]';
}

function deepMask(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const clone: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clone[key] = maskValue(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      clone[key] = deepMask(obj[key]);
    } else {
      clone[key] = obj[key];
    }
  }
  return clone;
}

export function sanitizeLogsMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.headers && req.headers.authorization) {
    req.headers.authorization = 'Bearer ****';
  }
  if (req.body && typeof req.body === 'object') {
    req.body = deepMask(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepMask(req.query);
  }
  next();
}


