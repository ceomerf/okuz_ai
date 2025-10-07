import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export interface PlanGenerationRequest {
  userId: string;
  subjects: string[];
  goals: string[];
  availableTime: number;
  learningStyle?: string;
  currentLevel?: string;
  preferences?: Record<string, any>;
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

export interface GetUserPlansResponse {
  userId: string;
  plans: any[];
  requestId: string;
  timestamp: Date;
}

@Injectable()
export class PlanningServiceClient {
  private readonly logger = new Logger(PlanningServiceClient.name);
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('PLANNING_SERVICE_URL', 'http://localhost:3003');
    this.timeout = this.configService.get<number>('PLANNING_SERVICE_TIMEOUT', 30000);
  }

  /**
   * Generate a new study plan
   */
  async generatePlan(request: PlanGenerationRequest): Promise<PlanGenerationResponse> {
    try {
      this.logger.log(`Generating plan for user: ${request.userId}`, {
        subjects: request.subjects,
        goals: request.goals,
      });

      const response: AxiosResponse<PlanGenerationResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/planning/generate`, {
          ...request,
          requestId: this.generateRequestId(),
          timestamp: new Date(),
        }, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log(`Plan generation response received`, {
        planId: response.data.planId,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Plan generation failed: ${error.message}`, {
        userId: request.userId,
        error: error.response?.data || error.message,
      });

      if (error.response?.status === HttpStatus.REQUEST_TIMEOUT) {
        throw new HttpException('Planning service timeout', HttpStatus.REQUEST_TIMEOUT);
      }

      if (error.response?.status === HttpStatus.SERVICE_UNAVAILABLE) {
        throw new HttpException('Planning service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }

      throw new HttpException(
        `Plan generation failed: ${error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update an existing plan
   */
  async updatePlan(request: PlanUpdateRequest): Promise<PlanUpdateResponse> {
    try {
      this.logger.log(`Updating plan: ${request.planId}`, {
        userId: request.userId,
        updates: Object.keys(request.updates),
      });

      const response: AxiosResponse<PlanUpdateResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/planning/update`, {
          ...request,
          requestId: this.generateRequestId(),
          timestamp: new Date(),
        }, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log(`Plan update response received`, {
        planId: response.data.planId,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Plan update failed: ${error.message}`, {
        planId: request.planId,
        userId: request.userId,
        error: error.response?.data || error.message,
      });

      throw new HttpException(
        `Plan update failed: ${error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Optimize a plan
   */
  async optimizePlan(planId: string, userId: string, reason?: string): Promise<any> {
    try {
      this.logger.log(`Optimizing plan: ${planId}`, {
        userId,
        reason,
      });

      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/planning/optimize`, {
          planId,
          userId,
          reason,
          requestId: this.generateRequestId(),
          timestamp: new Date(),
        }, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log(`Plan optimization response received`, {
        planId: response.data.planId,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Plan optimization failed: ${error.message}`, {
        planId,
        userId,
        error: error.response?.data || error.message,
      });

      throw new HttpException(
        `Plan optimization failed: ${error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user's plans
   */
  async getUserPlans(userId: string): Promise<GetUserPlansResponse> {
    try {
      this.logger.log(`Getting plans for user: ${userId}`);

      const response: AxiosResponse<GetUserPlansResponse> = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/planning/user/${userId}/plans`, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log(`User plans response received`, {
        userId: response.data.userId,
        planCount: response.data.plans.length,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Get user plans failed: ${error.message}`, {
        userId,
        error: error.response?.data || error.message,
      });

      throw new HttpException(
        `Get user plans failed: ${error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get specific plan
   */
  async getPlan(planId: string, userId: string): Promise<any> {
    try {
      this.logger.log(`Getting plan: ${planId}`, { userId });

      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/planning/plan/${planId}`, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
          params: { userId },
        })
      );

      this.logger.log(`Plan response received`, {
        planId: response.data.planId,
        userId: response.data.userId,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Get plan failed: ${error.message}`, {
        planId,
        userId,
        error: error.response?.data || error.message,
      });

      throw new HttpException(
        `Get plan failed: ${error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId: string, userId: string): Promise<any> {
    try {
      this.logger.log(`Deleting plan: ${planId}`, { userId });

      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/planning/plan/${planId}`, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
          params: { userId },
        })
      );

      this.logger.log(`Plan deletion response received`, {
        planId: response.data.planId,
        userId: response.data.userId,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Delete plan failed: ${error.message}`, {
        planId,
        userId,
        error: error.response?.data || error.message,
      });

      throw new HttpException(
        `Delete plan failed: ${error.response?.data?.error || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get planning service health
   */
  async getHealth(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          timeout: 5000, // Shorter timeout for health checks
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Planning service health check failed: ${error.message}`);
      throw new HttpException(
        'Planning service is unhealthy',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
