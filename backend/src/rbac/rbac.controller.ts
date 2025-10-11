import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RbacService } from './rbac.service';

@ApiTags('RBAC')
@ApiBearerAuth()
@Controller('api/rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tüm rolleri listeler' })
  async getRoles() {
    return this.rbacService.getRoles();
  }

  @Post('roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Yeni bir rol oluşturur' })
  async createRole(@Body() body: { name: string; description?: string }) {
    return this.rbacService.createRole(body.name, body.description);
  }

  @Get('permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tüm izinleri listeler' })
  async getPermissions() {
    return this.rbacService.getPermissions();
  }

  @Post('roles/:roleId/permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bir role izinler atar' })
  async assignPermissionsToRole(
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.rbacService.assignPermissionsToRole(roleId, body.permissionIds);
  }

  @Put('users/:userId/roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bir kullanıcının rollerini günceller' })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() body: { roleIds: string[] },
  ) {
    return this.rbacService.updateUserRoles(userId, body.roleIds);
  }

  // Frontend uyumluluğu için POST alias
  @Post('users/:userId/roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bir kullanıcının rollerini günceller (alias POST)' })
  async assignUserRolesAlias(
    @Param('userId') userId: string,
    @Body() body: { roleIds: string[] },
  ) {
    return this.rbacService.updateUserRoles(userId, body.roleIds);
  }

  @Get('users/:userId/roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Kullanıcının rollerini getir' })
  async getUserRoles(@Param('userId') userId: string) {
    return this.rbacService.getUserRoles(userId);
  }

  @Post('simulate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Rol/izin simülasyonu' })
  async simulatePermission(@Body() body: { userId?: string; permission?: string; roleIds?: string[] }) {
    return this.rbacService.simulate(body);
  }

  @Post('users/:userId/temporary-access')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bir kullanıcıya geçici rol yetkisi ver' })
  async grantTemporaryAccess(
    @Param('userId') userId: string,
    @Body() body: { roleId: string; durationInHours: number },
  ) {
    return this.rbacService.grantTemporaryAccess(userId, body.roleId, body.durationInHours);
  }
}


