import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { OpenAIService } from '../services/openai.service';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SolveQuestionData {
  questionText?: string;
  subject: string;
  grade?: number;
  imageBase64?: string;
  userId?: string;
}

@Injectable()
export class QuestionSolverService {
  private readonly logger = new Logger(QuestionSolverService.name);

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly prisma: PrismaService,
  ) {}

  async solveQuestion(data: SolveQuestionData) {
    try {
      this.logger.log(`Gelen data: ${JSON.stringify(data)}`);
      
      // userId kontrolü
      if (!data.userId) {
        this.logger.warn('userId parametresi eksik, anonim kullanım olarak işaretleniyor');
        return await this.processQuestionWithoutUser(data);
      }

      this.logger.log(`userId bulundu: ${data.userId}`);

      // Kullanıcının varlığını kontrol et
      this.logger.log(`Kullanıcı aranıyor: ${data.userId}`);
      let user;
      try {
        user = await (this.prisma as any).user.findUnique({
          where: { id: data.userId },
          select: { id: true, email: true }
        });

        if (!user) {
          this.logger.warn(`Kullanıcı bulunamadı: ${data.userId}`);
          this.logger.warn('Anonim kullanım olarak işaretleniyor');
          return await this.processQuestionWithoutUser(data);
        }

        this.logger.log(`Kullanıcı bulundu: ${user.email} (ID: ${user.id})`);
      } catch (userLookupError) {
        this.logger.error(`Kullanıcı arama hatası: ${userLookupError}`);
        this.logger.warn('Anonim kullanım olarak işaretleniyor');
        return await this.processQuestionWithoutUser(data);
      }

      this.logger.log(`Soru çözme isteği - Kullanıcı: ${user.email}, Konu: ${data.subject}`);

      const questionContent = this.prepareQuestionContent(data);
      const response = await this.processWithAI(questionContent, data, user);
      await this.recordUsage(user.id, 'solve-question');

      this.logger.log(`Soru çözme tamamlandı - Kullanıcı: ${user.email}, Konu: ${data.subject}`);

      return {
        success: true,
        learningPath: response
      };
    } catch (error: any) {
      this.logger.error(`SOS Question Solver hatası: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new Error(`Soru çözme işlemi başarısız: ${error.message}`);
    }
  }

  private prepareQuestionContent(data: SolveQuestionData): string {
    if (data.imageBase64) {
      return `Resimdeki soru: [Resim analizi]`;
    } else if (data.questionText) {
      return data.questionText;
    } else {
      throw new Error('Soru metni veya resim sağlanmalı');
    }
  }

  private async processWithAI(questionContent: string, data: SolveQuestionData, user: any) {
    const grade = data.grade || 12;
    
    const prompt = `
    Sen bir ${grade}. sınıf ${data.subject} öğretmenisin. 
    Öğrencinin sorusu: ${questionContent}
    
    Lütfen şu formatta yanıt ver:
    {
      "answer": "Sorunun doğru cevabı",
      "explanation": "Adım adım açıklama",
      "tips": ["İpucu 1", "İpucu 2"],
      "similarQuestions": ["Benzer soru 1", "Benzer soru 2"],
      "nextSteps": ["Sonraki adımlar"]
    }
    `;

    const aiResponse = await this.openaiService.generateContent(prompt);
    
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      this.logger.warn('AI yanıtı JSON olarak parse edilemedi, fallback kullanılıyor');
      return {
        answer: "Sorunuz çözüldü",
        explanation: aiResponse,
        tips: ["Benzer sorular çözün", "Formülleri tekrar edin"],
        similarQuestions: ["Benzer sorular çözün"],
        nextSteps: ["Formülleri tekrar edin"]
      };
    }
  }

  private async processQuestionWithoutUser(data: SolveQuestionData) {
    this.logger.log(`Anonim soru çözme isteği - Konu: ${data.subject}`);
    
    const questionContent = this.prepareQuestionContent(data);
    const response = await this.processWithAI(questionContent, data, null);
    
    return {
      success: true,
      learningPath: response
    };
  }

  private async recordUsage(userId: string, toolName: string) {
    try {
      await (this.prisma as any).toolUsage.create({
        data: {
          userId: userId,
          toolName: toolName,
        },
      });
      this.logger.log(`ToolUsage kaydı oluşturuldu - UserId: ${userId}`);
    } catch (toolUsageError) {
      this.logger.error(`ToolUsage kaydı oluşturulurken hata: ${toolUsageError}`);
      // ToolUsage hatası kritik değil, işleme devam et
    }
  }
}
