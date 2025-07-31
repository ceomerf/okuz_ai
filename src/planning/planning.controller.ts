import { Controller, Post, Get, Put, Delete, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Planning')
@Controller('planning')
// @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
@ApiBearerAuth()
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post('generate-plan')
  @ApiOperation({ summary: 'Generate personalized study plan' })
  async generatePlan(@Body() data: { 
    subjects: string[]; 
    goals: string[]; 
    availableTime: number; 
    learningStyle: string;
    currentLevel: string;
  }) {
    return this.planningService.generatePlan(data);
  }

  @Get('user-plans')
  @ApiOperation({ summary: 'Get user plans' })
  async getUserPlans(@Request() req) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.planningService.getUserPlans(userId);
  }

  @Get('plan/:planId')
  @ApiOperation({ summary: 'Get specific plan' })
  async getPlan(@Param('planId') planId: string) {
    return this.planningService.getPlan(planId);
  }

  @Put('plan/:planId')
  @ApiOperation({ summary: 'Update plan' })
  async updatePlan(@Param('planId') planId: string, @Body() data: any) {
    return this.planningService.updatePlan(planId, data);
  }

  @Delete('plan/:planId')
  @ApiOperation({ summary: 'Delete plan' })
  async deletePlan(@Param('planId') planId: string) {
    return this.planningService.deletePlan(planId);
  }

  @Post('reschedule')
  @ApiOperation({ summary: 'Reschedule study sessions' })
  async reschedule(@Body() data: { 
    planId: string; 
    conflicts: any[]; 
    preferences: any;
  }) {
    return this.planningService.reschedule(data);
  }

  @Post('ai-reschedule-suggestions')
  @ApiOperation({ summary: 'Get AI reschedule suggestions' })
  async getRescheduleSuggestions(@Body() data: { 
    planId: string; 
    conflicts: any[]; 
    performance: any;
  }) {
    return this.planningService.getRescheduleSuggestions(data);
  }

  @Get('weekly-overview')
  @ApiOperation({ summary: 'Get weekly study overview' })
  async getWeeklyOverview(@Request() req) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.planningService.getWeeklyOverview(userId);
  }

  @Get('daily-schedule')
  @ApiOperation({ summary: 'Get daily schedule' })
  async getDailySchedule(@Request() req, @Body() data: { date: string }) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.planningService.getDailySchedule(userId, data.date);
  }

  @Post('complete-session')
  @ApiOperation({ summary: 'Mark study session as complete' })
  async completeSession(@Body() data: { 
    sessionId: string; 
    performance: number; 
    notes: string;
  }) {
    return this.planningService.completeSession(data);
  }

  @Post('skip-session')
  @ApiOperation({ summary: 'Skip a study session' })
  async skipSession(@Body() data: { 
    sessionId: string; 
    reason: string;
  }) {
    return this.planningService.skipSession(data);
  }

  @Get('progress-tracking')
  @ApiOperation({ summary: 'Get plan progress tracking' })
  async getProgressTracking(@Request() req, @Param('planId') planId: string) {
    return this.planningService.getProgressTracking(req.user.id, planId);
  }

  @Post('holiday-plan')
  @ApiOperation({ summary: 'Generate holiday study plan' })
  async generateHolidayPlan(@Body() data: { 
    holidayType: string; 
    duration: number; 
    goals: string[];
  }) {
    return this.planningService.generateHolidayPlan(data);
  }

  @Post('create-holiday-plan')
  @ApiOperation({ summary: 'Create holiday study plan' })
  async createHolidayPlan(@Body() data: any) {
    return this.planningService.generateHolidayPlan(data);
  }

  @Get('long-term-plan')
  @ApiOperation({ summary: 'Get long term study plan' })
  async getLongTermPlan(@Request() req) {
    return this.planningService.getLongTermPlan(req.user.id);
  }

  @Post('create-long-term-plan')
  @ApiOperation({ summary: 'Create long term study plan' })
  async createLongTermPlan(@Body() data: { 
    goals: string[]; 
    timeline: number; 
    milestones: any[];
  }) {
    return this.planningService.createLongTermPlan(data);
  }
}
