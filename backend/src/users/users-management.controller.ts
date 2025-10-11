import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersManagementService } from './users-management.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/users-management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersManagementController {
  constructor(private readonly usersService: UsersManagementService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.usersService.getUsers({
      page,
      limit,
      search,
      role,
      isActive,
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: {
      firstName?: string;
      lastName?: string;
      name?: string;
      isActive?: boolean;
    },
  ) {
    return this.usersService.updateUser(id, updateData);
  }

  @Put(':id/deactivate')
  @Roles(UserRole.ADMIN)
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Put(':id/activate')
  @Roles(UserRole.ADMIN)
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }
}
