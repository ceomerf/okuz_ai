import { Controller, Post, Get, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  private readonly logger = new Logger(GamificationController.name);
  
  constructor(private readonly gamificationService: GamificationService) {
    this.logger.log('GamificationController initialized');
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Post('complete-task')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a task and earn rewards' })
  async completeTask(@Request() req: any, @Body() data: any) {
    this.logger.log('completeTask endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.completeTask({ ...data, userId });
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Get('leaderboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get leaderboard rankings' })
  async getLeaderboard(@Request() req: any) {
    this.logger.log('getLeaderboard endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.getLeaderboard(userId);
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Get('achievements')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user achievements' })
  async getAchievements(@Request() req: any) {
    this.logger.log('getAchievements endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.getAchievements(userId);
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Post('unlock-achievement')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock an achievement' })
  async unlockAchievement(@Request() req: any, @Body() data: any) {
    this.logger.log('unlockAchievement endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.unlockAchievement({ ...data, userId });
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Get('daily-challenges')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get daily challenges' })
  async getDailyChallenges(@Request() req: any): Promise<any> {
    this.logger.log('getDailyChallenges endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.getDailyChallenges(userId);
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Post('complete-challenge')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a daily challenge' })
  async completeChallenge(@Request() req: any, @Body() data: any) {
    this.logger.log('completeChallenge endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.completeChallenge({ ...data, userId });
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Get('streaks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user streaks and patterns' })
  async getStreaks(@Request() req: any) {
    this.logger.log('getStreaks endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.getStreaks(userId);
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Get('rewards')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available rewards' })
  async getRewards(@Request() req: any) {
    this.logger.log('getRewards endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.getRewards(userId);
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Post('claim-reward')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim a reward' })
  async claimReward(@Request() req: any, @Body() data: any) {
    this.logger.log('claimReward endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.claimReward({ ...data, userId });
  }

  // TAMAMEN YENİDEN YAZILDI - Progress endpoint
  @Get('progress')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user progress overview' })
  async getProgress(@Request() req: any) {
    this.logger.log('getProgress endpoint called - DEBUG');
    try {
      const userId = req.user?.userId || 'user-1753052679951';
      this.logger.log(`Calling service with userId: ${userId}`);
      const result = await this.gamificationService.getProgress(userId);
      this.logger.log('getProgress service call successful');
      return result;
    } catch (error: any) {
      this.logger.error(`getProgress error: ${error.message}`);
      throw error;
    }
  }

  // TAMAMEN YENİDEN YAZILDI - Level Info endpoint
  @Get('level-info')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user level information' })
  async getLevelInfo(@Request() req: any): Promise<any> {
    this.logger.log('getLevelInfo endpoint called - DEBUG');
    try {
      const userId = req.user?.userId || 'user-1753052679951';
      this.logger.log(`Calling service with userId: ${userId}`);
      const result = await this.gamificationService.getLevelInfo(userId);
      this.logger.log('getLevelInfo service call successful');
      return result;
    } catch (error: any) {
      this.logger.error(`getLevelInfo error: ${error.message}`);
      throw error;
    }
  }

  // @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
  @Post('use-energy')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Use energy for an activity' })
  async useEnergy(@Request() req: any, @Body() data: any) {
    this.logger.log('useEnergy endpoint called');
    const userId = req.user?.userId || 'user-1753052679951';
    return this.gamificationService.useEnergy({ ...data, userId });
  }

  // TAMAMEN YENİDEN YAZILDI - Energy Status endpoint
  @Get('energy-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current energy status' })
  async getEnergyStatus(@Request() req: any) {
    this.logger.log('getEnergyStatus endpoint called - DEBUG');
    try {
      const userId = req.user?.userId || 'user-1753052679951';
      this.logger.log(`Calling service with userId: ${userId}`);
      const result = await this.gamificationService.getEnergyStatus(userId);
      this.logger.log('getEnergyStatus service call successful');
      return result;
    } catch (error: any) {
      this.logger.error(`getEnergyStatus error: ${error.message}`);
      throw error;
    }
  }
}
