import { Controller, Post, Get, Put, Delete, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { PlanningFacade } from './planning-facade.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PlanGenerationService } from './services/plan-generation.service';
import { PlanAnalysisService } from './plan-analysis.service';
import { PlanPersistenceService } from './services/plan-persistence.service';
import { PlanValidationService } from './services/plan-validation.service';
import { PlanOptimizationService } from './services/plan-optimization.service';
import { QueueService } from '../services/queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { CreateFromOnboardingDto } from './dto/create-from-onboarding.dto';
import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MinLength, IsBoolean } from 'class-validator';
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
@ApiResponse({ status: 429, description: 'Rate limit exceeded' })
export class PlanningController {
  constructor(
    private readonly planningService: PlanningService, // Legacy service
    private readonly planningFacade: PlanningFacade, // New facade service
    private readonly planGenerationService: PlanGenerationService,
    private readonly planAnalysisService: PlanAnalysisService,
    private readonly planPersistenceService: PlanPersistenceService,
    private readonly planValidationService: PlanValidationService,
    private readonly planOptimizationService: PlanOptimizationService,
    private readonly queue: QueueService,
    private readonly subscriptionService: SubscriptionService,
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

  // Haftalık plan oluşturma (Premium guard + 7 gün zorunluluğu)
  @Post('weekly/generate')
  @ApiOperation({ summary: 'Generate weekly (7-day) study plan - Premium only' })
  async generateWeeklyPlan(@Request() req: any, @Body() planData: any) {
    const hasAccess = await this.subscriptionService.checkPremiumAccess(req.user.id, 'weekly_plan');
    if (!hasAccess) {
      // 403
      const err: any = new Error('Premium özellik: Haftalık plan yalnızca abonelere açıktır.');
      err.status = 403;
      throw err;
    }
    const payload = { ...(planData || {}), planDurationDays: 7, planType: 'weekly' };
    return this.planningService.createPremiumPlan(req.user.id, payload);
  }

  @Get('user-plans')
  @ApiOperation({ summary: 'Get user plans' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getUserPlans(@Request() req: any, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    const l = Math.min(Number(limit || 20), 100);
    const o = Math.max(Number(offset || 0), 0);
    const plans = await this.planPersistenceService.getUserPlans(req.user.id);
    const paged = plans.slice(o, o + l);
    
    return paged.map((plan: any) => ({
      ...plan,
      progress: this.planAnalysisService.calculatePlanProgress(plan.studySessions),
      nextSession: this.planAnalysisService.getNextSession(plan.studySessions),
      stats: {
        totalSessions: plan.studySessions.length,
        completedSessions: plan.studySessions.filter((s: any) => s.isCompleted).length,
        totalStudyTime: plan.studySessions.reduce((sum: any, s: any) => sum + s.duration, 0),
        completedStudyTime: plan.studySessions.filter((s: any) => s.isCompleted).reduce((sum: any, s: any) => sum + s.duration, 0),
      },
    }));
  }

  @Get('plan/:planId')
  @ApiOperation({ summary: 'Get specific plan' })
  async getPlan(@Request() req: any, @Param('planId') planId: string) {
    const plan = await this.planPersistenceService.getPlan(req.user.id, planId);
    
    return {
      ...plan,
      progress: this.planAnalysisService.calculatePlanProgress(plan.studySessions),
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
    const updatedPlan = await this.planPersistenceService.updatePlan(req.user.id, planId, data);
    
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
    await this.planPersistenceService.deletePlan(req.user.id, planId);
    
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
      newStartTime: dto.newStartTime
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

  // Prefetch: yarınki seanslar (Aşama 2)
  @Get('prefetch/tomorrow')
  @ApiOperation({ summary: 'Prefetch next day sessions for offline use' })
  async prefetchTomorrow(@Request() req: any) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() + 1);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const sessions = await (this.planPersistenceService as any).getUserSessionsInRange?.(req.user.id, start, end)
      ?? await this.planPersistenceService.getSessionsInRange(req.user.id, start, end);
    return { range: { start, end }, sessions };
  }

  @Post('complete-session')
  @ApiOperation({ summary: 'Mark study session as complete' })
  async completeSession(@Request() req: any, @Body() data: CompleteSessionDto) {
    return this.planningService.completeSession({ ...data, userId: req.user.id });
  }

  @Post('skip-session')
  @ApiExcludeEndpoint()
  async skipSession(@Request() req: any, @Body() data: SkipSessionDto) {
    return this.planningService.skipSession({ ...data, userId: req.user.id });
  }

  @Get('progress-tracking/:planId')
  @ApiExcludeEndpoint()
  async getProgressTracking(@Request() req: any, @Param('planId') planId: string) {
    return this.planningService.getProgressTracking(req.user.id, planId);
  }

  @Post('holiday-plan')
  @ApiExcludeEndpoint()
  async generateHolidayPlan(@Body() data: { 
    holidayType: string; 
    duration: number; 
    goals: string[];
  }) {
    return this.planningService.generateHolidayPlan(data);
  }

  @Post('create-holiday-plan')
  @ApiExcludeEndpoint()
  async createHolidayPlan(@Request() req: any, @Body() data: any) {
    return this.planningService.generateAndPersistHolidayPlan(req.user.id, data);
  }

  @Get('long-term-plan')
  @ApiExcludeEndpoint()
  async getLongTermPlan(@Request() req: any) {
    return this.planningService.getLongTermPlan(req.user.id);
  }

  @Post('create-long-term-plan')
  @ApiExcludeEndpoint()
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

  // Admin CRUD uçları (temel yetki kontrolü varsayılıyor - JwtAuthGuard ekli)
  @Post('admin/meb-topic')
  @ApiOperation({ summary: 'Admin: Create MEB Topic' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminCreateMebTopic(@Body() data: { grade: number; subject: string; unit: string; topic: string; month?: number; tytWeight?: number; aytWeight?: number }) {
    const svc: any = this.planPersistenceService as any;
    const topicSvc: any = (this as any).topicManagementService || (this.planningService as any)?.topicManagement;
    if (topicSvc?.adminCreateMebTopic) return topicSvc.adminCreateMebTopic(data);
    return { success: false, message: 'Not implemented' };
  }

  @Put('admin/meb-topic/:id')
  @ApiOperation({ summary: 'Admin: Update MEB Topic' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminUpdateMebTopic(@Param('id') id: string, @Body() data: any) {
    const topicSvc: any = (this as any).topicManagementService || (this.planningService as any)?.topicManagement;
    if (topicSvc?.adminUpdateMebTopic) return topicSvc.adminUpdateMebTopic(id, data);
    return { success: false, message: 'Not implemented' };
  }

  @Delete('admin/meb-topic/:id')
  @ApiOperation({ summary: 'Admin: Delete MEB Topic' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminDeleteMebTopic(@Param('id') id: string) {
    const topicSvc: any = (this as any).topicManagementService || (this.planningService as any)?.topicManagement;
    if (topicSvc?.adminDeleteMebTopic) return topicSvc.adminDeleteMebTopic(id);
    return { success: false, message: 'Not implemented' };
  }

  @Get('admin/meb-topics')
  @ApiOperation({ summary: 'Admin: List MEB Topics' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminListMebTopics(@Query('subject') subject?: string, @Query('grade') grade?: string) {
    const filter: any = {};
    if (subject) filter.subject = subject;
    if (grade) filter.grade = parseInt(grade);
    const topicSvc: any = (this as any).topicManagementService || (this.planningService as any)?.topicManagement;
    if (topicSvc?.adminListMebTopics) return topicSvc.adminListMebTopics(filter);
    return { success: false, message: 'Not implemented' };
  }

  @Post('assessment/start')
  @ApiOperation({ summary: 'Start user assessment for personalized planning' })
  async startAssessment(@Request() req: any, @Body() assessmentData: { subjects: string[]; grade: number; learningGoals: string[] }) {
    return this.planningService.startAssessment(req.user.id, assessmentData);
  }

  // Haftalık deneme/quiz planlama ve sonuç kaydı
  @Post('quiz/schedule-weekly')
  @ApiOperation({ summary: 'Schedule weekly trial exam/quiz' })
  async scheduleWeeklyQuiz(@Request() req: any, @Body() data: { type: 'TYT' | 'AYT'; day?: string }) {
    // Basit: Pazar günü deneme default
    const day = (data.day || 'Pazar').toString();
    return this.planPersistenceService.scheduleWeeklyQuiz?.(req.user.id, { type: data.type, day });
  }

  @Post('quiz/submit')
  @ApiOperation({ summary: 'Submit quiz/exam results and impact planning' })
  async submitQuiz(@Request() req: any, @Body() result: { subject: string; topic?: string; score: number; totalScore: number }) {
    // Sonucu kaydet ve bir sonraki weekly replan’da etkilesin
    return this.planPersistenceService.recordQuizResult?.(req.user.id, result);
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

  // Raporlama: Haftalık özet
  @Get('report/weekly')
  @ApiOperation({ summary: 'Get weekly report overview' })
  async getWeeklyReport(@Request() req: any) {
    // Son 7 gün plan/sessions analizi
    const plans = await this.planPersistenceService.getUserPlans(req.user.id);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    const allSessions = ([] as any[]).concat(...plans.map((p: any) => p.studySessions || []));
    const weekSessions = allSessions.filter(s => new Date(s.startTime) >= start && new Date(s.startTime) <= now);
    const completion = this.planAnalysisService.calculatePlanProgress(weekSessions);
    const analytics = {
      completionRate: completion,
      totalStudyTime: weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      subjectBreakdown: (this.planAnalysisService as any).getSubjectBreakdown?.(weekSessions) || {},
    };
    return { range: { start, end: now }, analytics };
  }

  // MV tabanlı haftalık özet (Aşama 2)
  @Get('report/weekly/mv')
  @ApiOperation({ summary: 'Get weekly report from materialized view' })
  async getWeeklyReportMV(@Request() req: any, @Query('weeks') weeks?: string) {
    const w = weeks ? parseInt(weeks) : 1;
    return this.planAnalysisService.getWeeklyStatsFromMV(req.user.id, Math.max(1, Math.min(w, 12)));
  }

  @Post('report/weekly/mv/refresh')
  @ApiOperation({ summary: 'Refresh weekly materialized view' })
  async refreshWeeklyReportMV() {
    await this.planAnalysisService.refreshWeeklyStatsMV();
    return { success: true };
  }

  // Manuel outbox tetikleyici (SRE/ops için)
  @Post('outbox/process')
  @ApiOperation({ summary: 'Process outbox events batch (manual trigger)' })
  async processOutbox() {
    const worker: any = (this as any).outboxWorker || (this.planPersistenceService as any)?.outboxWorker;
    if (worker?.processBatch) return worker.processBatch(200);
    return { processed: 0 };
  }

  // Raporlama: Ustalık haritası ve YKS eksik listesi
  @Get('report/mastery-map')
  @ApiOperation({ summary: 'Get mastery map and YKS gaps' })
  async getMasteryMap(@Request() req: any) {
    const ctx = await this.planAnalysisService.analyzeUserContext(req.user.id);
    const masteryMap = ctx.topicSuccessRates;
    const yksGaps = ctx.weakAreas.filter(k => /::|Matematik|Türkçe|Fizik|Kimya|Biyoloji|Tarih|Coğrafya/.test(k));
    return { masteryMap, yksGaps };
  }

  @Get('coaching')
  @ApiOperation({ summary: 'Get smart coaching recommendations' })
  async getSmartCoaching(@Request() req: any) {
    return this.planningService.getSmartCoaching(req.user.id);
  }

  // ===========================================
  // NEW MODULAR ENDPOINTS - FACADE PATTERN
  // ===========================================

  @Post('v2/generate-plan')
  @ApiOperation({ 
    summary: 'Generate plan using new modular architecture',
    description: 'Uses the new PlanningFacade service with improved validation and optimization'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Plan generated successfully',
    schema: {
      type: 'object',
      properties: {
        plan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            subjects: { type: 'array', items: { type: 'string' } },
            goals: { type: 'array', items: { type: 'string' } },
            totalSessions: { type: 'number' },
            duration: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        sessions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              subject: { type: 'string' },
              topic: { type: 'string' },
              duration: { type: 'number' },
              difficulty: { type: 'string' },
              type: { type: 'string' },
              startTime: { type: 'string', format: 'date-time' },
              objectives: { type: 'array', items: { type: 'string' } },
              resources: { type: 'array', items: { type: 'string' } },
              techniques: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        validation: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            errors: { type: 'array', items: { type: 'string' } },
            warnings: { type: 'array', items: { type: 'string' } },
            suggestions: { type: 'array', items: { type: 'string' } }
          }
        },
        optimization: {
          type: 'object',
          properties: {
            optimized: { type: 'boolean' },
            improvements: { type: 'array', items: { type: 'string' } },
            performanceGain: { type: 'number' },
            originalScore: { type: 'number' },
            optimizedScore: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generatePlanV2(@Request() req: any, @Body() planData: GeneratePlanDto) {
    const request = {
      userId: req.user.id,
      subjects: planData.subjects,
      goals: planData.goals,
      availableTime: planData.availableTime || 120,
      learningStyle: (planData as any).learningStyle || 'visual',
      currentLevel: planData.currentLevel || 'intermediate',
      preferences: planData.preferences || {},
      planDurationDays: planData.planDurationDays || 7,
      planType: planData.planType || 'weekly',
      targetExam: planData.targetExam,
      optimize: planData.optimize || false,
      optimizationOptions: {
        focusOnWeakAreas: true,
        balanceSubjects: true,
        optimizeTiming: true,
        adjustDifficulty: true,
        maximizeEfficiency: true,
      },
    };

    return this.planningFacade.generatePlan({
      ...request,
      subjects: request.subjects ?? [],
      goals: request.goals ?? [],
    });
  }

  @Get('v2/plans')
  @ApiOperation({ summary: 'Get user plans using new architecture' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User plans retrieved successfully' })
  async getUserPlansV2(
    @Request() req: any,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.planningFacade.getUserPlans(req.user.id, {
      includeInactive,
      limit,
      offset,
    });
  }

  @Get('v2/plans/:planId')
  @ApiOperation({ summary: 'Get specific plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.getPlan(req.user.id, planId);
  }

  @Put('v2/plans/:planId')
  @ApiOperation({ summary: 'Update plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlanV2(
    @Request() req: any,
    @Param('planId') planId: string,
    @Body() updateData: {
      title?: string;
      description?: string;
      subjects?: string[];
      goals?: string[];
      isActive?: boolean;
    },
  ) {
    return this.planningFacade.updatePlan(req.user.id, planId, updateData);
  }

  @Delete('v2/plans/:planId')
  @ApiOperation({ summary: 'Delete plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async deletePlanV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.deletePlan(req.user.id, planId);
  }

  @Post('v2/plans/:planId/optimize')
  @ApiOperation({ summary: 'Optimize plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan optimized successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async optimizePlanV2(
    @Request() req: any,
    @Param('planId') planId: string,
    @Body() options: {
      focusOnWeakAreas?: boolean;
      balanceSubjects?: boolean;
      optimizeTiming?: boolean;
      adjustDifficulty?: boolean;
      maximizeEfficiency?: boolean;
    } = {},
  ) {
    return this.planningFacade.optimizePlan(req.user.id, planId, options);
  }

  @Get('v2/plans/:planId/validate')
  @ApiOperation({ summary: 'Validate plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan validation completed' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async validatePlanV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.validatePlan(req.user.id, planId);
  }

  @Get('v2/plans/:planId/statistics')
  @ApiOperation({ summary: 'Get plan statistics using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan statistics retrieved' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanStatisticsV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.getPlanStatistics(req.user.id, planId);
  }

  @Post('v2/plans/:planId/duplicate')
  @ApiOperation({ summary: 'Duplicate plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 201, description: 'Plan duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async duplicatePlanV2(
    @Request() req: any,
    @Param('planId') planId: string,
    @Body() data: { newTitle?: string } = {},
  ) {
    return this.planningFacade.duplicatePlan(req.user.id, planId, data.newTitle);
  }

  @Post('v2/plans/:planId/archive')
  @ApiOperation({ summary: 'Archive plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan archived successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async archivePlanV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.archivePlan(req.user.id, planId);
  }

  @Post('v2/plans/:planId/activate')
  @ApiOperation({ summary: 'Activate plan using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan activated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async activatePlanV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.activatePlan(req.user.id, planId);
  }

  @Get('v2/plans/:planId/suggestions')
  @ApiOperation({ summary: 'Get plan suggestions using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan suggestions retrieved' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanSuggestionsV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.getPlanSuggestions(req.user.id, planId);
  }

  @Get('v2/plans/:planId/performance')
  @ApiOperation({ summary: 'Analyze plan performance using new architecture' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Plan performance analysis completed' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async analyzePlanPerformanceV2(@Request() req: any, @Param('planId') planId: string) {
    return this.planningFacade.analyzePlanPerformance(req.user.id, planId);
  }
}
