import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NlpService } from './nlp.service';

@ApiTags('NLP Search')
@Controller('api/nlp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class NlpController {
  constructor(private readonly nlpService: NlpService) {}

  @Post('search')
  @ApiOperation({ summary: 'Doğal dil sorgusu işle' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Doğal dil sorgusu' },
      },
      required: ['query'],
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sorgu başarıyla işlendi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        sql: { type: 'string' },
        description: { type: 'string' },
        data: { type: 'array' },
        error: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Geçersiz sorgu' })
  async processQuery(
    @Body() body: { query: string },
    @Request() req: any,
  ) {
    return this.nlpService.processNaturalLanguageQuery(body.query);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Arama önerilerini getir' })
  @ApiResponse({ 
    status: 200, 
    description: 'Arama önerileri',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  async getSuggestions() {
    return this.nlpService.getSearchSuggestions();
  }

  @Get('history')
  @ApiOperation({ summary: 'Sorgu geçmişini getir' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sorgu geçmişi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' }
      }
    }
  })
  async getQueryHistory(@Request() req: any) {
    return this.nlpService.getQueryHistory(req.user.id);
  }
}
