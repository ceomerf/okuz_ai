import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || 'your-gemini-api-key';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      return 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
    }
  }

  async generateStructuredContent(prompt: string, schema?: any): Promise<any> {
    try {
      const structuredPrompt = schema 
        ? `${prompt}\n\nLütfen yanıtı şu JSON formatında ver: ${JSON.stringify(schema)}`
        : prompt;
      
      const content = await this.generateContent(structuredPrompt);
      
      // JSON parse'ı dene
      try {
        return JSON.parse(content);
      } catch {
        return { content, structured: false };
      }
    } catch (error) {
      console.error('Structured Content Error:', error);
      return { error: 'Yapılandırılmış içerik oluşturulamadı' };
    }
  }

  async generateEducationalContent(topic: string, level: string, type: string): Promise<any> {
    const prompt = `
    ${topic} konusu hakkında ${level} seviyesinde ${type} türünde eğitim içeriği oluştur.
    
    İçerik şunları içermeli:
    1. Konunun açıklaması
    2. Önemli kavramlar
    3. Örnekler
    4. Pratik alıştırmalar
    5. Değerlendirme soruları
    
    JSON formatında yapılandırılmış bir yanıt ver.
    `;

    return this.generateStructuredContent(prompt);
  }

  async analyzeStudentResponse(question: string, studentAnswer: string, correctAnswer: string): Promise<any> {
    const prompt = `
    Bir öğrencinin cevabını analiz et:
    
    Soru: ${question}
    Öğrenci Cevabı: ${studentAnswer}
    Doğru Cevap: ${correctAnswer}
    
    Analiz et:
    1. Cevap doğru mu?
    2. Varsa kavramsal hatalar
    3. Güçlü yönler
    4. Gelişim önerileri
    5. Ek çalışma konuları
    
    JSON formatında detaylı analiz ver.
    `;

    return this.generateStructuredContent(prompt);
  }

  async generateQuestions(topic: string, difficulty: string, count: number): Promise<any> {
    const prompt = `
    ${topic} konusu hakkında ${difficulty} zorluk seviyesinde ${count} adet çoktan seçmeli soru oluştur.
    
    Her soru için:
    - Soru metni
    - 4 seçenek (A, B, C, D)
    - Doğru cevap
    - Açıklama
    
    JSON formatında sorular listesi ver.
    `;

    return this.generateStructuredContent(prompt);
  }

  async createLearningPath(goals: string[], currentLevel: string, preferences: any): Promise<any> {
    const prompt = `
    Şu hedefler için öğrenme yolu oluştur:
    Hedefler: ${goals.join(', ')}
    Mevcut Seviye: ${currentLevel}
    Tercihler: ${JSON.stringify(preferences)}
    
    Öğrenme yolu şunları içermeli:
    1. Adım adım ilerleme planı
    2. Her adım için kaynak önerileri
    3. Değerlendirme kriterleri
    4. Tahmini süre
    5. Kilometre taşları
    
    JSON formatında detaylı öğrenme yolu ver.
    `;

    return this.generateStructuredContent(prompt);
  }

  async provideMentalSupport(issue: string, context: string): Promise<string> {
    const prompt = `
    Bir öğrenci şu konuda destek istiyor:
    
    Sorun: ${issue}
    Bağlam: ${context}
    
    Empatik ve destekleyici bir yaklaşımla:
    1. Sorunu anla ve normalleştir
    2. Pratik çözüm önerileri ver
    3. Motivasyonel mesajlar ekle
    4. Gerektiğinde profesyonel yardım öner
    
    Destekleyici ve yapıcı bir yanıt ver.
    `;

    return this.generateContent(prompt);
  }
}
