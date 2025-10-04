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
  });
};

export const EvictPlanCache = (planIdParam = 'planId', userIdParam?: string) => {
  const options: CacheEvictOptions = {
    key: `plan:{${planIdParam}}`,
  };
  
  if (userIdParam) {
    options.pattern = `user:{${userIdParam}}:plans`;
  }
  
  return CacheEvict(options);
};

export const EvictProgressCache = (userIdParam = 'userId') => {
  return CacheEvict({
    pattern: `user:{${userIdParam}}:progress`,
  });
};

export const EvictAllCache = () => {
  return CacheEvict({
    allEntries: true,
  });
};
