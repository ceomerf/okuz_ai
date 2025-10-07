import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { PlanGenerationService } from './plan-generation.service';
import { PlanValidationService } from './plan-validation.service';
import { PlanOptimizationService } from './plan-optimization.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { EventBusService } from './events/event-bus.service';
import { MessageQueueService } from './queue/message-queue.service';

export interface PlanGenerationRequest {
  userId: string;
  subjects: string[];
  goals: string[];
  availableTime: number;
  learningStyle?: string;
  currentLevel?: string;
  preferences?: Record<string, any>;
  requestId: string;
  timestamp: Date;
}

export interface PlanGenerationResponse {
  planId: string;
  userId: string;
  status: 'success' | 'failed' | 'processing';
  plan?: any;
  error?: string;
  requestId: string;
  timestamp: Date;
}

export interface PlanUpdateRequest {
  planId: string;
  userId: string;
  updates: Record<string, any>;
  requestId: string;
  timestamp: Date;
}

export interface PlanUpdateResponse {
  planId: string;
  userId: string;
  status: 'success' | 'failed';
  plan?: any;
  error?: string;
  requestId: string;
  timestamp: Date;
}

@Injectable()
export class PlanningFacade {
  private readonly logger = new Logger(PlanningFacade.name);

  constructor(
    private readonly planGeneration: PlanGenerationService,
    private readonly planValidation: PlanValidationService,
    private readonly planOptimization: PlanOptimizationService,
    private readonly planPersistence: PlanPersistenceService,
    private readonly eventBus: EventBusService,
    private readonly messageQueue: MessageQueueService,
  ) {}

