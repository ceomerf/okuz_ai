import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const traceId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).traceId = traceId;
  next();
}


