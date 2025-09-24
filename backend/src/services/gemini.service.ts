import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    const preferredModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash';
    this.model = this.genAI.getGenerativeModel({ model: preferredModel });
  }

  async generateContent(prompt: string): Promise<string> {
    const MAX_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }]}],
        });
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error(`Gemini API Error (Attempt ${attempt}/${MAX_RETRIES}):`, (error as any)?.message || error);
        
        if (attempt === MAX_RETRIES) {
          // Son denemede de başarısız olursa fallback'e geç
          try {
            const fallback = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await fallback.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }]}],
            });
            const response = await result.response;
            return response.text();
          } catch (err2) {
            console.error('Gemini API Error (fallback model):', (err2 as any)?.message || err2);
            return 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
          }
        }
        
        // Bir sonraki deneme için kısa bir süre bekle
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return 'AI servisi tüm denemelere rağmen yanıt vermedi.';
  }

  async generateContentStream(prompt: string): Promise<AsyncGenerator<string>> {
    try {
      const result = await this.model.generateContentStream(prompt);
      
      return (async function* () {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            yield chunkText;
          }
        }
      })();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Gemini Stream API Error:', error);
      }
      return (async function* () {
        yield 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
      })();
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
      if (process.env.NODE_ENV !== 'production') {
        console.error('Structured Content Error:', error);
      }
      return { error: 'Yapılandırılmış içerik oluşturulamadı' };
    }
  }

  // Function Calling: Gemini'nin tool/function çağrılarını kullanarak yapılandırılmış argümanları döndür.
  // toolName: çağrılacak fonksiyon adı, parametersSchema: JSON Schema (OpenAPI/JSON Schema benzeri), prompt: kullanıcı talimatı
  async generateFunctionCall(toolName: string, parametersSchema: any, prompt: string): Promise<any> {
    const MAX_RETRIES = 3;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const functionDeclarations = [{
          name: toolName,
          description: 'Save generated study plan into backend in a structured format',
          parameters: parametersSchema,
        }];

        const model = this.genAI.getGenerativeModel({
          model: this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash',
        });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }]}],
          tools: [{ functionDeclarations }],
          toolConfig: { functionCall: { name: toolName } },
        } as any);

        const response: any = await result.response;
        const candidates: any[] = (response as any)?.candidates || [];
        const parts: any[] = candidates[0]?.content?.parts || [];
        const fnCall = parts.find((p: any) => p.functionCall);
        if (fnCall && fnCall.functionCall && fnCall.functionCall.args) {
          return fnCall.functionCall.args;
        }
        // Bazı sürümlerde functionCalls response.promptFeedback veya usageMetadata dışında dönebilir
        // Emniyetli geri dönüş: text parse etmeyi deneme (son çare)
        const fallbackText = response.text?.() || '';
        try { return JSON.parse(fallbackText); } catch { return { error: 'NoFunctionCall' }; }
      } catch (error) {
        console.error(`Gemini Function Calling Error (Attempt ${attempt}/${MAX_RETRIES}):`, (error as any)?.message || error);
        
        if (attempt === MAX_RETRIES) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Gemini Function Calling Error:', error);
          }
          return { error: 'FunctionCallFailed' };
        }
        
        // Bir sonraki deneme için kısa bir süre bekle
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return { error: 'FunctionCallFailed' };
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
