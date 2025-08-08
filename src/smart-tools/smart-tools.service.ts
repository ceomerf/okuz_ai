import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { GeminiService } from '../services/gemini.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Response } from 'express';

interface SolveQuestionData {
  questionText?: string;
  subject: string;
  grade?: number;
  imageBase64?: string;
  userId?: string;
}

@Injectable()
export class SmartToolsService {
  private readonly logger = new Logger(SmartToolsService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async quickChatStream(data: { message: string; subject?: string; grade?: string }, res: Response) {
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

      const prompt = `
      Sen bir ${data.grade || '12'}. sınıf öğrencisinin ${data.subject || 'genel'} dersinde yardımcı olan bir AI asistanısın.
      
      Öğrencinin mesajı: ${data.message}
      
      Lütfen:
      1. Soruyu/konuyu anla
      2. Açık ve anlaşılır bir şekilde cevapla
      3. Gerekirse örnekler ver
      4. Öğrencinin seviyesine uygun dil kullan
      5. Takip soruları öner
      `;

      // Stream the response
      const stream = await this.geminiService.generateContentStream(prompt);
      
      let fullResponse = '';
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        
        // Send text chunk
        res.write(`data: ${JSON.stringify({ type: 'TEXT_CHUNK', content: chunk })}\n\n`);
      }

      // Send metadata with follow-up questions
      const followUpQuestions = [
        "Bu konuda başka ne öğrenmek istiyorsun?",
        "Farklı bir açıdan bakmak ister misin?",
        "Bu bilgiyi nasıl kullanabilirsin?",
        "Başka bir konuya geçmek ister misin?"
      ];

      res.write(`data: ${JSON.stringify({ 
        type: 'METADATA_CHUNK', 
        content: { followUpQuestions } 
      })}\n\n`);

      // TODO: Save usage statistics - şimdilik kaldırıldı
      // await this.prisma.toolUsage.create({
      //   data: {
      //     toolName: 'quick-chat-stream',
      //     userId: 'system', // TODO: Gerçek user ID
      //     input: data.message,
      //     output: fullResponse,
      //     metadata: { subject: data.subject, grade: data.grade }
      //   }
      // });

      res.write(`data: ${JSON.stringify({ type: 'STATUS', content: 'Tamamlandı' })}\n\n`);
      res.end();

    } catch (error) {
      console.error('Quick chat stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'ERROR_CHUNK', content: 'Bir hata oluştu' })}\n\n`);
      res.end();
    }
  }

  async solveQuestion(data: SolveQuestionData) {
    try {
      this.logger.log(`Gelen data: ${JSON.stringify(data)}`);
      
      // userId kontrolü
      if (!data.userId) {
        this.logger.warn('userId parametresi eksik, anonim kullanım olarak işaretleniyor');
        // Anonim kullanım için ToolUsage kaydı oluşturmuyoruz
        return await this._processQuestionWithoutUser(data);
      }

      this.logger.log(`userId bulundu: ${data.userId}`);

      // Kullanıcının varlığını kontrol et
      this.logger.log(`Kullanıcı aranıyor: ${data.userId}`);
      let user;
      try {
        user = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { id: true, email: true }
        });

        if (!user) {
          this.logger.warn(`Kullanıcı bulunamadı: ${data.userId}`);
          this.logger.warn('Anonim kullanım olarak işaretleniyor');
          return await this._processQuestionWithoutUser(data);
        }

        this.logger.log(`Kullanıcı bulundu: ${user.email} (ID: ${user.id})`);
      } catch (userLookupError) {
        this.logger.error(`Kullanıcı arama hatası: ${userLookupError}`);
        this.logger.warn('Anonim kullanım olarak işaretleniyor');
        return await this._processQuestionWithoutUser(data);
      }

      this.logger.log(`Soru çözme isteği - Kullanıcı: ${user.email}, Konu: ${data.subject}`);

      let questionContent = '';
      
      if (data.imageBase64) {
        // Resim varsa, resim analizi için prompt hazırla
        questionContent = `Resimdeki soru: [Resim analizi]`;
      } else if (data.questionText) {
        questionContent = data.questionText;
      } else {
        throw new Error('Soru metni veya resim sağlanmalı');
      }

      const grade = data.grade || 12;
      
      const prompt = `
      Sen bir ${grade}. sınıf ${data.subject} öğretmenisin. 
      Aşağıdaki soruyu adım adım çöz ve açıkla:
      
      Soru: ${questionContent}
      
      Lütfen SADECE JSON formatında cevapla, başka hiçbir metin ekleme:
      {
        "steps": [
          {
            "step": 1,
            "explanation": "Adım açıklaması",
            "formula": "Kullanılan formül (varsa)"
          }
        ],
        "topic": "Tespit edilen konu",
        "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
      }
      `;

      const response = await this.geminiService.generateContent(prompt);
      
