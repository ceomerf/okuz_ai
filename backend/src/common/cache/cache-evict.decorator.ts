import { SetMetadata } from '@nestjs/common';

export const CACHE_EVICT_METADATA = 'cache_evict';

export interface CacheEvictOptions {
  key?: string;
  pattern?: string;
  allEntries?: boolean;
  beforeInvocation?: boolean;
}

export const CacheEvict = (options: CacheEvictOptions) => {
  return SetMetadata(CACHE_EVICT_METADATA, options);
};

// Convenience decorators
export const EvictUserCache = (userIdParam = 'userId') => {
  return CacheEvict({
    pattern: `user:{${userIdParam}}*`,
    beforeInvocation: true,
  });
};

export const EvictPlanCache = (planIdParam = 'planId', userIdParam?: string) => {
  const options: CacheEvictOptions = {
    key: `plan:{${planIdParam}}`,
    beforeInvocation: true,
  };
  
  if (userIdParam) {
    options.pattern = `user:{${userIdParam}}:plans`;
  }
  
  return CacheEvict(options);
};

export const EvictProgressCache = (userIdParam = 'userId') => {
  return CacheEvict({
    pattern: `user:{${userIdParam}}:progress`,
    beforeInvocation: true,
  });
};

export const EvictAllCache = () => {
  return CacheEvict({
    allEntries: true,
    beforeInvocation: true,
  });
};

// New enterprise-grade cache eviction decorators
export const EvictUserProfileCache = (userIdParam = 'userId') => {
  return CacheEvict({
    pattern: `user:{${userIdParam}}:profile*`,
    beforeInvocation: true,
  });
};

export const EvictStudySessionCache = (userIdParam = 'userId') => {
  return CacheEvict({
    pattern: `user:{${userIdParam}}:sessions*`,
    beforeInvocation: true,
  });
};

export const EvictAnalyticsCache = (userIdParam = 'userId') => {
  return CacheEvict({
    pattern: `user:{${userIdParam}}:analytics*`,
    beforeInvocation: true,
  });
};
