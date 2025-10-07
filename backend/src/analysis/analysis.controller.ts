import { Controller, Post, Get, Body, UseGuards, Request, Param } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
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
  async analyzeExamResult(@Request() req: ExpressRequest & { user: { id: string } }, @Body() data: AnalyzeExamResultDto) {
    return this.analysisService.analyzeExamResult({ ...data, userId: req.user.id } as any);
  }

  @Post('learning-path')
  @ApiOperation({ summary: 'Analyze learning path performance' })
  async analyzeLearningPath(@Request() req: ExpressRequest & { user: { id: string } }, @Body() data: AnalyzeLearningPathDto) {
    return this.analysisService.analyzeLearningPath({ ...data, userId: req.user.id } as any);
  }

  @Get('performance-dashboard')
  @ApiOperation({ summary: 'Get performance dashboard' })
  async getPerformanceDashboard(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.analysisService.getPerformanceDashboard(req.user.id);
  }

  @Get('subject-analysis/:subject')
  @ApiOperation({ summary: 'Get subject-specific analysis' })
  async getSubjectAnalysis(@Request() req: ExpressRequest & { user: { id: string } }, @Param('subject') subject: string) {
    return this.analysisService.getSubjectAnalysis(req.user.id, subject);
  }

  @Get('weak-areas')
  @ApiOperation({ summary: 'Identify weak areas' })
  async getWeakAreas(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.analysisService.getWeakAreas(req.user.id);
  }

  @Get('strength-areas')
  @ApiOperation({ summary: 'Identify strength areas' })
  async getStrengthAreas(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.analysisService.getStrengthAreas(req.user.id);
  }

  @Post('study-pattern')
  @ApiOperation({ summary: 'Analyze study patterns' })
  async analyzeStudyPattern(@Request() req: ExpressRequest & { user: { id: string } }, @Body() data: AnalyzeStudyPatternDto) {
    return this.analysisService.analyzeStudyPattern({ ...data, userId: req.user.id } as any);
  }

  @Get('progress-trends')
  @ApiOperation({ summary: 'Get progress trends' })
  async getProgressTrends(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.analysisService.getProgressTrends(req.user.id);
  }

  @Post('predictive-analysis')
  @ApiOperation({ summary: 'Predictive performance analysis' })
  async predictiveAnalysis(@Body() data: { 
    currentData: Record<string, unknown>; 
    targetDate: string;
  }) {
    return this.analysisService.predictiveAnalysis(data);
  }

  @Get('comparison-analysis')
  @ApiOperation({ summary: 'Compare performance with peers' })
  async getComparisonAnalysis(@Request() req: ExpressRequest & { user: { id: string } }) {
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
  async getLearningEfficiency(@Request() req: ExpressRequest & { user: { id: string } }) {
    const userId = req.user.id;
    return this.analysisService.getLearningEfficiency(userId);
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Get personalized recommendations' })
  async getRecommendations(@Body() data: { 
    analysisType: string; 
    preferences: Record<string, unknown>;
  }) {
    return this.analysisService.getRecommendations(data);
  }

  @Get('weekly-report')
  @ApiOperation({ summary: 'Generate weekly report' })
  async generateWeeklyReport(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.analysisService.generateWeeklyReport(req.user.id);
  }

  @Get('monthly-report')
  @ApiOperation({ summary: 'Generate monthly report' })
  async generateMonthlyReport(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.analysisService.generateMonthlyReport(req.user.id);
  }

  @Post('custom-analysis')
  @ApiOperation({ summary: 'Custom analysis request' })
  async customAnalysis(@Body() data: { 
    analysisType: string; 
    parameters: Record<string, unknown>;
  }) {
    return this.analysisService.customAnalysis(data);
  }

  @Get('user-analysis')
  @ApiOperation({ summary: 'Get user analysis' })
  async getUserAnalysis(@Request() req: ExpressRequest & { user: { id: string } }) {
    return this.analysisService.getUserAnalysis(req.user.id);
  }

  @Post('update-analysis/:analysisId')
  @ApiOperation({ summary: 'Update analysis' })
  async updateAnalysis(@Param('analysisId') analysisId: string, @Body() updateData: any) {
    return this.analysisService.updateAnalysis(analysisId, updateData);
  }

  @Post('delete-analysis/:analysisId')
  @ApiOperation({ summary: 'Delete analysis' })
  async deleteAnalysis(@Param('analysisId') analysisId: string) {
    return this.analysisService.deleteAnalysis(analysisId);
  }
}
