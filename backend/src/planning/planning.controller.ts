import { Controller, Post, Get, Put, Delete, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { PlanGenerationService } from './plan-generation.service';
import { PlanAnalysisService } from './plan-analysis.service';
import { PlanPersistenceService } from './plan-persistence.service';
import { PlanValidationService } from './plan-validation.service';
import { QueueService } from '../services/queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { CreateFromOnboardingDto } from './dto/create-from-onboarding.dto';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { RescheduleSessionDto } from './dto/reschedule-session.dto';

class DailyScheduleDto {
  @IsDateString()
  date!: string;
}

class CompleteSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsNumber()
  @Min(0)
  performance!: number;

  @IsString()
  @MinLength(0)
  notes!: string;
}

class SkipSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

@ApiTags('Planning')
@Controller('planning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlanningController {
  constructor(
    private readonly planningService: PlanningService,
    private readonly planGenerationService: PlanGenerationService,
    private readonly planAnalysisService: PlanAnalysisService,
    private readonly planPersistenceService: PlanPersistenceService,
    private readonly planValidationService: PlanValidationService,
    private readonly queue: QueueService,
  ) {}

  @Post('generate-plan')
  @ApiOperation({ summary: 'Generate personalized study plan (basic or AI) [async]' })
  async generatePlan(@Request() req: any, @Body() planData: GeneratePlanDto) {
    // Idempotency: aynı kullanıcı ve aynı normalized payload için tek job (yalnızca AI modda uygula)
    const payload = { userId: req.user.id, payload: planData } as any;
    const normalized = JSON.stringify(payload);
    const base64 = Buffer.from(normalized).toString('base64');
    const computedJobId = `generate-plan:${req.user.id}:${base64.slice(0, 16)}`;

    const isAi = planData?.mode === 'ai';
    const force = Boolean((planData as any)?.force);

    const opts: any = { removeOnComplete: 1000, removeOnFail: 1000 };
    // Basic modda veya force=true ise idempotent jobId kullanma; AI modda idempotentlik koru
    if (isAi && !force) {
      opts.jobId = computedJobId;
    }

    const job = await this.queue.addJob('generate-plan', payload, opts);
    return { accepted: true, jobId: job.id };
  }

  @Get('generate-plan/status/:jobId')
  @ApiOperation({ summary: 'Get status of async generate-plan job' })
  async getGeneratePlanStatus(@Param('jobId') jobId: string) {
    // Basit ilk sürüm: Worker tamamlandığında plan DB'de olacak; burada sadece job bilgisinin frontendçe kullanılacağını varsayıyoruz
    return { jobId, status: 'queued' };
  }

  @Get('user-plans')
  @ApiOperation({ summary: 'Get user plans' })
  async getUserPlans(@Request() req: any) {
    const plans = await this.planPersistenceService.getUserPlans(req.user.id);
    
    return plans.map((plan: any) => ({
      ...plan,
      progress: this.planAnalysisService.calculatePlanProgress(plan.sessions),
      nextSession: this.planAnalysisService.getNextSession(plan.sessions),
      stats: {
        totalSessions: plan.sessions.length,
        completedSessions: plan.sessions.filter((s: any) => s.isCompleted).length,
        totalStudyTime: plan.sessions.reduce((sum: any, s: any) => sum + s.duration, 0),
        completedStudyTime: plan.sessions.filter((s: any) => s.isCompleted).reduce((sum: any, s: any) => sum + s.duration, 0),
      },
    }));
  }

  @Get('plan/:planId')
  @ApiOperation({ summary: 'Get specific plan' })
  async getPlan(@Request() req: any, @Param('planId') planId: string) {
    const plan = await this.planPersistenceService.getPlan(req.user.id, planId);
    
    return {
      ...plan,
      progress: this.planAnalysisService.calculatePlanProgress(plan.sessions),
      analytics: await this.planAnalysisService.getPlanAnalytics(planId),
      recommendations: await this.planAnalysisService.getPlanRecommendations(plan),
    };
  }

  @Put('plan/:planId')
  @ApiOperation({ summary: 'Update plan' })
  async updatePlan(@Request() req: any, @Param('planId') planId: string, @Body() data: any) {
    // Doğrulama
    const validation = this.planValidationService.validatePlanUpdate(data);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Sahiplik kontrolü
    const isOwner = await this.planPersistenceService.verifyPlanOwnership(req.user.id, planId);
    if (!isOwner) {
      throw new Error('Plan not found or access denied');
    }

    // Güncelleme
    const updatedPlan = await this.planPersistenceService.updatePlan(planId, data);
    
    return {
      success: true,
      message: 'Plan updated successfully',
      plan: updatedPlan,
    };
  }

  @Delete('plan/:planId')
  @ApiOperation({ summary: 'Delete plan' })
  async deletePlan(@Request() req: any, @Param('planId') planId: string) {
    // Sahiplik kontrolü
    const isOwner = await this.planPersistenceService.verifyPlanOwnership(req.user.id, planId);
    if (!isOwner) {
      throw new Error('Plan not found or access denied');
    }

    // Silme
    await this.planPersistenceService.deletePlan(planId);
    
    return {
      success: true,
      message: 'Plan deleted successfully',
    };
  }

  @Post('reschedule')
  @ApiOperation({ summary: 'Reschedule a single study session' })
  async reschedule(@Request() req: any, @Body() dto: RescheduleSessionDto) {
    return this.planningService.rescheduleSingle({ 
      ...dto, 
      userId: req.user.id,
      newStartTime: new Date(dto.newStartTime)
    });
  }

  @Post('ai-reschedule-suggestions')
  @ApiOperation({ summary: 'Get AI reschedule suggestions' })
  async getRescheduleSuggestions(@Request() req: any, @Body() data: { 
    planId: string; 
    conflicts: any[]; 
    performance: any;
  }) {
    return this.planningService.getRescheduleSuggestions({ ...(data as any), userId: req.user.id } as any);
  }

  @Get('weekly-overview')
  @ApiOperation({ summary: 'Get weekly study overview' })
  async getWeeklyOverview(@Request() req: any) {
    return this.planningService.getWeeklyOverview(req.user.id);
  }

  @Post('daily-schedule')
  @ApiOperation({ summary: 'Get daily schedule' })
  async getDailySchedule(@Request() req: any, @Body() data: DailyScheduleDto) {
    return this.planningService.getDailySchedule(req.user.id, data.date);
  }

  @Post('complete-session')
  @ApiOperation({ summary: 'Mark study session as complete' })
  async completeSession(@Request() req: any, @Body() data: CompleteSessionDto) {
    return this.planningService.completeSession({ ...data, userId: req.user.id });
  }

  @Post('skip-session')
  @ApiOperation({ summary: 'Skip a study session' })
  async skipSession(@Request() req: any, @Body() data: SkipSessionDto) {
    return this.planningService.skipSession({ ...data, userId: req.user.id });
  }

  @Get('progress-tracking/:planId')
  @ApiOperation({ summary: 'Get plan progress tracking' })
  async getProgressTracking(@Request() req: any, @Param('planId') planId: string) {
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
  async createHolidayPlan(@Request() req: any, @Body() data: any) {
    return this.planningService.generateAndPersistHolidayPlan(req.user.id, data);
  }

  @Get('long-term-plan')
  @ApiOperation({ summary: 'Get long term study plan' })
  async getLongTermPlan(@Request() req: any) {
    return this.planningService.getLongTermPlan(req.user.id);
  }

  @Post('create-long-term-plan')
  @ApiOperation({ summary: 'Create long term study plan' })
  async createLongTermPlan(@Request() req: any, @Body() data: { 
    goals: string[]; 
    timeline: number; 
    milestones: any[];
  }) {
    return this.planningService.createLongTermPlan(req.user.id, data);
  }

  // Update task progress (frontend expects this endpoint)
  @Post('update-progress')
  @ApiOperation({ summary: 'Update task progress (minutes)' })
  async updateProgress(@Request() req: any, @Body() data: { taskId: string; minutes: number }) {
    return this.planningService.updateTaskProgress({ ...data, userId: req.user.id });
  }

  // Create plan from onboarding
  @Post('create-from-onboarding')
  @ApiOperation({ summary: 'Create initial plan using onboarding data' })
  async createFromOnboarding(@Request() req: any, @Body() data: CreateFromOnboardingDto) {
    return this.planningService.createPlanFromOnboarding(req.user.id, data);
  }

  // Create premium plan
  @Post('create-premium-plan')
  @ApiOperation({ summary: 'Create premium plan (7/30 days)' })
  async createPremiumPlan(@Request() req: any, @Body() data: any) {
    return this.planningService.createPremiumPlan(req.user.id, data);
  }

  // Check holiday plan status
  @Get('check-holiday-status')
  @ApiOperation({ summary: 'Check whether user has an active holiday plan' })
  async checkHolidayStatus(@Request() req: any) {
    return this.planningService.checkHolidayStatus(req.user.id);
  }

  // YKS-specific endpoints expected by frontend
  @Post('yks/assign-subjects')
  @ApiOperation({ summary: 'Assign YKS subjects to user' })
  async assignYksSubjects(@Request() req: any, @Body() data: { subjects: string[] }) {
    return this.planningService.assignYksSubjects(req.user.id, data);
  }

  @Post('yks/generate-plan')
  @ApiOperation({ summary: 'Generate YKS study plan' })
  async generateYksPlan(@Request() req: any, @Body() data: any) {
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

  @Post('assessment/start')
  @ApiOperation({ summary: 'Start user assessment for personalized planning' })
  async startAssessment(@Request() req: any, @Body() assessmentData: { subjects: string[]; grade: number; learningGoals: string[] }) {
    return this.planningService.startAssessment(req.user.id, assessmentData);
  }

  @Get('assessment/status')
  @ApiOperation({ summary: 'Get assessment status and recommendations' })
  async getAssessmentStatus(@Request() req: any) {
    return this.planningService.getAssessmentStatus(req.user.id);
  }

  @Get('adaptive-sequence')
  @ApiOperation({ summary: 'Get adaptive topic sequence based on user level' })
  async getAdaptiveSequence(@Request() req: any, @Query('subjects') subjects: string, @Query('weeks') weeks: string) {
    const subjectsArray = subjects ? subjects.split(',') : ['Matematik', 'Fizik', 'Kimya'];
    const weeksNumber = weeks ? parseInt(weeks) : 1;
    return this.planningService.getAdaptiveTopicSequence(req.user.id, subjectsArray, weeksNumber);
  }

  @Post('progress/track')
  @ApiOperation({ summary: 'Track study session progress' })
  async trackProgress(@Request() req: any, @Body() progressData: { sessionId: string; score: number; timeSpent: number; notes?: string }) {
    return this.planningService.trackProgress(req.user.id, progressData.sessionId, {
      score: progressData.score,
      timeSpent: progressData.timeSpent,
      notes: progressData.notes
    });
  }

  @Get('progress/overview')
  @ApiOperation({ summary: 'Get user progress overview' })
  async getProgressOverview(@Request() req: any) {
    return this.planningService.getProgressOverview(req.user.id);
  }

  @Get('coaching')
  @ApiOperation({ summary: 'Get smart coaching recommendations' })
  async getSmartCoaching(@Request() req: any) {
    return this.planningService.getSmartCoaching(req.user.id);
  }
}
