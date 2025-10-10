import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FeatureFlagsService, CreateFeatureFlagDto, UpdateFeatureFlagDto } from './feature-flags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getFeatureFlags(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.featureFlagsService.getFeatureFlags({
      page,
      limit,
      search,
      isActive,
    });
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getActiveFeatureFlags() {
    return this.featureFlagsService.getActiveFeatureFlags();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getFeatureFlagStats() {
    return this.featureFlagsService.getFeatureFlagStats();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async getFeatureFlagById(@Param('id') id: string) {
    return this.featureFlagsService.getFeatureFlagById(id);
  }

  @Get('name/:name')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getFeatureFlagByName(@Param('name') name: string) {
    return this.featureFlagsService.getFeatureFlagByName(name);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createFeatureFlag(@Body() data: CreateFeatureFlagDto) {
    return this.featureFlagsService.createFeatureFlag(data);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateFeatureFlag(
    @Param('id') id: string,
    @Body() data: UpdateFeatureFlagDto,
  ) {
    return this.featureFlagsService.updateFeatureFlag(id, data);
  }

  @Put(':id/toggle')
  @Roles(UserRole.ADMIN)
  async toggleFeatureFlag(@Param('id') id: string) {
    return this.featureFlagsService.toggleFeatureFlag(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteFeatureFlag(@Param('id') id: string) {
    await this.featureFlagsService.deleteFeatureFlag(id);
    return { message: 'Feature flag deleted successfully' };
  }

  @Get('check/:name')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async isFeatureEnabled(@Param('name') name: string) {
    const isEnabled = await this.featureFlagsService.isFeatureEnabled(name);
    return { name, isEnabled };
  }

  @Get('value/:name')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getFeatureFlagValue(
    @Param('name') name: string,
    @Query('defaultValue') defaultValue?: string,
  ) {
    const value = await this.featureFlagsService.getFeatureFlagValue(name, defaultValue);
    return { name, value };
  }
}
