import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx: any = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'STUDENT' } }) }) };
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when user role not in required roles', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) } as any as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx: any = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'STUDENT' } }) }) };
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('allows when user role matches required roles', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['STUDENT', 'TEACHER']) } as any as Reflector;
    const guard = new RolesGuard(reflector);
    const ctx: any = { switchToHttp: () => ({ getRequest: () => ({ user: { role: 'STUDENT' } }) }) };
    expect(guard.canActivate(ctx)).toBe(true);
  });
});


