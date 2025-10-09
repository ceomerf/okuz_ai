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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersManagementService } from './users-management.service';

@ApiTags('Users Management')
@Controller('api/users-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class UsersManagementController {
  constructor(private readonly usersManagementService: UsersManagementService) {}

  @Get()
  @ApiOperation({ summary: 'Gelişmiş kullanıcı listesi - arama, filtreleme, sıralama' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Sayfa numarası' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sayfa başına kayıt' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Arama terimi (ad, email)' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Rol filtresi' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Durum filtresi (active/inactive)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sıralama alanı' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sıralama yönü (asc/desc)' })
  @ApiResponse({ status: 200, description: 'Kullanıcı listesi başarıyla getirildi' })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.usersManagementService.getUsersWithFilters({
      page,
      limit,
      search,
      role,
      status,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kullanıcı detayları' })
  @ApiResponse({ status: 200, description: 'Kullanıcı detayları' })
  @ApiResponse({ status: 404, description: 'Kullanıcı bulunamadı' })
  async getUserById(@Param('id') id: string) {
    return this.usersManagementService.getUserById(id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Kullanıcı aktivite geçmişi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Kullanıcı aktivite geçmişi' })
  async getUserActivity(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.usersManagementService.getUserActivity(id, page, limit);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Kullanıcı durumu değiştir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı durumu başarıyla değiştirildi' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' },
  ) {
    return this.usersManagementService.updateUserStatus(id, body.status);
  }

  @Post('bulk-actions')
  @ApiOperation({ summary: 'Toplu kullanıcı işlemleri' })
  @ApiResponse({ status: 200, description: 'Toplu işlem başarıyla tamamlandı' })
  async bulkActions(@Body() body: {
    action: 'delete' | 'activate' | 'deactivate' | 'assign-role';
    userIds: string[];
    role?: string;
  }) {
    return this.usersManagementService.bulkActions(body);
  }

  @Get('roles/available')
  @ApiOperation({ summary: 'Mevcut roller listesi' })
  @ApiResponse({ status: 200, description: 'Mevcut roller' })
  async getAvailableRoles() {
    return this.usersManagementService.getAvailableRoles();
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Kullanıcı rol ataması' })
  @ApiResponse({ status: 200, description: 'Rol ataması başarıyla tamamlandı' })
  async updateUserRoles(
    @Param('id') id: string,
    @Body() body: { roles: string[] },
  ) {
    return this.usersManagementService.updateUserRoles(id, body.roles);
  }
}