      // JSON response'u parse et
      let parsedResponse;
      try {
        // Response'u temizle - JSON markdown kod bloklarını kaldır
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        parsedResponse = JSON.parse(cleanResponse);
        
        // Response formatını doğrula
        if (!parsedResponse.steps || !Array.isArray(parsedResponse.steps)) {
          throw new Error('Invalid response format');
        }
      } catch (e) {
        this.logger.warn(`JSON parse hatası: ${e.message}`);
        // Eğer JSON parse edilemezse, basit format kullan
        parsedResponse = {
          steps: [
            {
              step: 1,
              explanation: response,
              formula: null
            }
          ],
          topic: data.subject,
          tips: ["Çözümü tekrar gözden geçirin", "Benzer sorular çözün", "Formülleri tekrar edin"]
        };
      }

      // ToolUsage kaydını oluştur (sadece geçerli kullanıcı için)
      try {
        await this.prisma.toolUsage.create({
          data: {
            userId: user.id, // user.id kullan (data.userId değil)
            toolName: 'solve-question',
          },
        });
        this.logger.log(`ToolUsage kaydı oluşturuldu - UserId: ${user.id}`);
      } catch (toolUsageError) {
        this.logger.error(`ToolUsage kaydı oluşturulurken hata: ${toolUsageError}`);
        // ToolUsage hatası kritik değil, işleme devam et
      }

      this.logger.log(`Soru çözme tamamlandı - Kullanıcı: ${user.email}, Konu: ${data.subject}`);

