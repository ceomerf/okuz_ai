import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAG_KEY } from './feature-flags.decorator';

@Injectable()
export class FeatureFlagsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureFlagConfig = this.reflector.getAllAndOverride(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureFlagConfig) {
      return true; // No feature flag required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const { flagKey, fallback = false, variant, context: flagContext = {} } = featureFlagConfig;

    try {
      const isEnabled = await this.featureFlagsService.isFeatureEnabled(
        flagKey,
        user.id,
        user.role,
        user.segments || [],
        { ...flagContext, ...request.body, ...request.query }
      );

      if (!isEnabled) {
        if (fallback) {
          // Return fallback response instead of throwing error
          request.featureFlagFallback = true;
          return true;
        }
        
        throw new ForbiddenException(`Feature ${flagKey} is not enabled for this user`);
      }

      // Record the evaluation for analytics
      await this.featureFlagsService.recordEvaluation(
        flagKey,
        user.id,
        true,
        'Feature flag enabled'
      );

      // Add feature flag info to request
      request.featureFlag = {
        key: flagKey,
        enabled: true,
        variant,
      };

      return true;

    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Log error but don't block request if feature flag service fails
      console.error(`Feature flag evaluation failed for ${flagKey}:`, error);
      
      if (fallback) {
        request.featureFlagFallback = true;
        return true;
      }

      throw new ForbiddenException(`Feature flag evaluation failed: ${error.message}`);
    }
  }
}
