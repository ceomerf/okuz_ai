export const ROLES = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  TEACHER: 'TEACHER',
} as const;

export const CACHE_KEYS = {
  MEB_TOPICS: (subject?: string, grade?: string) => `meb-topics:${subject || 'all'}:${grade || 'all'}`,
} as const;

export const QUEUES = {
  PLAN_GENERATION: 'plan-generation',
  GENERATE_PLAN: 'generate-plan',
} as const;

export const RATE_LIMIT_PROFILES = {
  STREAMING: { limit: 2, ttl: 60_000 },
  COSTLY: { limit: 10, ttl: 60_000 },
} as const;