      return {
        success: true,
        learningPath: parsedResponse
      };
    } catch (error) {
      this.logger.error(`SOS Question Solver hatası: ${error.message}`, error.stack);
      
      // Eğer NotFoundException ise, onu tekrar fırlat
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Diğer hatalar için genel hata fırlat
      throw new Error(`Soru çözme işlemi başarısız: ${error.message}`);
    }
  }

  private async _processQuestionWithoutUser(data: SolveQuestionData) {
    this.logger.log(`Anonim soru çözme isteği - Konu: ${data.subject}`);

    let questionContent = '';
    
    if (data.imageBase64) {
      questionContent = `Resimdeki soru: [Resim analizi]`;
    } else if (data.questionText) {
      questionContent = data.questionText;
    } else {
      throw new Error('Soru metni veya resim sağlanmalı');
    }

    const grade = data.grade || 12;
    
    const prompt = `
    Sen bir ${grade}. sınıf ${data.subject} öğretmenisin. 
    Aşağıdaki soruyu adım adım çöz ve açıkla:
    
    Soru: ${questionContent}
    
    Lütfen SADECE JSON formatında cevapla, başka hiçbir metin ekleme:
    {
      "steps": [
        {
          "step": 1,
          "explanation": "Adım açıklaması",
          "formula": "Kullanılan formül (varsa)"
        }
      ],
      "topic": "Tespit edilen konu",
      "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
    }
    `;

    const response = await this.geminiService.generateContent(prompt);
    
    // JSON response'u parse et
    let parsedResponse;
    try {
      // Response'u temizle - JSON markdown kod bloklarını kaldır
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedResponse = JSON.parse(cleanResponse);
      
      // Response formatını doğrula
      if (!parsedResponse.steps || !Array.isArray(parsedResponse.steps)) {
        throw new Error('Invalid response format');
      }
    } catch (e) {
      this.logger.warn(`JSON parse hatası: ${e.message}`);
      parsedResponse = {
        steps: [
          {
            step: 1,
            explanation: response,
            formula: null
          }
        ],
        topic: data.subject,
        tips: ["Çözümü tekrar gözden geçirin", "Benzer sorular çözün", "Formülleri tekrar edin"]
      };
    }

    this.logger.log(`Anonim soru çözme tamamlandı - Konu: ${data.subject}`);

    return {
      success: true,
      learningPath: parsedResponse
    };
  }

  async generateSummary(data: { content: string; type: string }) {
    try {
      this.logger.log(`Summary generation başlatıldı - Type: ${data.type}`);
      
      // Input validasyonu
      if (!data.content || data.content.trim().length === 0) {
        throw new Error('İçerik boş olamaz');
      }
      
      if (!data.type || data.type.trim().length === 0) {
        throw new Error('Özet türü belirtilmelidir');
      }

      const prompt = `
      Aşağıdaki içeriği ${data.type} formatında özetle:
      
      İçerik: ${data.content}
      
      Özet türü: ${data.type}
      
      Lütfen:
      1. Ana fikirleri çıkar
      2. Önemli noktaları vurgula
      3. ${data.type} formatında düzenle
      4. Kolay anlaşılır olsun
      `;

      const response = await this.geminiService.generateContent(prompt);
      
      this.logger.log(`Summary generation tamamlandı - Type: ${data.type}`);
      
      return {
        success: true,
        summary: response,
        type: data.type,
        originalLength: data.content.length,
        summaryLength: response.length
      };
    } catch (error) {
      this.logger.error(`Summary generation hatası: ${error.message}`, error.stack);
      throw new Error(`Özet oluşturma işlemi başarısız: ${error.message}`);
    }
  }

  async generateFlashcards(data: { topic: string; count: number; cardCount?: number }) {
    try {
      this.logger.log(`Flashcards generation başlatıldı - Topic: ${data.topic}, Count: ${data.count}`);
      
      // Input validasyonu
      if (!data.topic || data.topic.trim().length === 0) {
        throw new Error('Konu belirtilmelidir');
      }
      
      // count veya cardCount parametresini kontrol et
      const cardCount = data.count || data.cardCount;
      if (!cardCount || cardCount < 1 || cardCount > 20) {
        throw new Error('Flashcard sayısı 1-20 arasında olmalıdır');
      }

              const prompt = `
        "${data.topic}" konusu için ${cardCount} adet flashcard oluştur.
      
      Her flashcard için:
      - Ön yüz: Soru/Kavram
      - Arka yüz: Cevap/Açıklama
      
      Format:
      {
        "flashcards": [
          {
            "front": "Soru/Kavram",
            "back": "Cevap/Açıklama",
            "difficulty": "kolay/orta/zor"
          }
        ]
      }
      `;

      const response = await this.geminiService.generateContent(prompt);
      
      let flashcards;
      try {
        // Response'u temizle
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks
        if (cleanResponse.includes('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.includes('```')) {
          cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Remove any remaining markdown formatting
        cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
        
        flashcards = JSON.parse(cleanResponse);
        
        // Response formatını doğrula
        if (!flashcards.flashcards || !Array.isArray(flashcards.flashcards)) {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        this.logger.warn(`Flashcards JSON parse hatası: ${parseError.message}`);
        flashcards = {
          flashcards: [
            {
              front: `${data.topic} nedir?`,
              back: `${data.topic} konusu hakkında temel bilgi`,
              difficulty: "kolay"
            },
            {
              front: `${data.topic} nasıl uygulanır?`,
              back: `${data.topic} konusunun pratik uygulamaları`,
              difficulty: "orta"
            }
          ]
        };
      }
      
      this.logger.log(`Flashcards generation tamamlandı - Topic: ${data.topic}`);
      
      return {
        success: true,
        topic: data.topic,
        count: cardCount,
        flashcards: flashcards
      };
    } catch (error) {
      this.logger.error(`Flashcards generation hatası: ${error.message}`, error.stack);
      throw new Error(`Flashcards oluşturma işlemi başarısız: ${error.message}`);
    }
  }

  async generateConceptMap(data: { grade: string; subject: string; topic: string }) {
    try {
      // Input validation
      if (!data.topic || data.topic.trim().length === 0) {
        throw new Error('Konu belirtilmelidir');
      }
      
      if (!data.subject || data.subject.trim().length === 0) {
        throw new Error('Ders belirtilmelidir');
      }
      
      if (!data.grade || data.grade.trim().length === 0) {
        throw new Error('Sınıf belirtilmelidir');
      }
      const prompt = `
**SİSTEM ROLÜ VE KİMLİK:**
Sen, karmaşık konuları görsel ve sezgisel "Bilgi Ağaçları"na dönüştüren dahi bir **Usta Kâşif ve Bilgi Mimarısı**'sın. Senin görevin, öğrenciye sadece bir harita vermek değil, onu konunun derinliklerinde heyecan verici bir keşif yolculuğuna çıkarmaktır. Her bir kavram, bu yolculuktaki bir durak noktasıdır.

**ANA PRENSİPLER (FELSEFEN):**
1.  **HİYERARŞİK DÜŞÜN:** Bilgiyi ağaç yapısında, genelden özele doğru organize et. Bir ana kavramın, onu oluşturan alt dalları (children) olmalıdır. Bu yapı, bilginin nasıl katmanlaştığını gösterir.
2.  **BİLGİYİ HAYATA BAĞLA (WOW FAKTÖRÜ):** Her bir kavram durağını sıkıcı bir tanımdan ibaret bırakma. Onu zenginleştirerek hayata geçir. Her kavram için MUTLAKA şu üç unsuru ekle:
    * **Analoji:** Soyut kavramı, öğrencinin günlük hayatından anlayabileceği somut bir benzetme ile açıkla.
    * **Kilit Soru:** Öğrencinin eleştirel düşünmesini tetikleyecek, "Neden?", "Eğer böyle olmasaydı ne olurdu?" gibi açık uçlu bir soru sor.
    * **Yaygın Yanılgı:** Öğrencilerin bu kavramla ilgili sıkça düştüğü bir tuzağı veya yanlış anlamayı belirt ve doğrusunu açıkla.
3.  **GÖRSEL VE SEZGİSEL OL:** Her kavrama, onun doğasını yansıtan bir emoji \`icon\` önerisi ekle. Bu, haritanın görsel dilini zenginleştirir.
4.  **ÖĞRENME YOLCULUĞU TASARLA:** Harita, en temel kavramdan başlayıp en karmaşık uygulamalara doğru ilerleyen mantıksal bir akış sunmalıdır.

**GÖREV SÜRECİ (DÜŞÜNCE AKIŞIN):**
1.  **Merkezi Belirle:** Sana verilen "${data.topic}" konusunu ağacın kökü (\`centralConcept\`) olarak belirle.
2.  **Ana Dalları Oluştur:** Kök kavramı doğrudan oluşturan en önemli 3 ila 5 ana alt kavramı (\`children\` olarak) tanımla.
3.  **Derinleş:** Her bir ana dal için, onu daha detaylı açıklayan 2 ila 3 adet ikincil alt dal (\`children\` of children) oluştur. Hiyerarşiyi en az 2 seviye derinleştir.
4.  **HER BİR DÜĞÜMÜ ZENGİNLEŞTİR:** Ağaçtaki **HER BİR** kavram (merkez, ana ve ikincil dallar) için, aşağıda belirtilen JSON formatındaki **TÜM** alanları eksiksiz doldur. Hiçbir alanı boş bırakma.

**GİRDİ PARAMETRELERİ:**
* **grade:** ${data.grade}
* **subject:** ${data.subject}
* **topic:** ${data.topic}

**ÇIKTI FORMATI (JSON - KESİNLİKLE UYULMASI GEREKEN YAPI):**
Çıktın, aşağıdaki hiyerarşik yapıya sahip tek bir JSON objesi olmalıdır. Açıklama veya ek metin ekleme.
{
  "mapTitle": "string", // Örn: "Hücre Bölünmesi: Bir Yaşam Macerası"
  "centralConcept": {
    "name": "${data.topic}",
    "description": "string", // Konunun genel bir özeti, 1-2 cümle.
    "importance": "yüksek",
    "icon": "string", // Konuyu en iyi temsil eden emoji. Örn: "🧬"
    "analogy": "string", // Konuyu açıklayan basit ve güçlü bir benzetme. Örn: "Hücre bölünmesi, bir kütüphanedeki tüm kitapların fotokopisini çekip yeni bir kütüphane kurmaya benzer."
    "keyQuestion": "string", // Eleştirel düşünme sorusu. Örn: "Eğer hücreler hiç bölünmeseydi, canlılık nasıl devam ederdi?"
    "commonMisconception": "string | null", // Varsa, konuyla ilgili genel bir yanılgı.
    "children": [ // ANA DALLAR
      {
        "name": "string", // Alt kavramın adı. Örn: "Mitoz Bölünme"
        "description": "string",
        "importance": "yüksek" | "orta" | "düşük",
        "icon": "string", // Örn: " copie"
        "analogy": "string", // Örn: "Mitoz, bir sayfanın birebir aynı fotokopisini çekmek gibidir."
        "keyQuestion": "string", // Örn: "Vücudumuzdaki hangi hücreler sürekli mitoz geçirir ve neden?"
        "commonMisconception": "string", // Örn: "Yaygın bir yanılgı, mitozun sadece büyüme için olduğudur; oysa yaraların iyileşmesi de mitoz sayesindedir."
        "children": [ // İKİNCİL DALLAR
          // ... aynı yapı burada da devam eder ...
        ]
      }
    ]
  }
}
`;

      const response = await this.geminiService.generateContent(prompt);
      
      let conceptMap;
      try {
        // Clean the response first
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks more thoroughly
        cleanResponse = cleanResponse.replace(/```json\s*/g, '');
        cleanResponse = cleanResponse.replace(/```\s*/g, '');
        cleanResponse = cleanResponse.replace(/^```/, '');
        cleanResponse = cleanResponse.replace(/```$/, '');
        
        // Remove any leading/trailing whitespace
        cleanResponse = cleanResponse.trim();
        
        this.logger.debug(`Temizlenmiş response: ${cleanResponse}`);
        
        conceptMap = JSON.parse(cleanResponse);
      } catch (parseError) {
        this.logger.warn(`Concept map JSON parse hatası: ${parseError.message}`);
        this.logger.debug(`Orijinal response: ${response}`);
        // Fallback concept map with more specific content based on subject
        const getSubjectSpecificConcepts = (subject: string, topic: string) => {
          const subjectLower = subject.toLowerCase();
          if (subjectLower.includes('matematik')) {
            return [
              { name: "Temel Tanımlar", description: `${topic} ile ilgili temel matematiksel tanımlar`, importance: "yüksek" },
              { name: "Formüller", description: `${topic} konusunda kullanılan formüller`, importance: "yüksek" },
              { name: "Problem Çözme", description: `${topic} ile ilgili problem çözme teknikleri`, importance: "orta" },
              { name: "Uygulamalar", description: `${topic} konusunun günlük hayat uygulamaları`, importance: "orta" }
            ];
          } else if (subjectLower.includes('fizik')) {
            return [
              { name: "Fiziksel Kavramlar", description: `${topic} ile ilgili temel fiziksel kavramlar`, importance: "yüksek" },
              { name: "Yasalar", description: `${topic} konusunda geçerli fizik yasaları`, importance: "yüksek" },
              { name: "Deneyler", description: `${topic} ile ilgili laboratuvar deneyleri`, importance: "orta" },
              { name: "Teknolojik Uygulamalar", description: `${topic} konusunun teknolojideki kullanımı`, importance: "orta" }
            ];
          } else if (subjectLower.includes('kimya')) {
            return [
              { name: "Kimyasal Kavramlar", description: `${topic} ile ilgili temel kimyasal kavramlar`, importance: "yüksek" },
              { name: "Reaksiyonlar", description: `${topic} konusunda geçen kimyasal reaksiyonlar`, importance: "yüksek" },
              { name: "Laboratuvar", description: `${topic} ile ilgili laboratuvar çalışmaları`, importance: "orta" },
              { name: "Endüstriyel Uygulamalar", description: `${topic} konusunun endüstrideki kullanımı`, importance: "orta" }
            ];
          } else if (subjectLower.includes('biyoloji')) {
            return [
              { name: "Biyolojik Kavramlar", description: `${topic} ile ilgili temel biyolojik kavramlar`, importance: "yüksek" },
              { name: "Sistemler", description: `${topic} konusunda geçen biyolojik sistemler`, importance: "yüksek" },
              { name: "Araştırmalar", description: `${topic} ile ilgili bilimsel araştırmalar`, importance: "orta" },
              { name: "Sağlık Uygulamaları", description: `${topic} konusunun sağlık alanındaki uygulamaları`, importance: "orta" }
            ];
          } else {
            return [
              { name: "Temel Kavramlar", description: `${topic} ile ilgili temel kavramlar`, importance: "yüksek" },
              { name: "Önemli Noktalar", description: `${topic} konusunun önemli noktaları`, importance: "yüksek" },
              { name: "Uygulamalar", description: `${topic} konusunun pratik uygulamaları`, importance: "orta" },
              { name: "İleri Konular", description: `${topic} ile ilgili ileri seviye konular`, importance: "düşük" }
            ];
          }
        };

        const concepts = getSubjectSpecificConcepts(data.subject, data.topic);
        
        conceptMap = {
          centralConcept: data.topic,
          concepts: concepts,
          relationships: concepts.map((concept, index) => ({
            from: data.topic,
            to: concept.name,
            type: index < 2 ? "içerir" : "uygulanır",
            description: `${data.topic} konusu ${concept.name.toLowerCase()} ile ilişkilidir`
          }))
        };
      }
      
      return {
        success: true,
        conceptMap: conceptMap
      };
    } catch (error) {
      this.logger.error(`Concept map oluşturma hatası: ${error.message}`, error.stack);
      throw new Error('Concept map oluşturulamadı');
    }
  }

  private getSubjectSpecificDetails(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('matematik')) {
      return `
      - Temel tanımlar ve kavramlar (çok detaylı)
      - Formüller ve teoremler (ispatları dahil)
      - Problem çözme teknikleri (adım adım)
      - Uygulama alanları (günlük hayat örnekleri)
      - Tarihsel gelişim (önemli matematikçiler ve katkıları)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki konularla bağlantılar
      - Sonraki konulara geçişler
      - Karşılaştırmalı analizler
      - Güncel uygulamalar ve teknoloji
      `;
    } else if (subjectLower.includes('fizik')) {
      return `
      - Fiziksel kavramlar ve tanımlar (çok detaylı)
      - Yasalar ve prensipler (tarihsel gelişim)
      - Deneyler ve gözlemler (laboratuvar süreçleri)
      - Formüller ve hesaplamalar (birim analizi)
      - Teknolojik uygulamalar (güncel örnekler)
      - Tarihsel gelişim (önemli fizikçiler ve keşifler)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki konularla bağlantılar
      - Sonraki konulara geçişler
      - Karşılaştırmalı analizler
      - Güncel araştırmalar ve buluşlar
      `;
    } else if (subjectLower.includes('kimya')) {
      return `
      - Kimyasal kavramlar ve tanımlar (çok detaylı)
      - Reaksiyonlar ve denklemler (mekanizmaları)
      - Laboratuvar çalışmaları (güvenlik kuralları)
      - Endüstriyel uygulamalar (güncel örnekler)
      - Tarihsel gelişim (önemli kimyacılar ve keşifler)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki konularla bağlantılar
      - Sonraki konulara geçişler
      - Karşılaştırmalı analizler
      - Güncel araştırmalar ve buluşlar
      - Çevre ve sağlık etkileri
      `;
    } else if (subjectLower.includes('biyoloji')) {
      return `
      - Biyolojik kavramlar ve tanımlar (çok detaylı)
      - Sistemler ve süreçler (mekanizmaları)
      - Araştırmalar ve keşifler (güncel buluşlar)
      - Sağlık uygulamaları (tıbbi örnekler)
      - Tarihsel gelişim (önemli biyologlar ve keşifler)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki konularla bağlantılar
      - Sonraki konulara geçişler
      - Karşılaştırmalı analizler
      - Güncel araştırmalar ve buluşlar
      - Çevre ve ekoloji etkileri
      - Genetik ve evrimsel bağlantılar
      `;
    } else if (subjectLower.includes('türk') || subjectLower.includes('edebiyat')) {
      return `
      - Edebi akımlar ve dönemler (tarihsel gelişim)
      - Önemli yazarlar ve şairler (hayatları ve eserleri)
      - Eserler ve türler (detaylı analiz)
      - Tarihsel gelişim (sosyal ve siyasi bağlam)
      - Sosyal ve kültürel bağlam (dönem özellikleri)
      - Dil özellikleri (gramer ve üslup)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki dönemlerle bağlantılar
      - Sonraki dönemlere geçişler
      - Karşılaştırmalı analizler
      - Güncel edebiyat etkileri
      - Edebiyat teorileri ve eleştiri
      - Çeviri ve etkileşim
      `;
    } else if (subjectLower.includes('tarih')) {
      return `
      - Tarihsel olaylar ve dönemler (kronolojik sıralama)
      - Önemli kişiler ve liderler (hayatları ve katkıları)
      - Siyasi ve sosyal gelişmeler (neden-sonuç ilişkileri)
      - Ekonomik faktörler (ticaret ve sanayi)
      - Kültürel değişimler (sanat ve bilim)
      - Coğrafi faktörler (stratejik önem)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki dönemlerle bağlantılar
      - Sonraki dönemlere geçişler
      - Karşılaştırmalı analizler
      - Güncel tarih araştırmaları
      - Arkeolojik bulgular
      - Tarih metodolojisi
      `;
    } else if (subjectLower.includes('coğrafya')) {
      return `
      - Fiziki coğrafya özellikleri (detaylı analiz)
      - Beşeri coğrafya faktörleri (sosyal ve ekonomik)
      - Ekonomik faaliyetler (sanayi ve tarım)
      - Çevre sorunları (küresel ısınma, kirlilik)
      - Doğal kaynaklar (enerji ve madenler)
      - İklim ve bitki örtüsü (ekosistem)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki konularla bağlantılar
      - Sonraki konulara geçişler
      - Karşılaştırmalı analizler
      - Güncel çevre sorunları
      - Sürdürülebilir kalkınma
      - Küresel değişimler
      `;
    } else {
      return `
      - Temel kavramlar ve tanımlar (çok detaylı)
      - Önemli teoriler ve yaklaşımlar (tarihsel gelişim)
      - Uygulama alanları (güncel örnekler)
      - Tarihsel gelişim (önemli kişiler ve katkıları)
      - Sınav odaklı önemli noktalar (püf noktaları)
      - Hata yapılan noktalar ve çözümleri
      - Önceki konularla bağlantılar
      - Sonraki konulara geçişler
      - Karşılaştırmalı analizler
      - Güncel araştırmalar ve buluşlar
      `;
    }
  }

  async feynmanCycle(data: { topic: string; explanation: string }) {
    const prompt = `
    Feynman öğrenme tekniği ile "${data.topic}" konusunu değerlendir.
    
    Öğrencinin açıklaması: ${data.explanation}
    
    Lütfen:
    1. Açıklamadaki eksiklikleri belirt
    2. Karmaşık kısımları basitleştir
    3. Örneklerle destekle
    4. Pratik uygulamalar öner
    5. Sonraki adımları belirt
    `;

    const response = await this.geminiService.generateContent(prompt);
    
    return {
      success: true,
      topic: data.topic,
      originalExplanation: data.explanation,
      improvedExplanation: response,
      nextSteps: [
        "Konuyu tekrar çalış",
        "Farklı kaynaklardan araştır",
        "Pratik yap",
        "Başkasına öğret"
      ]
    };
  }

  async socraticEvaluation(data: { answer: string; question: string }) {
    const prompt = `
    Sokratik yöntemle bu cevabı değerlendir:
    
    Soru: ${data.question}
    Cevap: ${data.answer}
    
    Lütfen:
    1. Cevabın güçlü yanlarını belirt
    2. Eksiklikleri göster
    3. Daha derin düşünmeyi teşvik eden sorular sor
    4. Alternatif bakış açıları öner
    5. Gelişim önerileri ver
    `;

    const response = await this.geminiService.generateContent(prompt);
    
    return {
      success: true,
      question: data.question,
      answer: data.answer,
      evaluation: response,
      followUpQuestions: [
        "Bu konuda başka ne düşünüyorsun?",
        "Farklı bir açıdan bakarsak ne olur?",
        "Bu bilgiyi nasıl kullanabilirsin?"
      ]
    };
  }

  async generateLiveQuiz(data: { topic: string; difficulty: string; count?: number; questionCount?: number; subject?: string; grade?: string }) {
    try {
      const count = (typeof data.questionCount === 'number' && data.questionCount > 0)
        ? data.questionCount
        : (typeof data.count === 'number' && data.count > 0 ? data.count : 10);

      const subjectLine = data.subject ? `Ders: ${data.subject}.` : '';
      const gradeLine = data.grade ? `Sınıf: ${data.grade}.` : '';

      const prompt = `
      ${gradeLine} ${subjectLine}
      "${data.topic}" konusu için ${count} adet ${data.difficulty} zorlukta soru oluştur.
      Soruları doğrudan bu konuya ve bu dersin müfredat bağlamına uygun üret.
      
      Format:
      {
        "quiz": {
          "topic": "${data.topic}",
          "difficulty": "${data.difficulty}",
          "questions": [
            {
              "question": "Soru metni",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": "A",
              "explanation": "Açıklama",
              "timeLimit": 60
            }
          ]
        }
      }
      `;

      const response = await this.geminiService.generateContent(prompt);
      
      let quiz;
      try {
        // Clean the response first
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks
        if (cleanResponse.includes('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.includes('```')) {
          cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Remove any remaining markdown formatting
        cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
        
        quiz = JSON.parse(cleanResponse);
      } catch (parseError) {
        this.logger.warn(`Live quiz JSON parse hatası: ${parseError.message}`);
        this.logger.debug(`Orijinal response: ${response}`);
        quiz = {
          quiz: {
            topic: data.topic,
            difficulty: data.difficulty,
            questions: [
              {
                question: `${data.topic} konusu hakkında temel soru`,
                options: ["A", "B", "C", "D"],
                correctAnswer: "A",
                explanation: "Temel açıklama",
                timeLimit: 60
              }
            ]
          }
        };
      }
      
      return {
        success: true,
        quiz: quiz
      };
    } catch (error) {
      console.error('Live quiz oluşturma hatası:', error);
      throw new Error('Live quiz oluşturulamadı');
    }
  }

  async examSimulator(data: { subject: string; grade: number; duration: number }) {
    try {
      const prompt = `
      ${data.grade}. sınıf ${data.subject} dersi için ${data.duration} dakikalık sınav simülatörü oluştur.
      
      Format:
      {
        "exam": {
          "subject": "${data.subject}",
          "grade": ${data.grade},
          "duration": ${data.duration},
          "totalQuestions": 20,
          "sections": [
            {
              "name": "Bölüm 1",
              "questions": [
                {
                  "question": "Soru",
                  "options": ["A", "B", "C", "D"],
                  "correctAnswer": "A",
                  "points": 5
                }
              ]
            }
          ]
        }
      }
      `;

      const response = await this.geminiService.generateContent(prompt);
      
      let exam;
      try {
        exam = JSON.parse(response);
      } catch (parseError) {
        console.error('Exam simulator JSON parse hatası:', parseError);
        exam = {
          exam: {
            subject: data.subject,
            grade: data.grade,
            duration: data.duration,
            totalQuestions: 20,
            sections: [
              {
                name: "Bölüm 1",
                questions: [
                  {
                    question: `${data.subject} dersi hakkında temel soru`,
                    options: ["A", "B", "C", "D"],
                    correctAnswer: "A",
                    points: 5
                  }
                ]
              }
            ]
          }
        };
      }
      
      return {
        success: true,
        exam: exam
      };
    } catch (error) {
      console.error('Exam simulator oluşturma hatası:', error);
      throw new Error('Exam simulator oluşturulamadı');
    }
  }

  async generateLearningPath(data: { topic: string; level: string; goals: string[]; subject?: string; grade?: string }) {
    try {
      // Input validation
      if (!data.topic || data.topic.trim().length === 0) {
        throw new Error('Konu belirtilmelidir');
      }
      
      if (!data.level || data.level.trim().length === 0) {
        throw new Error('Seviye belirtilmelidir');
      }
      
      // Ensure goals is always an array
      const goals = data.goals || [];
      const prompt = `
      "${data.topic}" konusu için ${data.level} seviyesinde öğrenme yolu oluştur.
      
      Ders: ${data.subject || 'Matematik'}
      Sınıf: ${data.grade || '11. Sınıf'}
      Hedefler: ${goals.join(', ')}
      
      MEB müfredatına uygun, sadece müfredat dahilindeki konuları içeren bir öğrenme yolu oluştur.
      Kaynaklar MEB ders kitapları, güvenilir yayınevleri ve eğitim platformlarından seçilmeli.
      
      SADECE JSON formatında yanıt ver, markdown kullanma:
      {
        "learningPath": {
          "topic": "${data.topic}",
          "level": "${data.level}",
          "subject": "${data.subject || 'Matematik'}",
          "grade": "${data.grade || '11. Sınıf'}",
          "goals": ${JSON.stringify(data.goals)},
          "steps": [
            {
              "step": 1,
              "title": "Adım başlığı",
              "description": "Açıklama",
              "resources": ["MEB Ders Kitabı", "Aydın Yayınları", "Khan Academy"],
              "estimatedTime": "30 dakika",
              "prerequisites": []
            }
          ],
          "milestones": [
            {
              "milestone": "Kilometre taşı",
              "description": "Açıklama",
              "criteria": ["kriter1", "kriter2"]
            }
          ]
        }
      }
      `;

      const response = await this.geminiService.generateContent(prompt);
      
      // Response'u parse etmeye çalış, hata olursa fallback kullan
      let learningPath;
      try {
        // Clean the response first
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks
        if (cleanResponse.includes('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.includes('```')) {
          cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Remove any remaining markdown formatting
        cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
        
        this.logger.debug(`Temizlenmiş response: ${cleanResponse}`);
        
        learningPath = JSON.parse(cleanResponse);
      } catch (parseError) {
        this.logger.warn(`Learning path JSON parse hatası: ${parseError.message}`);
        this.logger.debug(`Orijinal response: ${response}`);
        // Fallback response
        learningPath = {
          learningPath: {
            topic: data.topic,
            level: data.level,
            goals: goals,
            steps: [
              {
                step: 1,
                title: "Temel Kavramlar",
                description: `${data.topic} konusunun temel kavramlarını öğrenin`,
                resources: ["Ders kitabı", "Online kaynaklar"],
                estimatedTime: "30 dakika",
                prerequisites: []
              },
              {
                step: 2,
                title: "Pratik Uygulamalar",
                description: "Öğrendiğiniz kavramları pratikte uygulayın",
                resources: ["Alıştırma kitapları", "Video dersler"],
                estimatedTime: "45 dakika",
                prerequisites: ["Temel kavramlar"]
              }
            ],
            milestones: [
              {
                milestone: "Temel Kavramlar",
                description: "Konunun temel kavramlarını anlama",
                criteria: ["Kavramları açıklayabilme", "Temel soruları çözebilme"]
              }
            ]
          }
        };
      }
      
      return {
        success: true,
        learningPath: learningPath
      };
    } catch (error) {
      console.error('Learning path oluşturma hatası:', error);
      throw new Error('Learning path oluşturulamadı');
    }
  }

  async findTopicConnections(data: { topic: string; subjects: string[] }) {
    try {
      // Input validation
      if (!data.topic || data.topic.trim().length === 0) {
        throw new Error('Konu belirtilmelidir');
      }
      
      // Ensure subjects is always an array
      const subjects = data.subjects || [];
      const prompt = `
      "${data.topic}" konusunun ${subjects.join(', ')} dersleriyle bağlantılarını bul.
      
      Format:
      {
        "connections": [
          {
            "subject": "Matematik",
            "topics": ["Konu1", "Konu2"],
            "connectionType": "Doğrudan/Dolaylı",
            "description": "Bağlantı açıklaması",
            "examples": ["Örnek1", "Örnek2"]
          }
        ],
        "crossCurricular": {
          "description": "Disiplinler arası bağlantılar",
          "benefits": ["Fayda1", "Fayda2"],
          "applications": ["Uygulama1", "Uygulama2"]
        }
      }
      `;

      const response = await this.geminiService.generateContent(prompt);
      
      let connections;
      try {
        // Clean the response first
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks
        if (cleanResponse.includes('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.includes('```')) {
          cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Remove any remaining markdown formatting
        cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
        
        connections = JSON.parse(cleanResponse);
      } catch (parseError) {
        this.logger.warn(`Topic connections JSON parse hatası: ${parseError.message}`);
        this.logger.debug(`Orijinal response: ${response}`);
        connections = {
          connections: [
            {
              subject: subjects.length > 0 ? subjects[0] : "Genel",
              topics: [data.topic],
              connectionType: "Doğrudan",
              description: `${data.topic} konusu ile ilgili bağlantılar`,
              examples: ["Temel uygulamalar"]
            }
          ],
          crossCurricular: {
            description: "Disiplinler arası bağlantılar",
            benefits: ["Bilgi transferi", "Derinlemesine anlayış"],
            applications: ["Gerçek hayat uygulamaları"]
          }
        };
      }
      
      return {
        success: true,
        topic: data.topic,
        subjects: subjects,
        connections: connections
      };
    } catch (error) {
      console.error('Topic connections oluşturma hatası:', error);
      throw new Error('Topic connections oluşturulamadı');
    }
  }

  async mentalSupport(data: { issue: string; context: string }) {
    const prompt = `
    Öğrenci desteği için zihinsel destek sağla:
    
    Sorun: ${data.issue}
    Bağlam: ${data.context}
    
    Lütfen:
    1. Empatik bir yaklaşım göster
    2. Sorunu anla ve normalleştir
    3. Pratik çözümler öner
    4. Motivasyonel mesajlar ver
    5. Profesyonel destek gerektiğinde yönlendir
    `;

    const response = await this.geminiService.generateContent(prompt);
    
    return {
      success: true,
      issue: data.issue,
      context: data.context,
      support: response,
      resources: [
        "Okul psikoloğu",
        "Aile desteği",
        "Arkadaş desteği",
        "Profesyonel danışman"
      ]
    };
  }

  async getToolsList() {
    return {
      tools: [
        {
          name: 'sos-question-solver',
          title: 'SOS Soru Çözücü',
          description: 'Acil durumlarda soru çözümü',
          icon: '🚨',
          category: 'academic'
        },
        {
          name: 'summary-generator',
          title: 'Özet Oluşturucu',
          description: 'İçerik özetleme aracı',
          icon: '📝',
          category: 'content'
        },
        {
          name: 'flashcards-generator',
          title: 'Flashcard Oluşturucu',
          description: 'Öğrenme kartları oluşturma',
          icon: '🗂️',
          category: 'study'
        },
        {
          name: 'concept-map',
          title: 'Kavram Haritası',
          description: 'Kavramlar arası bağlantılar',
          icon: '🗺️',
          category: 'visualization'
        },
        {
          name: 'feynman-cycle',
          title: 'Feynman Döngüsü',
          description: 'Feynman öğrenme tekniği',
          icon: '🔄',
          category: 'learning'
        },
        {
          name: 'socratic-evaluation',
          title: 'Sokratik Değerlendirme',
          description: 'Sokratik yöntemle değerlendirme',
          icon: '🤔',
          category: 'evaluation'
        },
        {
          name: 'live-quiz',
          title: 'Canlı Quiz',
          description: 'Anlık quiz oluşturma',
          icon: '🎯',
          category: 'assessment'
        },
        {
          name: 'exam-simulator',
          title: 'Sınav Simülatörü',
          description: 'Gerçek sınav deneyimi',
          icon: '📊',
          category: 'assessment'
        },
        {
          name: 'learning-path',
          title: 'Öğrenme Yolu',
          description: 'Kişiselleştirilmiş öğrenme planı',
          icon: '🛤️',
          category: 'planning'
        },
        {
          name: 'topic-connection',
          title: 'Konu Bağlantıları',
          description: 'Disiplinler arası bağlantılar',
          icon: '🔗',
          category: 'analysis'
        },
        {
          name: 'mental-support',
          title: 'Zihinsel Destek',
          description: 'Öğrenci psikolojik desteği',
          icon: '💙',
          category: 'support'
        }
      ]
    };
  }
} 