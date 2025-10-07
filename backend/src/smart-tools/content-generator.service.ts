import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../services/openai.service';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ContentGeneratorService {
  private readonly logger = new Logger(ContentGeneratorService.name);

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly prisma: PrismaService,
  ) {}

  async quickChatStream(data: { message: string; subject?: string; grade?: string }, res: any) {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    try {
      // Send initial status
      res.write(`data: ${JSON.stringify({ type: 'STATUS', content: 'AI düşünüyor...' })}\n\n`);

      const prompt = this.buildChatPrompt(data);
      
      // OpenAI streaming response
      const stream = await this.openaiService.generateContentStream(prompt);
      
      for await (const chunk of stream) {
        if (chunk && chunk.trim()) {
          res.write(`data: ${JSON.stringify({ type: 'CONTENT', content: chunk })}\n\n`);
        }
      }

      // Send completion signal
      res.write(`data: ${JSON.stringify({ type: 'COMPLETE', content: 'Tamamlandı' })}\n\n`);
      res.end();
    } catch (error) {
      this.logger.error('Quick chat stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'ERROR', content: 'Bir hata oluştu' })}\n\n`);
      res.end();
    }
  }

  async generateFlashcards(data: { topic: string; count: number; userId?: string }) {
    try {
      this.logger.log(`Flashcard üretimi - Konu: ${data.topic}, Sayı: ${data.count}`);

      const prompt = this.buildFlashcardPrompt(data);
      const response = await this.openaiService.generateContent(prompt);
      
      const flashcards = this.parseFlashcardResponse(response);
      
      if (data.userId) {
        await this.recordUsage(data.userId, 'generate-flashcards');
      }

      return {
        success: true,
        flashcards: flashcards
      };
    } catch (error: any) {
      this.logger.error(`Flashcard üretim hatası: ${error.message}`, error.stack);
      throw new Error(`Flashcard üretimi başarısız: ${error.message}`);
    }
  }

  async generateStudyPlan(data: { subjects: string[]; duration: number; userId?: string }) {
    try {
      this.logger.log(`Çalışma planı üretimi - Konular: ${data.subjects.join(', ')}, Süre: ${data.duration} gün`);

      const prompt = this.buildStudyPlanPrompt(data);
      const response = await this.openaiService.generateContent(prompt);
      
      const studyPlan = this.parseStudyPlanResponse(response);
      
      if (data.userId) {
        await this.recordUsage(data.userId, 'generate-study-plan');
      }

      return {
        success: true,
        studyPlan: studyPlan
      };
    } catch (error: any) {
      this.logger.error(`Çalışma planı üretim hatası: ${error.message}`, error.stack);
      throw new Error(`Çalışma planı üretimi başarısız: ${error.message}`);
    }
  }

  private buildChatPrompt(data: { message: string; subject?: string; grade?: string }): string {
    return `
    Sen bir ${data.grade || '12'}. sınıf öğrencisinin ${data.subject || 'genel'} dersinde yardımcı olan bir AI asistanısın.
    
    Öğrencinin mesajı: ${data.message}
    
    Lütfen:
    1. Öğrenci dostu bir dil kullan
    2. Adım adım açıkla
    3. Örnekler ver
    4. Motivasyonel ol
    5. Kısa ve öz yanıt ver
    `;
  }

  private buildFlashcardPrompt(data: { topic: string; count: number }): string {
    return `
    ${data.topic} konusu için ${data.count} adet flashcard oluştur.
    
    Her flashcard için:
    - Ön yüz: Soru veya kavram
    - Arka yüz: Cevap veya açıklama
    
    JSON formatında döndür:
    {
      "flashcards": [
        {
          "front": "Soru",
          "back": "Cevap"
        }
      ]
    }
    `;
  }

  private buildStudyPlanPrompt(data: { subjects: string[]; duration: number }): string {
    return `
    ${data.subjects.join(', ')} konuları için ${data.duration} günlük çalışma planı oluştur.
    
    Plan şunları içermeli:
    - Günlük çalışma saatleri
    - Konu dağılımı
    - Tekrar programı
    - Test tarihleri
    
    JSON formatında döndür:
    {
      "plan": {
        "dailyHours": 3,
        "schedule": [
          {
            "day": 1,
            "subjects": ["Matematik", "Fizik"],
            "hours": 3
          }
        ]
      }
    }
    `;
  }

  private parseFlashcardResponse(response: string): any[] {
    try {
      const parsed = JSON.parse(response);
      return parsed.flashcards || [];
    } catch {
      this.logger.warn('Flashcard yanıtı parse edilemedi, fallback kullanılıyor');
      return [];
    }
  }

  private parseStudyPlanResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      this.logger.warn('Çalışma planı yanıtı parse edilemedi, fallback kullanılıyor');
      return { plan: { dailyHours: 3, schedule: [] } };
    }
  }

  private async recordUsage(userId: string, toolName: string) {
    try {
      await this.prisma.toolUsage.create({
        data: {
          userId: userId,
          toolName: toolName,
        },
      });
      this.logger.log(`ToolUsage kaydı oluşturuldu - UserId: ${userId}`);
    } catch (toolUsageError) {
      this.logger.error(`ToolUsage kaydı oluşturulurken hata: ${toolUsageError}`);
    }
  }
}
