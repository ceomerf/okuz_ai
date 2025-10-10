import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { APIRateLimitingService, RateLimitDashboard, RateLimitRule, RateLimitStatus } from './api-rate-limiting.service';

@Controller('rate-limiting')
export class APIRateLimitingController {
  constructor(private readonly apiRateLimitingService: APIRateLimitingService) {}

  @Get('dashboard')
  async getRateLimitDashboard(): Promise<RateLimitDashboard> {
    try {
      return await this.apiRateLimitingService.getRateLimitDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get rate limit dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('check')
  async checkRateLimit(@Body() checkData: {
    key: string;
    ipAddress: string;
    endpoint: string;
    method: string;
  }): Promise<RateLimitStatus> {
    try {
      return await this.apiRateLimitingService.checkRateLimit(
        checkData.key,
        checkData.ipAddress,
        checkData.endpoint,
        checkData.method
      );
    } catch (error) {
      throw new HttpException(
        'Failed to check rate limit',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status/:key')
  async getRateLimitStatus(@Param('key') key: string): Promise<RateLimitStatus | null> {
    try {
      return await this.apiRateLimitingService.getRateLimitStatus(key);
    } catch (error) {
      throw new HttpException(
        'Failed to get rate limit status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('reset/:key')
  async resetRateLimit(@Param('key') key: string): Promise<void> {
    try {
      await this.apiRateLimitingService.resetRateLimit(key);
    } catch (error) {
      throw new HttpException(
        'Failed to reset rate limit',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('rules')
  async createRateLimitRule(@Body() ruleData: {
    name: string;
    pattern: string;
    method: string;
    limit: number;
    window: number;
    priority: number;
  }): Promise<RateLimitRule> {
    try {
      return await this.apiRateLimitingService.createRateLimitRule(ruleData);
    } catch (error) {
      throw new HttpException(
        'Failed to create rate limit rule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('rules/:ruleId')
  async updateRateLimitRule(
    @Param('ruleId') ruleId: string,
    @Body() ruleData: Partial<RateLimitRule>
  ): Promise<RateLimitRule> {
    try {
      return await this.apiRateLimitingService.updateRateLimitRule(ruleId, ruleData);
    } catch (error) {
      throw new HttpException(
        'Failed to update rate limit rule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('rules/:ruleId')
  async deleteRateLimitRule(@Param('ruleId') ruleId: string): Promise<void> {
    try {
      await this.apiRateLimitingService.deleteRateLimitRule(ruleId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete rate limit rule',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
