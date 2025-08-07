import { Controller, Post, Get, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyzeExamResultDto } from './dto/analyze-exam-result.dto';
import { AnalyzeLearningPathDto } from './dto/analyze-learning-path.dto';
import { AnalyzeStudyPatternDto } from './dto/analyze-study-pattern.dto';

@ApiTags('Analysis')
@Controller('analysis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('exam-result')
  @ApiOperation({ summary: 'Analyze exam results' })
  async analyzeExamResult(@Body() data: AnalyzeExamResultDto) {
    return this.analysisService.analyzeExamResult(data);
  }

  @Post('learning-path')
  @ApiOperation({ summary: 'Analyze learning path performance' })
  async analyzeLearningPath(@Body() data: AnalyzeLearningPathDto) {
    return this.analysisService.analyzeLearningPath(data);
  }

  @Get('performance-dashboard')
  @ApiOperation({ summary: 'Get performance dashboard' })
  async getPerformanceDashboard(@Request() req) {
    return this.analysisService.getPerformanceDashboard(req.user.id);
  }

  @Get('subject-analysis/:subject')
  @ApiOperation({ summary: 'Get subject-specific analysis' })
  async getSubjectAnalysis(@Request() req, @Param('subject') subject: string) {
    return this.analysisService.getSubjectAnalysis(req.user.id, subject);
  }

  @Get('weak-areas')
  @ApiOperation({ summary: 'Identify weak areas' })
  async getWeakAreas(@Request() req) {
    return this.analysisService.getWeakAreas(req.user.id);
  }

  @Get('strength-areas')
  @ApiOperation({ summary: 'Identify strength areas' })
  async getStrengthAreas(@Request() req) {
    return this.analysisService.getStrengthAreas(req.user.id);
  }

  @Post('study-pattern')
  @ApiOperation({ summary: 'Analyze study patterns' })
  async analyzeStudyPattern(@Body() data: AnalyzeStudyPatternDto) {
    return this.analysisService.analyzeStudyPattern(data);
  }

  @Get('progress-trends')
  @ApiOperation({ summary: 'Get progress trends' })
  async getProgressTrends(@Request() req) {
    return this.analysisService.getProgressTrends(req.user.id);
  }

  @Post('predictive-analysis')
  @ApiOperation({ summary: 'Predictive performance analysis' })
  async predictiveAnalysis(@Body() data: { 
    currentData: any; 
    targetDate: string;
  }) {
    return this.analysisService.predictiveAnalysis(data);
  }

  @Get('comparison-analysis')
  @ApiOperation({ summary: 'Compare performance with peers' })
  async getComparisonAnalysis(@Request() req) {
    return this.analysisService.getComparisonAnalysis(req.user.id);
  }

  @Post('goal-progress')
  @ApiOperation({ summary: 'Track goal progress' })
  async trackGoalProgress(@Body() data: { 
    goalId: string; 
    currentProgress: number;
  }) {
    return this.analysisService.trackGoalProgress(data);
  }

  @Get('learning-efficiency')
  @ApiOperation({ summary: 'Calculate learning efficiency' })
  async getLearningEfficiency(@Request() req) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.analysisService.getLearningEfficiency(userId);
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Get personalized recommendations' })
  async getRecommendations(@Body() data: { 
    analysisType: string; 
    preferences: any;
  }) {
    return this.analysisService.getRecommendations(data);
  }

  @Get('weekly-report')
  @ApiOperation({ summary: 'Generate weekly report' })
  async generateWeeklyReport(@Request() req) {
    return this.analysisService.generateWeeklyReport(req.user.id);
  }

  @Get('monthly-report')
  @ApiOperation({ summary: 'Generate monthly report' })
  async generateMonthlyReport(@Request() req) {
    return this.analysisService.generateMonthlyReport(req.user.id);
  }

  @Post('custom-analysis')
  @ApiOperation({ summary: 'Custom analysis request' })
  async customAnalysis(@Body() data: { 
    analysisType: string; 
    parameters: any;
  }) {
    return this.analysisService.customAnalysis(data);
  }
}
