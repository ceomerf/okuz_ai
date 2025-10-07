import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.headers['X-API-Key'];
    const expected = process.env.EXTERNAL_API_KEY;
    if (!expected || !apiKey || apiKey !== expected) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return true;
  }
}


