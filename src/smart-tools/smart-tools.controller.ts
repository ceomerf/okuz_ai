import { Controller, Post, Get, Body, UseGuards, Request, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SmartToolsService } from './smart-tools.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('Smart Tools')
@Controller('smart-tools')
// @UseGuards(JwtAuthGuard)  // Geçici olarak kaldırıldı
@ApiBearerAuth()
export class SmartToolsController {
  constructor(private readonly smartToolsService: SmartToolsService) {}

  @Post('quick-chat-stream')
  @ApiOperation({ summary: 'Quick Chat Stream - Hızlı sohbet akışı' })
  async quickChatStream(
    @Body() data: { message: string; subject?: string; grade?: string },
    @Res() res: Response
  ) {
    return this.smartToolsService.quickChatStream(data, res);
  }

  @Post('sos-question-solver')
  @ApiOperation({ summary: 'SOS Question Solver - Acil soru çözümü' })
  async solveQuestion(@Body() data: { question: string; subject: string; grade: number }) {
    return this.smartToolsService.solveQuestion(data);
  }

  @Post('summary-generator')
  @ApiOperation({ summary: 'Summary Generator - Özet oluşturucu' })
  async generateSummary(@Body() data: { content: string; type: string }) {
    return this.smartToolsService.generateSummary(data);
  }

  @Post('flashcards-generator')
  @ApiOperation({ summary: 'Flashcards Generator - Kart oluşturucu' })
  async generateFlashcards(@Body() data: { topic: string; count: number }) {
    return this.smartToolsService.generateFlashcards(data);
  }

  @Post('concept-map')
  @ApiOperation({ summary: 'Concept Map Generator - Kavram haritası oluşturucu' })
  async generateConceptMap(@Body() data: { topic: string; connections: string[] }) {
    return this.smartToolsService.generateConceptMap(data);
  }

  @Post('feynman-cycle')
  @ApiOperation({ summary: 'Feynman Cycle - Feynman öğrenme döngüsü' })
  async feynmanCycle(@Body() data: { topic: string; explanation: string }) {
    return this.smartToolsService.feynmanCycle(data);
  }

  @Post('socratic-evaluation')
  @ApiOperation({ summary: 'Socratic Evaluation - Sokratik değerlendirme' })
  async socraticEvaluation(@Body() data: { answer: string; question: string }) {
    return this.smartToolsService.socraticEvaluation(data);
  }

  @Post('live-quiz')
  @ApiOperation({ summary: 'Live Quiz Generator - Canlı quiz oluşturucu' })
  async generateLiveQuiz(@Body() data: { topic: string; difficulty: string; count: number }) {
    return this.smartToolsService.generateLiveQuiz(data);
  }

  @Post('exam-simulator')
  @ApiOperation({ summary: 'Exam Simulator - Sınav simülatörü' })
  async examSimulator(@Body() data: { subject: string; grade: number; duration: number }) {
    return this.smartToolsService.examSimulator(data);
  }

  @Post('learning-path')
  @ApiOperation({ summary: 'Learning Path Generator - Öğrenme yolu oluşturucu' })
  async generateLearningPath(@Body() data: { topic: string; level: string; goals: string[]; subject?: string; grade?: string }) {
    return this.smartToolsService.generateLearningPath(data);
  }

  @Post('topic-connection')
  @ApiOperation({ summary: 'Topic Connection - Konu bağlantıları' })
  async findTopicConnections(@Body() data: { topic: string; subjects: string[] }) {
    return this.smartToolsService.findTopicConnections(data);
  }

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
} 