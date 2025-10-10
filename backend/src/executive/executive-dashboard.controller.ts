import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ExecutiveDashboardService, ExecutiveDashboardData } from './executive-dashboard.service';

@Controller('executive')
export class ExecutiveDashboardController {
  constructor(private readonly executiveDashboardService: ExecutiveDashboardService) {}

  @Get('dashboard')
  async getDashboardData(): Promise<ExecutiveDashboardData> {
    try {
      return await this.executiveDashboardService.getDashboardData();
    } catch (error) {
      throw new HttpException(
        'Failed to get executive dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}