  /**
   * Plan generation command handler
   */
  @MessagePattern('planning.generate')
  async handlePlanGeneration(@Payload() request: PlanGenerationRequest): Promise<PlanGenerationResponse> {
    this.logger.log(`Handling plan generation request: ${request.requestId}`, {
      userId: request.userId,
      subjects: request.subjects,
    });

    try {
      // Validate request
      const validation = await this.planValidation.validatePlanGenerationRequest(request);
      if (!validation.isValid) {
        return {
          planId: '',
          userId: request.userId,
          status: 'failed',
          error: validation.errors.join(', '),
          requestId: request.requestId,
          timestamp: new Date(),
        };
      }

      // Generate plan
      const plan = await this.planGeneration.generatePlan(request);

      // Persist plan
      const persistedPlan = await this.planPersistence.createPlan({
        ...plan,
        userId: request.userId,
        requestId: request.requestId,
      });

      // Emit plan generated event
      await this.eventBus.emit('plan.generated', {
        planId: persistedPlan.id,
        userId: request.userId,
        plan: persistedPlan,
        requestId: request.requestId,
        timestamp: new Date(),
      });

      return {
        planId: persistedPlan.id,
        userId: request.userId,
        status: 'success',
        plan: persistedPlan,
        requestId: request.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Plan generation failed: ${error instanceof Error ? error.message : String(error) }`, {
        requestId: request.requestId,
        userId: request.userId,
        error: error instanceof Error ? error.stack : undefined,
      });

      // Emit plan generation failed event
      await this.eventBus.emit('plan.generation.failed', {
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        timestamp: new Date(),
      });

      return {
        planId: '',
        userId: request.userId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Plan update command handler
   */
  @MessagePattern('planning.update')
  async handlePlanUpdate(@Payload() request: PlanUpdateRequest): Promise<PlanUpdateResponse> {
    this.logger.log(`Handling plan update request: ${request.requestId}`, {
      planId: request.planId,
      userId: request.userId,
    });

    try {
      // Validate update request
      const validation = await this.planValidation.validatePlanUpdateRequest(request);
      if (!validation.isValid) {
        return {
          planId: request.planId,
          userId: request.userId,
          status: 'failed',
          error: validation.errors.join(', '),
          requestId: request.requestId,
          timestamp: new Date(),
        };
      }

      // Update plan
      const updatedPlan = await this.planPersistence.updatePlan(
        request.planId,
        request.userId,
        request.updates
      );

      // Emit plan updated event
      await this.eventBus.emit('plan.updated', {
        planId: request.planId,
        userId: request.userId,
        plan: updatedPlan,
        requestId: request.requestId,
        timestamp: new Date(),
      });

      return {
        planId: request.planId,
        userId: request.userId,
        status: 'success',
        plan: updatedPlan,
        requestId: request.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Plan update failed: ${error instanceof Error ? error.message : String(error)}`, {
        requestId: request.requestId,
        planId: request.planId,
        userId: request.userId,
        error: error instanceof Error ? error.stack : undefined,
      });

      return {
        planId: request.planId,
        userId: request.userId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Plan optimization command handler
   */
  @MessagePattern('planning.optimize')
  async handlePlanOptimization(@Payload() request: { planId: string; userId: string; requestId: string }): Promise<any> {
    this.logger.log(`Handling plan optimization request: ${request.requestId}`, {
      planId: request.planId,
      userId: request.userId,
    });

    try {
      // Get current plan
      const currentPlan = await this.planPersistence.getPlan(request.planId, request.userId);
      if (!currentPlan) {
        throw new Error('Plan not found');
      }

      // Optimize plan
      const optimizedPlan = await this.planOptimization.optimizePlan(currentPlan);

      // Update plan with optimizations
      const updatedPlan = await this.planPersistence.updatePlan(
        request.planId,
        request.userId,
        { ...optimizedPlan, lastOptimized: new Date() }
      );

      // Emit plan optimized event
      await this.eventBus.emit('plan.optimized', {
        planId: request.planId,
        userId: request.userId,
        plan: updatedPlan,
        requestId: request.requestId,
        timestamp: new Date(),
      });

      return {
        planId: request.planId,
        userId: request.userId,
        status: 'success',
        plan: updatedPlan,
        requestId: request.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Plan optimization failed: ${error instanceof Error ? error.message : String(error)}`, {
        requestId: request.requestId,
        planId: request.planId,
        userId: request.userId,
        error: error instanceof Error ? error.stack : undefined,
      });

      return {
        planId: request.planId,
        userId: request.userId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user plans query handler
   */
  @MessagePattern('planning.getUserPlans')
  async handleGetUserPlans(@Payload() request: { userId: string; requestId: string }): Promise<any> {
    this.logger.log(`Handling get user plans request: ${request.requestId}`, {
      userId: request.userId,
    });

    try {
      const plans = await this.planPersistence.getUserPlans(request.userId);
      
      return {
        userId: request.userId,
        plans,
        requestId: request.requestId,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Get user plans failed: ${error instanceof Error ? error.message : String(error)}`, {
        requestId: request.requestId,
        userId: request.userId,
        error: error instanceof Error ? error.stack : undefined,
      });

      return {
        userId: request.userId,
        plans: [],
        error: error instanceof Error ? error.message : String(error),
        requestId: request.requestId,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Progress tracking event handler
   */
  @EventPattern('progress.tracked')
  async handleProgressTracked(@Payload() data: any): Promise<void> {
    this.logger.log(`Handling progress tracked event`, {
      userId: data.userId,
      sessionId: data.sessionId,
    });

    try {
      // Update plan based on progress
      const plan = await this.planPersistence.getPlan(data.planId, data.userId);
      if (plan) {
        // Analyze progress and suggest optimizations
        const analysis = await this.planOptimization.analyzeProgress(plan, data);
        
        if (analysis.needsOptimization) {
          await (this.messageQueue as any).add?.('planning.optimize-plan', {
            planId: data.planId,
            userId: data.userId,
            reason: 'progress_analysis',
            requestId: `progress_${Date.now()}`,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle progress tracked event: ${error instanceof Error ? error.message : String(error)}`, {
        userId: data.userId,
        sessionId: data.sessionId,
        error: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * User profile updated event handler
   */
  @EventPattern('user.profile.updated')
  async handleUserProfileUpdated(@Payload() data: any): Promise<void> {
    this.logger.log(`Handling user profile updated event`, {
      userId: data.userId,
    });

    try {
      // Get user's active plans
      const plans = await this.planPersistence.getUserPlans(data.userId);
      
      // Re-optimize plans based on new profile
      for (const plan of plans) {
        if (plan.isActive) {
          await (this.messageQueue as any).add?.('planning.optimize-plan', {
            planId: plan.id,
            userId: data.userId,
            reason: 'profile_update',
            requestId: `profile_${Date.now()}`,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle user profile updated event: ${error instanceof Error ? error.message : String(error)}`, {
        userId: data.userId,
        error: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
