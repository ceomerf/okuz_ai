import { Controller, Get, Post, Delete, Body, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DataExportService, ExportJob, ExportOptions, ExportResult } from './data-export.service';

@Controller('export')
export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  @Post('create')
  async createExportJob(
    @Body() body: {
      userId: string;
      type: 'users' | 'activities' | 'payments' | 'classes' | 'assignments' | 'grades' | 'analytics';
      options: ExportOptions;
    }
  ): Promise<ExportJob> {
    try {
      return await this.dataExportService.createExportJob(
        body.userId,
        body.type,
        body.options
      );
    } catch (error) {
      throw new HttpException(
        'Failed to create export job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('job/:jobId')
  async getExportJob(@Param('jobId') jobId: string): Promise<ExportJob | null> {
    try {
      return await this.dataExportService.getExportJob(jobId);
    } catch (error) {
      throw new HttpException(
        'Failed to get export job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId/jobs')
  async getUserExportJobs(@Param('userId') userId: string): Promise<ExportJob[]> {
    try {
      return await this.dataExportService.getUserExportJobs(userId);
    } catch (error) {
      throw new HttpException(
        'Failed to get user export jobs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('job/:jobId/download')
  async downloadExportFile(
    @Param('jobId') jobId: string,
    @Query('userId') userId: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      const fileBuffer = await this.dataExportService.getExportFile(jobId, userId);
      
      if (!fileBuffer) {
        throw new HttpException(
          'Export file not found or not ready',
          HttpStatus.NOT_FOUND,
        );
      }

      const job = await this.dataExportService.getExportJob(jobId);
      if (!job || !job.fileName) {
        throw new HttpException(
          'Export job not found',
          HttpStatus.NOT_FOUND,
        );
      }

      res.setHeader('Content-Type', this.getContentType(job.fileName));
      res.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to download export file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('job/:jobId')
  async deleteExportJob(
    @Param('jobId') jobId: string,
    @Query('userId') userId: string
  ): Promise<void> {
    try {
      await this.dataExportService.deleteExportJob(jobId, userId);
    } catch (error) {
      throw new HttpException(
        'Failed to delete export job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'csv':
        return 'text/csv';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
}
