import { Controller, Post, Get, Body, UseGuards, Request, Param, Res, UseInterceptors, UploadedFile, Delete, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { SmartToolsService } from './smart-tools.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { SosQuestionDto } from './dto/sos-question.dto';
import { QuickChatDto } from './dto/quick-chat.dto';
import { SummaryGeneratorDto } from './dto/summary-generator.dto';

@ApiTags('Smart Tools')
@Controller('smart-tools')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SmartToolsController {
  private readonly logger = new Logger(SmartToolsController.name);
  constructor(private readonly smartToolsService: SmartToolsService) {}

  @Throttle({ short: { limit: 2, ttl: 60000 } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @Post('quick-chat-stream')
  @ApiOperation({ summary: 'Quick Chat Stream - Hızlı sohbet akışı' })
  async quickChatStream(
    @Body() data: QuickChatDto,
    @Res() res: Response
  ) {
    this.logger.warn(`quick-chat-stream invoked by user=${(data as any)?.userId || 'unknown'}`);
    return this.smartToolsService.quickChatStream(data, res);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @Post('sos-question-solver')
  @ApiOperation({ summary: 'SOS Question Solver - Acil soru çözümü' })
  async solveQuestion(@Body() data: SosQuestionDto) {
    return this.smartToolsService.solveQuestion(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @Post('summary-generator')
  @ApiOperation({ summary: 'Summary Generator - Özet oluşturucu' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('sourceFile'))
  async generateSummary(
    @Body() data: any,
    @UploadedFile() file?: any,
    @Req() req?: any
  ) {
    // Debug log ekle
    console.log('🔍 Received data:', JSON.stringify(data, null, 2));
    console.log('🔍 Received file:', file ? file.originalname : 'No file');
    
    // FormData'dan gelen verileri işle
    const processedData = {
      message: data.sourceText || data.content || '',
      context: data.format || data.type || 'paragraph',
      userId: req?.user?.id || 'anonymous'
    };
    
    console.log('🔍 Processed data:', JSON.stringify(processedData, null, 2));
    
    return this.smartToolsService.generateSummary(processedData);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('flashcards-generator')
  @ApiOperation({ summary: 'Flashcards Generator - Kart oluşturucu' })
  async generateFlashcards(@Body() data: { topic: string; count: number; cardCount?: number }) {
    return this.smartToolsService.generateFlashcards(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('concept-map')
  @ApiOperation({ summary: 'Concept Map Generator - Kavram haritası oluşturucu' })
  async generateConceptMap(@Body() data: { grade: string; subject: string; topic: string }) {
    return this.smartToolsService.generateConceptMap(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('feynman-cycle')
  @ApiOperation({ summary: 'Feynman Cycle - Feynman öğrenme döngüsü' })
  async feynmanCycle(@Body() data: { topic: string; explanation: string }) {
    return this.smartToolsService.feynmanCycle(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('socratic-evaluation')
  @ApiOperation({ summary: 'Socratic Evaluation - Sokratik değerlendirme' })
  async socraticEvaluation(@Body() data: { answer: string; question: string }) {
    return this.smartToolsService.socraticEvaluation(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('live-quiz')
  @ApiOperation({ summary: 'Live Quiz Generator - Canlı quiz oluşturucu' })
  async generateLiveQuiz(@Body() data: { topic: string; difficulty: string; count?: number; questionCount?: number; subject?: string; grade?: string }) {
    return this.smartToolsService.generateLiveQuiz(data as any);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('exam-simulator')
  @ApiOperation({ summary: 'Exam Simulator - Sınav simülatörü' })
  async examSimulator(@Body() data: { subject: string; grade: number; duration: number }) {
    return this.smartToolsService.examSimulator(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('learning-path')
  @ApiOperation({ summary: 'Learning Path Generator - Öğrenme yolu oluşturucu' })
  async generateLearningPath(@Body() data: { topic: string; level: string; goals: string[]; subject?: string; grade?: string }) {
    return this.smartToolsService.generateLearningPath(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('topic-connection')
  @ApiOperation({ summary: 'Topic Connection - Konu bağlantıları' })
  async findTopicConnections(@Body() data: { topic: string; subjects: string[] }) {
    return this.smartToolsService.findTopicConnections(data);
  }

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('mental-support')
  @ApiOperation({ summary: 'Mental Support - Zihinsel destek' })
  async mentalSupport(@Body() data: { issue: string; context: string }) {
    return this.smartToolsService.mentalSupport(data);
  }

  @Get('tools-list')
  @ApiOperation({ summary: 'Get all available smart tools' })
  async getToolsList() {
    return this.smartToolsService.getToolsList();
  }

  // Eksik method'ları ekleyelim
  @Get('chat-history/:userId')
  @ApiOperation({ summary: 'Get user chat history' })
  async getUserChatHistory(@Param('userId') userId: string) {
    return this.smartToolsService.getUserChatHistory(userId);
  }

  @Get('sos-history/:userId')
  @ApiOperation({ summary: 'Get user SOS history' })
  async getUserSOSHistory(@Param('userId') userId: string) {
    return this.smartToolsService.getUserSOSHistory(userId);
  }

  @Get('summaries/:userId')
  @ApiOperation({ summary: 'Get user summaries' })
  async getUserSummaries(@Param('userId') userId: string) {
    return this.smartToolsService.getUserSummaries(userId);
  }

  @Post('quick-chat')
  @ApiOperation({ summary: 'Quick chat without streaming' })
  async quickChat(@Param('userId') userId: string, @Body() data: { message: string; context?: string }) {
    return this.smartToolsService.generateSummary({ ...data, userId });
  }

  @Post('sos-question')
  @ApiOperation({ summary: 'SOS question without streaming' })
  async sosQuestion(@Param('userId') userId: string, @Body() data: SosQuestionDto) {
    return this.smartToolsService.generateSummary({ ...data, userId });
  }

  @Delete('chat/:chatId')
  @ApiOperation({ summary: 'Delete chat' })
  async deleteChat(@Param('chatId') chatId: string) {
    return this.smartToolsService.deleteChat(chatId);
  }

  @Delete('sos/:sosId')
  @ApiOperation({ summary: 'Delete SOS question' })
  async deleteSOS(@Param('sosId') sosId: string) {
    return this.smartToolsService.deleteSOS(sosId);
  }

  @Delete('summary/:summaryId')
  @ApiOperation({ summary: 'Delete summary' })
  async deleteSummary(@Param('summaryId') summaryId: string) {
    return this.smartToolsService.deleteSummary(summaryId);
  }
} 