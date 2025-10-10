import { Controller, Get, Post, Body, Param, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuditLoggingService, AuditLogDashboard, AuditLog, AuditLogFilter } from './audit-logging.service';

@Controller('audit')
export class AuditLoggingController {
  constructor(private readonly auditLoggingService: AuditLoggingService) {}

  @Get('dashboard')
  async getAuditDashboard(): Promise<AuditLogDashboard> {
    try {
      return await this.auditLoggingService.getAuditDashboard();
    } catch (error) {
      throw new HttpException(
        'Failed to get audit dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('log')
  async logAuditEvent(@Body() logData: {
    userId: string;
    action: string;
    resource: string;
    ipAddress: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    userAgent?: string;
    sessionId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security';
    metadata?: any;
  }): Promise<void> {
    try {
      await this.auditLoggingService.logAuditEvent(
        logData.userId,
        logData.action,
        logData.resource,
        logData.ipAddress,
        logData.resourceId,
        logData.oldValues,
        logData.newValues,
        logData.userAgent,
        logData.sessionId,
        logData.severity || 'medium',
        logData.category || 'system',
        logData.metadata
      );
    } catch (error) {
      throw new HttpException(
        'Failed to log audit event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('logs')
  async getAuditLogs(@Query() filter: AuditLogFilter): Promise<AuditLog[]> {
    try {
      return await this.auditLoggingService.getAuditLogs(filter);
    } catch (error) {
      throw new HttpException(
        'Failed to get audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('logs/export')
  async exportAuditLogs(
    @Query() filter: AuditLogFilter,
    @Query('format') format: 'csv' | 'excel' | 'json' = 'csv',
    @Res() res: Response
  ): Promise<void> {
    try {
      const buffer = await this.auditLoggingService.exportAuditLogs(filter, format);
      
      const fileName = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = this.getContentType(format);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      throw new HttpException(
        'Failed to export audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('logs/summary')
  async getAuditLogSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<any> {
    try {
      return await this.auditLoggingService.getAuditLogSummary(startDate, endDate);
    } catch (error) {
      throw new HttpException(
        'Failed to get audit log summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logs/cleanup')
  async deleteAuditLogs(@Body() cleanupData: {
    olderThan: string;
  }): Promise<{ deletedCount: number }> {
    try {
      const deletedCount = await this.auditLoggingService.deleteAuditLogs(new Date(cleanupData.olderThan));
      return { deletedCount };
    } catch (error) {
      throw new HttpException(
        'Failed to delete audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
}
