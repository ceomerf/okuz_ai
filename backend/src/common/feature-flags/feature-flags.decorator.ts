import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Decorator to mark a method or controller as requiring a feature flag
 */
export const RequireFeatureFlag = (flagKey: string, options?: {
  fallback?: boolean;
  variant?: string;
  context?: Record<string, any>;
}) => SetMetadata(FEATURE_FLAG_KEY, { flagKey, ...options });

/**
 * Decorator to mark a method as a feature flag endpoint
 */
export const FeatureFlagEndpoint = (flagKey: string, description?: string) => 
  SetMetadata(FEATURE_FLAG_KEY, { flagKey, description, isEndpoint: true });
