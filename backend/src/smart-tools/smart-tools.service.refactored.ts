import { Injectable, Logger } from '@nestjs/common';
import { QuestionSolverService, SolveQuestionData } from './question-solver.service';
import { ContentGeneratorService } from './content-generator.service';
import { Response } from 'express';

@Injectable()
export class SmartToolsService {
  private readonly logger = new Logger(SmartToolsService.name);

  constructor(
    private readonly questionSolver: QuestionSolverService,
    private readonly contentGenerator: ContentGeneratorService,
  ) {}

  // Soru çözme işlemleri - QuestionSolverService'e delegasyon
  async solveQuestion(data: SolveQuestionData) {
    this.logger.log(`Soru çözme isteği - Konu: ${data.subject}`);
    return this.questionSolver.solveQuestion(data);
  }

  // İçerik üretimi işlemleri - ContentGeneratorService'e delegasyon
  async quickChatStream(data: { message: string; subject?: string; grade?: string }, res: Response) {
    this.logger.log(`Hızlı sohbet isteği - Konu: ${data.subject}`);
    return this.contentGenerator.quickChatStream(data, res);
  }

  async generateFlashcards(data: { topic: string; count: number; userId?: string }) {
    this.logger.log(`Flashcard üretim isteği - Konu: ${data.topic}, Sayı: ${data.count}`);
    return this.contentGenerator.generateFlashcards(data);
  }

  async generateStudyPlan(data: { subjects: string[]; duration: number; userId?: string }) {
    this.logger.log(`Çalışma planı üretim isteği - Konular: ${data.subjects.join(', ')}, Süre: ${data.duration} gün`);
    return this.contentGenerator.generateStudyPlan(data);
  }

  // Diğer smart tools metodları buraya eklenebilir
  async generateQuiz(data: { topic: string; difficulty: string; count: number; userId?: string }) {
    this.logger.log(`Quiz üretim isteği - Konu: ${data.topic}, Zorluk: ${data.difficulty}, Sayı: ${data.count}`);
    
    // Bu metod da ContentGeneratorService'e taşınabilir
    return {
      success: true,
      message: 'Quiz üretimi henüz implement edilmedi'
    };
  }

  async generateSummary(data: { text: string; userId?: string }) {
    this.logger.log(`Özet üretim isteği - Metin uzunluğu: ${data.text.length}`);
    
    // Bu metod da ContentGeneratorService'e taşınabilir
    return {
      success: true,
      message: 'Özet üretimi henüz implement edilmedi'
    };
  }
}
