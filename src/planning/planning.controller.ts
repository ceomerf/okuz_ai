import { Controller, Post, Get, Put, Delete, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Planning')
@Controller('planning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post('generate-plan')
  @ApiOperation({ summary: 'Generate personalized study plan' })
  async generatePlan(@Request() req, @Body() data: { 
    subjects: string[]; 
    goals: string[]; 
    availableTime: number; 
    learningStyle: string;
    currentLevel: string;
  }) {
    return this.planningService.generatePlan({ ...data, userId: req.user.id });
  }

  @Get('user-plans')
  @ApiOperation({ summary: 'Get user plans' })
  async getUserPlans(@Request() req) {
    return this.planningService.getUserPlans(req.user.id);
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
    return this.planningService.getWeeklyOverview(req.user.id);
  }

  @Post('daily-schedule')
  @ApiOperation({ summary: 'Get daily schedule' })
  async getDailySchedule(@Request() req, @Body() data: { date: string }) {
    return this.planningService.getDailySchedule(req.user.id, data.date);
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

  @Get('progress-tracking/:planId')
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
  async createHolidayPlan(@Request() req, @Body() data: any) {
    return this.planningService.generateAndPersistHolidayPlan(req.user.id, data);
  }

  @Get('long-term-plan')
  @ApiOperation({ summary: 'Get long term study plan' })
  async getLongTermPlan(@Request() req) {
    return this.planningService.getLongTermPlan(req.user.id);
  }

  @Post('create-long-term-plan')
  @ApiOperation({ summary: 'Create long term study plan' })
  async createLongTermPlan(@Request() req, @Body() data: { 
    goals: string[]; 
    timeline: number; 
    milestones: any[];
  }) {
    return this.planningService.createLongTermPlan(req.user.id, data);
  }

  // Update task progress (frontend expects this endpoint)
  @Post('update-progress')
  @ApiOperation({ summary: 'Update task progress (minutes)' })
  async updateProgress(@Body() data: { taskId: string; minutes: number }) {
    return this.planningService.updateTaskProgress(data);
  }

  // Create plan from onboarding
  @Post('create-from-onboarding')
  @ApiOperation({ summary: 'Create initial plan using onboarding data' })
  async createFromOnboarding(@Request() req, @Body() data: any) {
    return this.planningService.createPlanFromOnboarding(req.user.id, data);
  }

  // Create premium plan
  @Post('create-premium-plan')
  @ApiOperation({ summary: 'Create premium plan (7/30 days)' })
  async createPremiumPlan(@Request() req, @Body() data: any) {
    return this.planningService.createPremiumPlan(req.user.id, data);
  }

  // Check holiday plan status
  @Get('check-holiday-status')
  @ApiOperation({ summary: 'Check whether user has an active holiday plan' })
  async checkHolidayStatus(@Request() req) {
    return this.planningService.checkHolidayStatus(req.user.id);
  }

  // YKS-specific endpoints expected by frontend
  @Post('yks/assign-subjects')
  @ApiOperation({ summary: 'Assign YKS subjects to user' })
  async assignYksSubjects(@Request() req, @Body() data: { subjects: string[] }) {
    return this.planningService.assignYksSubjects(req.user.id, data);
  }

  @Post('yks/generate-plan')
  @ApiOperation({ summary: 'Generate YKS study plan' })
  async generateYksPlan(@Request() req, @Body() data: any) {
    return this.planningService.generateYksPlan(req.user.id, data);
  }

  @Get('yks/subject-recommendations')
  @ApiOperation({ summary: 'Get YKS subject recommendations' })
  async getYksSubjectRecommendations(@Query('track') track?: string) {
    return this.planningService.getYksSubjectRecommendations(track);
  }

  @Get('yks/meb-topics')
  @ApiOperation({ summary: 'Get MEB topics by subject' })
  async getMebTopics(@Query('subject') subject?: string, @Query('grade') grade?: string) {
    return this.planningService.getMebTopics(subject, grade);
  }
}
