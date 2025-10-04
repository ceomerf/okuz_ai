import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  findAll() {
    return { message: 'Analytics endpoint working', data: [] };
  }

  @Post()
  create(@Body() createAnalyticsDto: any) {
    return { message: 'Analytics created', data: createAnalyticsDto };
  }

  @Get('performance')
  getPerformance() {
    return { message: 'Performance analytics', data: [] };
  }

  @Get('progress')
  getProgress() {
    return { message: 'Progress analytics', data: [] };
  }
}
