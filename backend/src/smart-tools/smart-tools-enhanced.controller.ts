import { Controller, Post, Get, Body, UseGuards, Request, Param, Res, UseInterceptors, UploadedFile, Delete, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagsGuard } from '../common/feature-flags/feature-flags.guard';
import { RequireFeatureFlag } from '../common/feature-flags/feature-flags.decorator';
import { TrackEvent } from '../common/analytics/analytics.decorator';
import { AnalyticsService } from '../common/analytics/analytics.service';
import { SmartToolsService } from './smart-tools.service';
import { QuickChatDto } from './dto/quick-chat.dto';
import { SosQuestionDto } from './dto/sos-question.dto';
import { SummaryGeneratorDto } from './dto/summary-generator.dto';
import { AnalyzeExamResultDto } from '../analysis/dto/analyze-exam-result.dto';

@ApiTags('Smart Tools Enhanced')
@Controller('smart-tools')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SmartToolsEnhancedController {
  private readonly logger = new Logger(SmartToolsEnhancedController.name);

  constructor(
    private readonly smartToolsService: SmartToolsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Throttle({ short: { limit: 2, ttl: 60000 } })
  @Post('quick-chat-stream')
  @RequireFeatureFlag('ai_coaching', { fallback: true })
  @TrackEvent('smart_tool_used', { tool: 'quick_chat' })
  @ApiOperation({ summary: 'Quick Chat Stream - Enhanced with AI Coaching' })
  @ApiResponse({ status: 201, description: 'Stream started' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async quickChatStream(
    @Body() data: QuickChatDto,
    @Res() res: Response,
    @Request() req: any
  ) {
    this.logger.warn(`QuickChatStream throttled for user ${req.user?.id} or IP ${req.ip}`);
    
    // Track analytics
    await this.analyticsService.trackSmartToolUsage(req.user.id, {
      tool: 'quick_chat',
      subject: data.subject,
      grade: data.grade,
      success: true,
    });

    return this.smartToolsService.quickChatStream(data, res);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('sos-question-solver')
  @RequireFeatureFlag('sos_question_solver', { fallback: true })
  @TrackEvent('smart_tool_used', { tool: 'sos_question_solver' })
  @ApiOperation({ summary: 'SOS Question Solver - Enhanced with better AI' })
  @ApiResponse({ status: 201, description: 'Question solved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async solveQuestion(@Body() data: SosQuestionDto, @Request() req: any) {
    // Track analytics
    await this.analyticsService.trackSmartToolUsage(req.user.id, {
      tool: 'sos_question_solver',
      subject: data.subject,
      grade: data.grade,
      success: true,
    });

    return this.smartToolsService.solveQuestion(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('summary-generator')
  @RequireFeatureFlag('summary_generator', { fallback: true })
  @TrackEvent('smart_tool_used', { tool: 'summary_generator' })
  @ApiOperation({ summary: 'Summary Generator - Enhanced with better formatting' })
  @ApiResponse({ status: 201, description: 'Summary generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async generateSummary(@Body() data: SummaryGeneratorDto, @Request() req: any) {
    // Track analytics
    await this.analyticsService.trackSmartToolUsage(req.user.id, {
      tool: 'summary_generator',
      success: true,
    });

    return this.smartToolsService.generateSummary(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('flashcard-generator')
  @RequireFeatureFlag('flashcard_generator', { fallback: true })
  @TrackEvent('smart_tool_used', { tool: 'flashcard_generator' })
  @ApiOperation({ summary: 'Flashcard Generator - Enhanced with spaced repetition' })
  @ApiResponse({ status: 201, description: 'Flashcards generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async generateFlashcards(@Body() data: any, @Request() req: any) {
    // Track analytics
    await this.analyticsService.trackSmartToolUsage(req.user.id, {
      tool: 'flashcard_generator',
      success: true,
    });

    return this.smartToolsService.generateFlashcards(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('study-plan-generator')
  @RequireFeatureFlag('study_plan_generator', { fallback: true })
  @TrackEvent('smart_tool_used', { tool: 'study_plan_generator' })
  @ApiOperation({ summary: 'Study Plan Generator - Enhanced with AI optimization' })
  @ApiResponse({ status: 201, description: 'Study plan generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async generateStudyPlan(@Body() data: any, @Request() req: any) {
    // Track analytics
    await this.analyticsService.trackSmartToolUsage(req.user.id, {
      tool: 'study_plan_generator',
      success: true,
    });

    return this.smartToolsService.generateStudyPlan(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('quiz-generator')
  @RequireFeatureFlag('quiz_generator', { fallback: true })
  @TrackEvent('smart_tool_used', { tool: 'quiz_generator' })
  @ApiOperation({ summary: 'Quiz Generator - Enhanced with adaptive difficulty' })
  @ApiResponse({ status: 201, description: 'Quiz generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async generateQuiz(@Body() data: any, @Request() req: any) {
    // Track analytics
    await this.analyticsService.trackSmartToolUsage(req.user.id, {
      tool: 'quiz_generator',
      success: true,
    });

    return this.smartToolsService.generateQuiz(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('exam-analyzer')
  @RequireFeatureFlag('exam_analyzer', { fallback: true })
  @TrackEvent('smart_tool_used', { tool: 'exam_analyzer' })
  @ApiOperation({ summary: 'Exam Analyzer - Enhanced with detailed insights' })
  @ApiResponse({ status: 201, description: 'Exam analyzed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async analyzeExam(@Body() data: AnalyzeExamResultDto, @Request() req: any) {
    // Track analytics
    await this.analyticsService.trackSmartToolUsage(req.user.id, {
      tool: 'exam_analyzer',
      success: true,
    });

    return this.smartToolsService.analyzeExam(data);
  }

  @Get('usage-stats')
  @ApiOperation({ summary: 'Get user\'s smart tool usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsageStats(@Request() req: any) {
    // This would typically query analytics data
    // For now, return mock data
    return {
      userId: req.user.id,
      totalUsage: 45,
      toolsUsed: [
        { tool: 'quick_chat', count: 20, lastUsed: new Date() },
        { tool: 'sos_question_solver', count: 15, lastUsed: new Date() },
        { tool: 'summary_generator', count: 10, lastUsed: new Date() },
      ],
      favoriteTool: 'quick_chat',
      usageTrend: 'increasing',
    };
  }

  @Get('feature-status')
  @ApiOperation({ summary: 'Get feature flag status for smart tools' })
  @ApiResponse({ status: 200, description: 'Feature flag status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFeatureStatus(@Request() req: any) {
    // This would check feature flags for the user
    // For now, return mock data
    return {
      userId: req.user.id,
      features: {
        ai_coaching: true,
        sos_question_solver: true,
        summary_generator: false,
        flashcard_generator: true,
        study_plan_generator: false,
        quiz_generator: true,
        exam_analyzer: true,
      },
      lastChecked: new Date(),
    };
  }
}
