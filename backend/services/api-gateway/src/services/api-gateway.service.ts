import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Route request to appropriate microservice
   */
  async routeRequest(
    service: string,
    endpoint: string,
    method: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const serviceUrl = this.getServiceUrl(service);
    const fullUrl = `${serviceUrl}${endpoint}`;

    this.logger.log(`Routing ${method} request to ${service}: ${fullUrl}`);

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.request({
          method: method as any,
          url: fullUrl,
          data,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          timeout: 30000, // 30 seconds timeout
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error routing request to ${service}:`, error);
      throw error;
    }
  }

  /**
   * Get service URL from configuration
   */
  private getServiceUrl(service: string): string {
    const serviceUrls = {
      planning: this.configService.get<string>('PLANNING_SERVICE_URL'),
      auth: this.configService.get<string>('AUTH_SERVICE_URL'),
      smartTools: this.configService.get<string>('SMART_TOOLS_SERVICE_URL'),
      gamification: this.configService.get<string>('GAMIFICATION_SERVICE_URL'),
      notification: this.configService.get<string>('NOTIFICATION_SERVICE_URL'),
    };

    const url = serviceUrls[service];
    if (!url) {
      throw new Error(`Service URL not configured for: ${service}`);
    }

    return url;
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<Record<string, any>> {
    const services = ['planning', 'auth', 'smartTools', 'gamification', 'notification'];
    const healthStatus: Record<string, any> = {};

    for (const service of services) {
      try {
        const serviceUrl = this.getServiceUrl(service);
        const response = await firstValueFrom(
          this.httpService.get(`${serviceUrl}/health`, { timeout: 5000 }),
        );
        
        healthStatus[service] = {
          status: 'healthy',
          responseTime: response.headers['x-response-time'] || 'unknown',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        healthStatus[service] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return healthStatus;
  }

  /**
   * Get service metrics
   */
  async getServiceMetrics(service: string): Promise<any> {
    try {
      const serviceUrl = this.getServiceUrl(service);
      const response = await firstValueFrom(
        this.httpService.get(`${serviceUrl}/metrics`, { timeout: 5000 }),
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting metrics for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Load balance request across multiple service instances
   */
  async loadBalanceRequest(
    service: string,
    endpoint: string,
    method: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    // This would implement load balancing logic
    // For now, we'll use the simple routing
    return this.routeRequest(service, endpoint, method, data, headers);
  }

  /**
   * Circuit breaker pattern implementation
   */
  async circuitBreakerRequest(
    service: string,
    endpoint: string,
    method: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    // This would implement circuit breaker logic
    // For now, we'll use the simple routing
    return this.routeRequest(service, endpoint, method, data, headers);
  }
}
