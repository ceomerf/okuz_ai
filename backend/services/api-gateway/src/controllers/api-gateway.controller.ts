import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ApiGatewayService } from '../services/api-gateway.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { CacheInterceptor } from '../interceptors/cache.interceptor';

@ApiTags('API Gateway')
@Controller('api')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@UseInterceptors(LoggingInterceptor, TransformInterceptor, CacheInterceptor)
@ApiBearerAuth()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get health status of all services' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus() {
    return this.apiGatewayService.healthCheck();
  }

  @Get('metrics/:service')
  @ApiOperation({ summary: 'Get metrics for a specific service' })
  @ApiResponse({ status: 200, description: 'Service metrics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceMetrics(@Param('service') service: string) {
    return this.apiGatewayService.getServiceMetrics(service);
  }

  // Planning Service Routes
  @Post('planning/*')
  @ApiOperation({ summary: 'Route to Planning Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async routeToPlanning(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('planning');
    return this.apiGatewayService.routeRequest('planning', endpoint, 'POST', data, headers);
  }

  @Get('planning/*')
  @ApiOperation({ summary: 'Route to Planning Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async getFromPlanning(
    @Query() query: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('planning');
    return this.apiGatewayService.routeRequest('planning', endpoint, 'GET', null, headers);
  }

  @Put('planning/*')
  @ApiOperation({ summary: 'Route to Planning Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async updatePlanning(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('planning');
    return this.apiGatewayService.routeRequest('planning', endpoint, 'PUT', data, headers);
  }

  @Delete('planning/*')
  @ApiOperation({ summary: 'Route to Planning Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async deleteFromPlanning(
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('planning');
    return this.apiGatewayService.routeRequest('planning', endpoint, 'DELETE', null, headers);
  }

  // Smart Tools Service Routes
  @Post('smart-tools/*')
  @ApiOperation({ summary: 'Route to Smart Tools Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async routeToSmartTools(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('smart-tools');
    return this.apiGatewayService.routeRequest('smartTools', endpoint, 'POST', data, headers);
  }

  @Get('smart-tools/*')
  @ApiOperation({ summary: 'Route to Smart Tools Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async getFromSmartTools(
    @Query() query: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('smart-tools');
    return this.apiGatewayService.routeRequest('smartTools', endpoint, 'GET', null, headers);
  }

  // Gamification Service Routes
  @Post('gamification/*')
  @ApiOperation({ summary: 'Route to Gamification Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async routeToGamification(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('gamification');
    return this.apiGatewayService.routeRequest('gamification', endpoint, 'POST', data, headers);
  }

  @Get('gamification/*')
  @ApiOperation({ summary: 'Route to Gamification Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async getFromGamification(
    @Query() query: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('gamification');
    return this.apiGatewayService.routeRequest('gamification', endpoint, 'GET', null, headers);
  }

  // Notification Service Routes
  @Post('notifications/*')
  @ApiOperation({ summary: 'Route to Notification Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async routeToNotifications(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('notifications');
    return this.apiGatewayService.routeRequest('notification', endpoint, 'POST', data, headers);
  }

  @Get('notifications/*')
  @ApiOperation({ summary: 'Route to Notification Service' })
  @ApiResponse({ status: 200, description: 'Request routed successfully' })
  async getFromNotifications(
    @Query() query: any,
    @Headers() headers: Record<string, string>,
  ) {
    const endpoint = this.extractEndpoint('notifications');
    return this.apiGatewayService.routeRequest('notification', endpoint, 'GET', null, headers);
  }

  /**
   * Extract endpoint from the wildcard route
   */
  private extractEndpoint(service: string): string {
    // This would extract the actual endpoint from the wildcard route
    // For now, we'll return a placeholder
    return '/';
  }
}
