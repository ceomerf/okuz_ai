import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache:key';
export const CACHE_TTL = 'cache:ttl';

export function Cacheable(key: string, ttl: number = 300) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    SetMetadata(CACHE_KEY, key)(target, propertyName, descriptor);
    SetMetadata(CACHE_TTL, ttl)(target, propertyName, descriptor);
    return descriptor;
  };
}

export function EvictUserCache(userIdParam: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    SetMetadata('evict:user', userIdParam)(target, propertyName, descriptor);
    return descriptor;
  };
}

export function EvictPlanCache(planIdParam: string, userIdParam: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    SetMetadata('evict:plan', { planId: planIdParam, userId: userIdParam })(target, propertyName, descriptor);
    return descriptor;
  };
}
