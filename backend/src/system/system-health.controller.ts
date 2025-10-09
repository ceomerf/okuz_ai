import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemHealthService } from './system-health.service';

@ApiTags('System Health')
@Controller('api/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Sistem sağlık durumu kontrolü' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sistem sağlık durumu',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'OK' },
            redis: { type: 'string', example: 'OK' },
            api: { type: 'string', example: 'OK' },
            overall: { type: 'string', example: 'HEALTHY' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  async getSystemHealth() {
    return this.systemHealthService.getSystemHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Sistem metrikleri' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sistem metrikleri',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            activeUsers: { type: 'number', example: 150 },
            requestsLastHour: { type: 'number', example: 12500 },
            errorRate: { type: 'number', example: 0.5 },
            responseTime: { type: 'number', example: 250 },
            uptime: { type: 'number', example: 99.8 },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  async getSystemMetrics() {
    return this.systemHealthService.getSystemMetrics();
  }

  @Get('services')
  @ApiOperation({ summary: 'Servis durumları' })
  @ApiResponse({ status: 200, description: 'Servis durumları' })
  async getServiceStatus() {
    return this.systemHealthService.getServiceStatus();
  }
}
