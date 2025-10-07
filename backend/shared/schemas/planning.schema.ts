import { z } from 'zod';

// Plan Generation Schemas
export const PlanGenerationRequestSchema = z.object({
  userId: z.string().uuid(),
  subjects: z.array(z.string()).min(1),
  goals: z.array(z.string()).min(1),
  availableTime: z.number().positive(),
  learningStyle: z.string().optional(),
  currentLevel: z.string().optional(),
  preferences: z.record(z.any()).optional(),
  requestId: z.string(),
  timestamp: z.date(),
});

export const PlanGenerationResponseSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['success', 'failed', 'processing']),
  plan: z.any().optional(),
  error: z.string().optional(),
  requestId: z.string(),
  timestamp: z.date(),
});

// Plan Update Schemas
export const PlanUpdateRequestSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  updates: z.record(z.any()),
  requestId: z.string(),
  timestamp: z.date(),
});

export const PlanUpdateResponseSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['success', 'failed']),
  plan: z.any().optional(),
  error: z.string().optional(),
  requestId: z.string(),
  timestamp: z.date(),
});

// Plan Optimization Schemas
export const PlanOptimizationRequestSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().optional(),
  requestId: z.string(),
  timestamp: z.date(),
});

export const PlanOptimizationResponseSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(['success', 'failed']),
  plan: z.any().optional(),
  error: z.string().optional(),
  requestId: z.string(),
  timestamp: z.date(),
});

// Plan Query Schemas
export const GetUserPlansRequestSchema = z.object({
  userId: z.string().uuid(),
  requestId: z.string(),
});

export const GetUserPlansResponseSchema = z.object({
  userId: z.string().uuid(),
  plans: z.array(z.any()),
  requestId: z.string(),
  timestamp: z.date(),
});

// Event Schemas
export const PlanGeneratedEventSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  plan: z.any(),
  requestId: z.string(),
  timestamp: z.date(),
});

export const PlanUpdatedEventSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  plan: z.any(),
  requestId: z.string(),
  timestamp: z.date(),
});

export const PlanOptimizedEventSchema = z.object({
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  plan: z.any(),
  requestId: z.string(),
  timestamp: z.date(),
});

export const PlanGenerationFailedEventSchema = z.object({
  userId: z.string().uuid(),
  error: z.string(),
  requestId: z.string(),
  timestamp: z.date(),
});

// Progress Tracking Event Schema
export const ProgressTrackedEventSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  planId: z.string().uuid(),
  performance: z.object({
    score: z.number().min(0).max(100),
    timeSpent: z.number().positive(),
    notes: z.string().optional(),
  }),
  timestamp: z.date(),
});

// User Profile Updated Event Schema
export const UserProfileUpdatedEventSchema = z.object({
  userId: z.string().uuid(),
  profile: z.object({
    grade: z.string().optional(),
    field: z.string().optional(),
    learningStyle: z.string().optional(),
    preferences: z.record(z.any()).optional(),
  }),
  timestamp: z.date(),
});

// Type exports
export type PlanGenerationRequest = z.infer<typeof PlanGenerationRequestSchema>;
export type PlanGenerationResponse = z.infer<typeof PlanGenerationResponseSchema>;
export type PlanUpdateRequest = z.infer<typeof PlanUpdateRequestSchema>;
export type PlanUpdateResponse = z.infer<typeof PlanUpdateResponseSchema>;
export type PlanOptimizationRequest = z.infer<typeof PlanOptimizationRequestSchema>;
export type PlanOptimizationResponse = z.infer<typeof PlanOptimizationResponseSchema>;
export type GetUserPlansRequest = z.infer<typeof GetUserPlansRequestSchema>;
export type GetUserPlansResponse = z.infer<typeof GetUserPlansResponseSchema>;
export type PlanGeneratedEvent = z.infer<typeof PlanGeneratedEventSchema>;
export type PlanUpdatedEvent = z.infer<typeof PlanUpdatedEventSchema>;
export type PlanOptimizedEvent = z.infer<typeof PlanOptimizedEventSchema>;
export type PlanGenerationFailedEvent = z.infer<typeof PlanGenerationFailedEventSchema>;
export type ProgressTrackedEvent = z.infer<typeof ProgressTrackedEventSchema>;
export type UserProfileUpdatedEvent = z.infer<typeof UserProfileUpdatedEventSchema>;
