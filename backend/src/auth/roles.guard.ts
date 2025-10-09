import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('Kullanıcı bilgisi bulunamadı');
    }

    // User'ın role bilgisini kontrol et
    const userRole = user.role;
    const hasRole = requiredRoles.includes(userRole);
    
    if (!hasRole) {
      throw new ForbiddenException(`Bu işlem için ${requiredRoles.join(' veya ')} rolü gereklidir`);
    }
    
    return true;
  }
}
