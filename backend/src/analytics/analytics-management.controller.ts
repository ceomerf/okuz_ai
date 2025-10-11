import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AnalyticsManagementService } from './analytics-management.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AnalyticsManagementController {
  constructor(private readonly analyticsService: AnalyticsManagementService) {}

  @Get('custom-reports')
  async getCustomReports(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.analyticsService.getCustomReports({
      page,
      limit,
      category,
      isActive,
      search,
    });
  }

  @Get('custom-reports/:id')
  async getCustomReportById(@Param('id') id: string) {
    return this.analyticsService.getCustomReportById(id);
  }

  @Post('custom-reports/:id/execute')
  async executeCustomReport(
    @Param('id') id: string,
    @Body() parameters?: Record<string, any>,
  ) {
    return this.analyticsService.executeCustomReport(id, parameters);
  }

  @Post('custom-reports')
  async createCustomReport(@Body() createData: {
    name: string;
    description: string;
    category: string;
    query: string;
    parameters?: Record<string, any>;
    isActive?: boolean;
  }) {
    return this.analyticsService.createCustomReport(createData);
  }

  @Put('custom-reports/:id')
  async updateCustomReport(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      description?: string;
      query?: string;
      parameters?: Record<string, any>;
      isActive?: boolean;
    },
  ) {
    return this.analyticsService.updateCustomReport(id, updateData);
  }

  @Delete('custom-reports/:id')
  async deleteCustomReport(@Param('id') id: string) {
    return this.analyticsService.deleteCustomReport(id);
  }

  @Get('data-sources')
  async getDataSources() {
    return this.analyticsService.getDataSources();
  }

  @Get('metrics')
  async getMetrics(@Query('dataSource') dataSource?: string) {
    return this.analyticsService.getMetrics(dataSource);
  }

  @Get('dimensions')
  async getDimensions(@Query('dataSource') dataSource?: string) {
    return this.analyticsService.getDimensions(dataSource);
  }

  @Get('predefined-reports')
  async getPredefinedReports() {
    return this.analyticsService.getPredefinedReports();
  }

  @Post('generate-report')
  async generateCustomReport(@Body() reportDefinition: {
    dataSource: string;
    metrics: string[];
    dimensions?: string[];
    filters?: Record<string, any>;
    groupBy?: string[];
    orderBy?: string;
    limit?: number;
  }) {
    return this.analyticsService.generateCustomReport(reportDefinition);
  }
}