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
    entityType: string;
    entityId: string;
    changes?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    try {
      return await this.auditLoggingService.createAuditLog(logData);
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

  @Get('logs/:id')
  async getAuditLogById(@Param('id') id: string): Promise<AuditLog | null> {
    try {
      return await this.auditLoggingService.getAuditLogById(id);
    } catch (error) {
      throw new HttpException(
        'Failed to get audit log',
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
      const logs = await this.auditLoggingService.exportAuditLogs(filter);
      
      const fileName = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = this.getContentType(format);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      if (format === 'json') {
        res.json(logs);
      } else {
        const csv = this.convertToCSV(logs);
        res.setHeader('Content-Length', Buffer.byteLength(csv));
        res.send(csv);
      }
    } catch (error) {
      throw new HttpException(
        'Failed to export audit logs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logs/cleanup')
  async deleteOldLogs(@Body() cleanupData: {
    daysToKeep: number;
  }): Promise<{ deletedCount: number }> {
    try {
      const deletedCount = await this.auditLoggingService.deleteOldLogs(cleanupData.daysToKeep);
      return { deletedCount };
    } catch (error) {
      throw new HttpException(
        'Failed to delete old audit logs',
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

  private convertToCSV(logs: AuditLog[]): string {
    if (logs.length === 0) {
      return 'No data available';
    }

    const headers = [
      'ID',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'User Agent',
      'Timestamp',
      'Created At'
    ];

    const rows = logs.map(log => [
      log.id,
      log.userId,
      log.action,
      log.entityType,
      log.entityId,
      log.ipAddress || '',
      log.userAgent || '',
      log.timestamp.toISOString(),
      log.createdAt.toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}