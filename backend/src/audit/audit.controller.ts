import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit Trails')
@Controller('api/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('my-logs')
  @ApiOperation({ summary: 'Kullanıcının kendi audit loglarını getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maksimum kayıt sayısı' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Atlanacak kayıt sayısı' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Aksiyon filtresi' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Entity tipi filtresi' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Başlangıç tarihi' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Bitiş tarihi' })
  @ApiResponse({ 
    status: 200, 
    description: 'Kullanıcı audit logları',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' },
        total: { type: 'number' }
      }
    }
  })
  async getUserAuditLogs(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getUserAuditLogs(req.user.id, {
      limit,
      offset,
      action,
      entityType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('system-logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Sistem audit loglarını getir (Admin)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maksimum kayıt sayısı' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Atlanacak kayıt sayısı' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Aksiyon filtresi' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Entity tipi filtresi' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Kullanıcı ID filtresi' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Başlangıç tarihi' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Bitiş tarihi' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sistem audit logları',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' },
        total: { type: 'number' }
      }
    }
  })
  async getSystemAuditLogs(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getSystemAuditLogs({
      limit,
      offset,
      action,
      entityType,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Audit istatistiklerini getir (Admin)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Başlangıç tarihi' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Bitiş tarihi' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Kullanıcı ID filtresi' })
  @ApiResponse({ 
    status: 200, 
    description: 'Audit istatistikleri',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalActions: { type: 'number' },
            byAction: { type: 'object' },
            byEntityType: { type: 'object' },
            byUser: { type: 'object' },
            byDay: { type: 'object' }
          }
        }
      }
    }
  })
  async getAuditStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.getAuditStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
    });
  }

  @Get('search')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Audit loglarında arama yap (Admin)' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Arama terimi' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maksimum kayıt sayısı' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Atlanacak kayıt sayısı' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Başlangıç tarihi' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Bitiş tarihi' })
  @ApiResponse({ 
    status: 200, 
    description: 'Arama sonuçları',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' },
        total: { type: 'number' }
      }
    }
  })
  async searchAuditLogs(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.searchAuditLogs(searchTerm, {
      limit,
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('export')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Audit loglarını export et (Admin)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Başlangıç tarihi' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Bitiş tarihi' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Kullanıcı ID filtresi' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Entity tipi filtresi' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Aksiyon filtresi' })
  @ApiResponse({ 
    status: 200, 
    description: 'Export edilen audit logları',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' }
      }
    }
  })
  async exportAuditLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.exportAuditLogs({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
      entityType,
      action,
    });
  }

  @Post('log')
  @ApiOperation({ summary: 'Manuel audit log oluştur' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
        oldValues: { type: 'object' },
        newValues: { type: 'object' },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['action', 'entityType', 'entityId']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Audit log oluşturuldu',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        auditId: { type: 'string' },
        error: { type: 'string' }
      }
    }
  })
  async logAction(
    @Body() auditData: any,
    @Request() req: any,
  ) {
    return this.auditService.logAction({
      userId: req.user.id,
      ...auditData,
    });
  }
}
