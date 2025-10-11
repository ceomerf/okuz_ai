import { 
  Controller, 
  Get, 
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnomalyService } from './anomaly.service';

@ApiTags('Anomaly Detection')
@Controller('api/anomaly')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AnomalyController {
  constructor(private readonly anomalyService: AnomalyService) {}

  @Get('history')
  @ApiOperation({ summary: 'Anomali geçmişini getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maksimum kayıt sayısı' })
  @ApiResponse({ 
    status: 200, 
    description: 'Anomali geçmişi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              severity: { type: 'string' },
              message: { type: 'string' },
              data: { type: 'object' },
              detectedAt: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getAnomalyHistory(
    @Query('limit') limit: number = 50,
    @Request() req: any,
  ) {
    return this.anomalyService.getAnomalyHistory(limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Anomali istatistiklerini getir' })
  @ApiResponse({ 
    status: 200, 
    description: 'Anomali istatistikleri',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            bySeverity: { type: 'object' },
            byType: { type: 'object' }
          }
        }
      }
    }
  })
  async getAnomalyStats(@Request() req: any) {
    return this.anomalyService.getAnomalyStats();
  }
}
