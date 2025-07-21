import { Controller, Post, Get, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Analysis')
@Controller('analysis')
// @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
@ApiBearerAuth()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('exam-result')
  @ApiOperation({ summary: 'Analyze exam results' })
  async analyzeExamResult(@Body() data: { 
    examData: any; 
    subject: string; 
    grade: number;
    performance: number;
  }) {
    return this.analysisService.analyzeExamResult(data);
  }

  @Post('learning-path')
  @ApiOperation({ summary: 'Analyze learning path performance' })
  async analyzeLearningPath(@Body() data: { 
    pathId: string; 
    progress: any[]; 
    performance: any;
  }) {
    return this.analysisService.analyzeLearningPath(data);
  }

  @Get('performance-dashboard')
  @ApiOperation({ summary: 'Get performance dashboard' })
  async getPerformanceDashboard(@Request() req) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.analysisService.getPerformanceDashboard(userId);
  }

  @Get('subject-analysis/:subject')
  @ApiOperation({ summary: 'Get subject-specific analysis' })
  async getSubjectAnalysis(@Request() req, @Param('subject') subject: string) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.analysisService.getSubjectAnalysis(userId, subject);
  }

  @Get('weak-areas')
  @ApiOperation({ summary: 'Identify weak areas' })
  async getWeakAreas(@Request() req) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.analysisService.getWeakAreas(userId);
  }

  @Get('strength-areas')
  @ApiOperation({ summary: 'Identify strength areas' })
  async getStrengthAreas(@Request() req) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.analysisService.getStrengthAreas(userId);
  }

  @Post('study-pattern')
  @ApiOperation({ summary: 'Analyze study patterns' })
  async analyzeStudyPattern(@Body() data: { 
    studySessions: any[]; 
    timeRange: string;
  }) {
    return this.analysisService.analyzeStudyPattern(data);
  }

  @Get('progress-trends')
  @ApiOperation({ summary: 'Get progress trends' })
  async getProgressTrends(@Request() req) {
    const userId = req.user?.id || 'user-1753052679951';
    return this.analysisService.getProgressTrends(userId);
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
    const userId = req.user?.id || 'user-1753052679951';
    return this.analysisService.getComparisonAnalysis(userId);
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
