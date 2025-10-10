import { Controller, Get, Post, Delete, Body, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AdvancedReportingService, ReportDashboard, ReportTemplate, Report } from './advanced-reporting.service';

@Controller('reporting')
export class AdvancedReportingController {
  constructor(private readonly advancedReportingService: AdvancedReportingService) {}

  @Get('dashboard')
  async getReportDashboard(): Promise<ReportDashboard> {
    try {
      return await this.advancedReportingService.getReportDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get report dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('templates')
  async createReportTemplate(@Body() templateData: {
    name: string;
    description: string;
    type: 'user' | 'financial' | 'academic' | 'system' | 'custom';
    category: string;
    parameters: any[];
  }): Promise<ReportTemplate> {
    try {
      return await this.advancedReportingService.createReportTemplate(templateData);
    } catch (error) {
      throw new HttpException(
        'Failed to create report template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate')
  async generateReport(@Body() reportData: {
    templateId: string;
    parameters: Record<string, any>;
    generatedBy: string;
    format?: 'excel' | 'pdf' | 'csv';
  }): Promise<Report> {
    try {
      return await this.advancedReportingService.generateReport(
        reportData.templateId,
        reportData.parameters,
        reportData.generatedBy,
        reportData.format || 'excel'
      );
    } catch (error) {
      throw new HttpException(
        'Failed to generate report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reports/:reportId')
  async getReport(@Param('reportId') reportId: string): Promise<Report | null> {
    try {
      return await this.advancedReportingService.getReport(reportId);
    } catch (error) {
      throw new HttpException(
        'Failed to get report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reports/user/:userId')
  async getUserReports(@Param('userId') userId: string): Promise<Report[]> {
    try {
      return await this.advancedReportingService.getUserReports(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to get user reports',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('reports/:reportId/download')
  async downloadReport(
    @Param('reportId') reportId: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      const report = await this.advancedReportingService.getReport(reportId);
      
      if (!report || report.status !== 'completed' || !report.filePath) {
        throw new HttpException(
          'Report not found or not ready',
          HttpStatus.NOT_FOUND,
        );
      }

      const fileBuffer = await this.advancedReportingService.getReportFile(reportId);
      
      if (!fileBuffer) {
        throw new HttpException(
          'Report file not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const fileName = `${report.name}.${report.filePath.split('.').pop()}`;
      const contentType = this.getContentType(report.filePath);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to download report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('reports/:reportId')
  async deleteReport(@Param('reportId') reportId: string): Promise<void> {
    try {
      await this.advancedReportingService.deleteReport(reportId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getContentType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }
}
