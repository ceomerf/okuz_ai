import { Controller, Get, Param, Post, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SchemasService } from './schemas.service';

@ApiTags('Entity Schemas')
@Controller('api/schemas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class SchemasController {
  constructor(private readonly schemasService: SchemasService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm entity şemalarını listele' })
  @ApiResponse({ 
    status: 200, 
    description: 'Başarılı',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              entityName: { type: 'string' },
              displayName: { type: 'string' },
              description: { type: 'string' },
              apiEndpoint: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' },
              sortOrder: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async getAllSchemas() {
    return this.schemasService.getAllSchemas();
  }

  @Get(':entityName')
  @ApiOperation({ summary: 'Belirli bir entity şemasını getir' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
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
            id: { type: 'string' },
            entityName: { type: 'string' },
            displayName: { type: 'string' },
            description: { type: 'string' },
            apiEndpoint: { type: 'string' },
            icon: { type: 'string' },
            color: { type: 'string' },
            schema: { type: 'object' },
            sortOrder: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Schema bulunamadı' })
  async getSchemaByEntityName(@Param('entityName') entityName: string) {
    return this.schemasService.getSchemaByEntityName(entityName);
  }

  @Post()
  @ApiOperation({ summary: 'Yeni entity şeması oluştur' })
  @ApiResponse({ status: 201, description: 'Schema başarıyla oluşturuldu' })
  async createSchema(@Body() schemaData: any) {
    return this.schemasService.createSchema(schemaData);
  }

  @Put(':entityName')
  @ApiOperation({ summary: 'Entity şemasını güncelle' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
  @ApiResponse({ status: 200, description: 'Schema başarıyla güncellendi' })
  async updateSchema(@Param('entityName') entityName: string, @Body() schemaData: any) {
    return this.schemasService.updateSchema(entityName, schemaData);
  }

  @Delete(':entityName')
  @ApiOperation({ summary: 'Entity şemasını sil (deaktive et)' })
  @ApiParam({ name: 'entityName', description: 'Entity adı', example: 'students' })
  @ApiResponse({ status: 200, description: 'Schema başarıyla silindi' })
  async deleteSchema(@Param('entityName') entityName: string) {
    return this.schemasService.deleteSchema(entityName);
  }
}
