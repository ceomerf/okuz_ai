import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get()
  findAll() {
    return { message: 'Gamification endpoint working', data: [] };
  }

  @Post()
  create(@Body() createGamificationDto: any) {
    return { message: 'Gamification created', data: createGamificationDto };
  }

  @Get('achievements')
  getAchievements() {
    return { message: 'Achievements endpoint', data: [] };
  }

  @Get('leaderboard')
  getLeaderboard() {
    return { message: 'Leaderboard endpoint', data: [] };
  }
}
