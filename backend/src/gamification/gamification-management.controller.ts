import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GamificationManagementService } from './gamification-management.service';

@Controller('gamification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class GamificationManagementController {
  constructor(private readonly gamificationService: GamificationManagementService) {}

  @Get('badges')
  async getBadges(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('rarity') rarity?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.gamificationService.getBadges({
      page,
      limit,
      rarity,
      isActive,
      search,
    });
  }

  @Get('badges/:id')
  async getBadgeById(@Param('id') id: string) {
    return this.gamificationService.getBadgeById(id);
  }

  @Post('badges')
  async createBadge(@Body() createData: {
    name: string;
    description: string;
    icon: string;
    rarity: string;
    points: number;
    isActive: boolean;
  }) {
    return this.gamificationService.createBadge(createData);
  }

  @Put('badges/:id')
  async updateBadge(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      description?: string;
      icon?: string;
      rarity?: string;
      points?: number;
      isActive?: boolean;
    },
  ) {
    return this.gamificationService.updateBadge(id, updateData);
  }

  @Delete('badges/:id')
  async deleteBadge(@Param('id') id: string) {
    return this.gamificationService.deleteBadge(id);
  }

  @Get('badges/:id/rules')
  async getBadgeRules(@Param('id') id: string) {
    return this.gamificationService.getBadgeRules(id);
  }

  @Post('badges/:id/rules')
  async createBadgeRule(
    @Param('id') id: string,
    @Body() ruleData: {
      condition: string;
      value: number;
      description: string;
    },
  ) {
    return this.gamificationService.createBadgeRule(id, ruleData);
  }

  @Put('badges/:id/activate')
  async activateBadge(@Param('id') id: string) {
    return this.gamificationService.activateBadge(id);
  }

  @Put('badges/:id/deactivate')
  async deactivateBadge(@Param('id') id: string) {
    return this.gamificationService.deactivateBadge(id);
  }

  @Get('achievements')
  async getAchievements(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.gamificationService.getAchievements({
      page,
      limit,
      type,
      userId,
      search,
    });
  }

  @Get('achievements/:id')
  async getAchievementById(@Param('id') id: string) {
    return this.gamificationService.getAchievementById(id);
  }

  @Post('achievements')
  async createAchievement(@Body() createData: {
    userId: string;
    badgeId: string;
    type: string;
    points: number;
    description?: string;
  }) {
    return this.gamificationService.createAchievement(createData);
  }

  @Put('achievements/:id')
  async updateAchievement(
    @Param('id') id: string,
    @Body() updateData: {
      type?: string;
      points?: number;
      description?: string;
    },
  ) {
    return this.gamificationService.updateAchievement(id, updateData);
  }

  @Delete('achievements/:id')
  async deleteAchievement(@Param('id') id: string) {
    return this.gamificationService.deleteAchievement(id);
  }

  @Post('achievements/:id/award')
  async awardAchievement(@Param('id') id: string) {
    return this.gamificationService.awardAchievement(id);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('type') type?: string,
    @Query('period') period?: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.gamificationService.getLeaderboard({
      type,
      period,
      limit,
    });
  }

  @Get('statistics')
  async getGamificationStatistics() {
    return this.gamificationService.getGamificationStatistics();
  }

  @Get('badge-categories')
  async getBadgeCategories() {
    return this.gamificationService.getBadgeCategories();
  }

  @Get('badge-templates')
  async getBadgeTemplates() {
    return this.gamificationService.getBadgeTemplates();
  }
}