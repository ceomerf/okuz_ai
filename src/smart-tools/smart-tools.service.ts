import { Injectable } from '@nestjs/common';
import { GeminiService } from '../services/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmartToolsService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async solveQuestion(data: { question: string; subject: string; grade: number }) {
    const prompt = `
    Sen bir ${data.grade}. sınıf ${data.subject} öğretmenisin. 
    Aşağıdaki soruyu adım adım çöz ve açıkla:
    
    Soru: ${data.question}
    
    Lütfen:
    1. Sorunun ne olduğunu anla
    2. Hangi konuları kullanacağını belirt
    3. Adım adım çözümü göster
    4. Sonucu açıkla
    5. Benzer sorular için ipuçları ver
    `;

    const response = await this.geminiService.generateContent(prompt);
    
    // Kullanım istatistiğini kaydet
    await this.prisma.toolUsage.create({
      data: {
        toolName: 'sos-question-solver',
        userId: 'system', // TODO: Gerçek user ID
        input: data.question,
        output: response,
        metadata: { subject: data.subject, grade: data.grade }
      }
    });

    return {
      success: true,
      solution: response,
      metadata: {
        subject: data.subject,
        grade: data.grade,
        timestamp: new Date()
      }
    };
  }

  async generateSummary(data: { content: string; type: string }) {
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
    
    return {
      success: true,
      summary: response,
      type: data.type,
      originalLength: data.content.length,
      summaryLength: response.length
    };
  }

  async generateFlashcards(data: { topic: string; count: number }) {
    const prompt = `
    "${data.topic}" konusu için ${data.count} adet flashcard oluştur.
    
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
    
    return {
      success: true,
      topic: data.topic,
      count: data.count,
      flashcards: JSON.parse(response)
    };
  }

  async generateConceptMap(data: { topic: string; connections: string[] }) {
    const prompt = `
    "${data.topic}" konusu için kavram haritası oluştur.
    
    Bağlantılar: ${data.connections.join(', ')}
    
    Format:
    {
      "centralConcept": "${data.topic}",
      "concepts": [
        {
          "name": "Kavram adı",
          "description": "Açıklama",
          "connections": ["bağlantı1", "bağlantı2"],
          "importance": "yüksek/orta/düşük"
        }
      ],
      "relationships": [
        {
          "from": "kavram1",
          "to": "kavram2",
          "type": "bağlantı türü",
          "description": "açıklama"
        }
      ]
    }
    `;

    const response = await this.geminiService.generateContent(prompt);
    
    return {
      success: true,
      conceptMap: JSON.parse(response)
    };
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

  async generateLiveQuiz(data: { topic: string; difficulty: string; count: number }) {
    const prompt = `
    "${data.topic}" konusu için ${data.count} adet ${data.difficulty} zorlukta soru oluştur.
    
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
    
    return {
      success: true,
      quiz: JSON.parse(response)
    };
  }

  async examSimulator(data: { subject: string; grade: number; duration: number }) {
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
    
    return {
      success: true,
      exam: JSON.parse(response)
    };
  }

  async generateLearningPath(data: { topic: string; level: string; goals: string[] }) {
    const prompt = `
    "${data.topic}" konusu için ${data.level} seviyesinde öğrenme yolu oluştur.
    
    Hedefler: ${data.goals.join(', ')}
    
    Format:
    {
      "learningPath": {
        "topic": "${data.topic}",
        "level": "${data.level}",
        "goals": ${JSON.stringify(data.goals)},
        "steps": [
          {
            "step": 1,
            "title": "Adım başlığı",
            "description": "Açıklama",
            "resources": ["kaynak1", "kaynak2"],
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
    
    return {
      success: true,
      learningPath: JSON.parse(response)
    };
  }

  async findTopicConnections(data: { topic: string; subjects: string[] }) {
    const prompt = `
    "${data.topic}" konusunun ${data.subjects.join(', ')} dersleriyle bağlantılarını bul.
    
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
    
    return {
      success: true,
      topic: data.topic,
      subjects: data.subjects,
      connections: JSON.parse(response)
    };
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