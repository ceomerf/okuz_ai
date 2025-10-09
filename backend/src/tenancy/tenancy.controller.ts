import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
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
import { TenancyService } from './tenancy.service';

@ApiTags('Multi-Tenancy')
@Controller('api/tenancy')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Post('tenant')
  @ApiOperation({ summary: 'Yeni tenant oluştur' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        domain: { type: 'string' },
        subdomain: { type: 'string' },
        settings: { type: 'object' }
      },
      required: ['name', 'domain']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Tenant oluşturuldu',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        error: { type: 'string' }
      }
    }
  })
  async createTenant(
    @Body() tenantData: any,
    @Request() req: any,
  ) {
    return this.tenancyService.createTenant(tenantData);
  }

  @Get('tenant/:id')
  @ApiOperation({ summary: 'Tenant detaylarını getir' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant detayları',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' }
      }
    }
  })
  async getTenantById(
    @Param('id') tenantId: string,
    @Request() req: any,
  ) {
    return this.tenancyService.getTenantById(tenantId);
  }

  @Get('tenant/domain/:domain')
  @ApiOperation({ summary: 'Domain ile tenant getir' })
  @ApiParam({ name: 'domain', description: 'Domain veya subdomain' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant bilgileri',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' }
      }
    }
  })
  async getTenantByDomain(
    @Param('domain') domain: string,
    @Request() req: any,
  ) {
    return this.tenancyService.getTenantByDomain(domain);
  }

  @Put('tenant/:id')
  @ApiOperation({ summary: 'Tenant güncelle' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        domain: { type: 'string' },
        subdomain: { type: 'string' },
        settings: { type: 'object' },
        isActive: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant güncellendi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' }
      }
    }
  })
  async updateTenant(
    @Param('id') tenantId: string,
    @Body() updates: any,
    @Request() req: any,
  ) {
    return this.tenancyService.updateTenant(tenantId, updates);
  }

  @Delete('tenant/:id')
  @ApiOperation({ summary: 'Tenant sil' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant silindi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' }
      }
    }
  })
  async deleteTenant(
    @Param('id') tenantId: string,
    @Request() req: any,
  ) {
    return this.tenancyService.deleteTenant(tenantId);
  }

  @Get('tenant/:id/users')
  @ApiOperation({ summary: 'Tenant kullanıcılarını getir' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maksimum kayıt sayısı' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Atlanacak kayıt sayısı' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Rol filtresi' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Aktif kullanıcı filtresi' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant kullanıcıları',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' },
        total: { type: 'number' }
      }
    }
  })
  async getTenantUsers(
    @Param('id') tenantId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.tenancyService.getTenantUsers(tenantId, {
      limit,
      offset,
      role,
      isActive,
    });
  }

  @Get('tenant/:id/stats')
  @ApiOperation({ summary: 'Tenant istatistiklerini getir' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant istatistikleri',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number' },
            activeUsers: { type: 'number' },
            usersByRole: { type: 'object' },
            totalDashboards: { type: 'number' },
            totalSchemas: { type: 'number' },
            createdAt: { type: 'string' }
          }
        }
      }
    }
  })
  async getTenantStats(
    @Param('id') tenantId: string,
    @Request() req: any,
  ) {
    return this.tenancyService.getTenantStats(tenantId);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Tüm tenantları listele' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maksimum kayıt sayısı' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Atlanacak kayıt sayısı' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Aktif tenant filtresi' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tenant listesi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' },
        total: { type: 'number' }
      }
    }
  })
  async getAllTenants(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.tenancyService.getAllTenants({
      limit,
      offset,
      isActive,
    });
  }
}
