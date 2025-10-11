import { 
  Controller, 
  Get, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PredictiveService } from './predictive.service';

@ApiTags('Predictive Analytics')
@Controller('api/predictive')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class PredictiveController {
  constructor(private readonly predictiveService: PredictiveService) {}

  @Get('predictions')
  @ApiOperation({ summary: 'Tahminsel analitik sonuçlarını getir' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tahminsel analitik sonuçları',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              currentValue: { type: 'number' },
              predictedValue: { type: 'number' },
              confidence: { type: 'number' },
              trend: { type: 'string', enum: ['UP', 'DOWN', 'STABLE'] },
              timeframe: { type: 'string' },
              factors: { type: 'array', items: { type: 'string' } },
              recommendations: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  })
  async getPredictions(@Request() req: any): Promise<any> {
    return this.predictiveService.getPredictions();
  }

  @Get('history')
  @ApiOperation({ summary: 'Tahmin geçmişini getir' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tahmin geçmişi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' }
      }
    }
  })
  async getPredictionHistory(@Request() req: any) {
    return this.predictiveService.getPredictionHistory();
  }
}
