import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CrudService } from './crud.service';

@ApiTags('Generic CRUD')
@Controller('api/crud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class CrudController {
  constructor(private readonly crudService: CrudService) {}

  @Get(':entityName')
  @ApiOperation({ summary: 'Entity verilerini listele' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
  @ApiQuery({ name: 'page', required: false, description: 'Sayfa numarası', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Sayfa başına kayıt sayısı', example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Arama terimi', example: 'john' })
  @ApiResponse({ 
    status: 200, 
    description: 'Başarılı',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' }
              }
            }
          }
        }
      }
    }
  })
  async getEntityData(
    @Param('entityName') entityName: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.crudService.getEntityData(entityName, page, limit, search);
  }

  @Get(':entityName/:id')
  @ApiOperation({ summary: 'Belirli bir entity kaydını getir' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
  @ApiParam({ name: 'id', description: 'Kayıt ID', example: 'clx123456789' })
  @ApiResponse({ 
    status: 200, 
    description: 'Başarılı',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Kayıt bulunamadı' })
  async getEntityById(
    @Param('entityName') entityName: string,
    @Param('id') id: string,
  ) {
    return this.crudService.getEntityById(entityName, id);
  }

  @Post(':entityName')
  @ApiOperation({ summary: 'Yeni entity kaydı oluştur' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
  @ApiResponse({ 
    status: 201, 
    description: 'Kayıt başarıyla oluşturuldu',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  async createEntity(
    @Param('entityName') entityName: string,
    @Body() data: any,
  ) {
    return this.crudService.createEntity(entityName, data);
  }

  @Put(':entityName/:id')
  @ApiOperation({ summary: 'Entity kaydını güncelle' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
  @ApiParam({ name: 'id', description: 'Kayıt ID', example: 'clx123456789' })
  @ApiResponse({ 
    status: 200, 
    description: 'Kayıt başarıyla güncellendi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Kayıt bulunamadı' })
  @ApiResponse({ status: 400, description: 'Geçersiz veri' })
  async updateEntity(
    @Param('entityName') entityName: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.crudService.updateEntity(entityName, id, data);
  }

  @Delete(':entityName/:id')
  @ApiOperation({ summary: 'Entity kaydını sil' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
  @ApiParam({ name: 'id', description: 'Kayıt ID', example: 'clx123456789' })
  @ApiResponse({ 
    status: 200, 
    description: 'Kayıt başarıyla silindi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Kayıt bulunamadı' })
  async deleteEntity(
    @Param('entityName') entityName: string,
    @Param('id') id: string,
  ) {
    return this.crudService.deleteEntity(entityName, id);
  }
}
