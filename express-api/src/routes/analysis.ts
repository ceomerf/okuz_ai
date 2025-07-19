import { Router, Request, Response } from 'express';
import { authenticateToken } from '../utils/auth';
import { asyncHandler } from '../utils/errorHandler';
import { HttpError } from '../utils/errorHandler';
import { db } from '../utils/firebase';
import { callGeminiAPI, parseGeminiJSON } from '../utils/gemini';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, ApiResponse } from '../types';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = Router();

/**
 * POST /api/v1/analysis/processAndStructureText
 * Metin işleme ve yapılandırma (Web scraping + AI analizi)
 */
router.post('/processAndStructureText', authenticateToken, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.uid;
  const { text, url, analysisType = 'summary' } = req.body;

  if (!text && !url) {
    throw new HttpError('text veya url parametresi gereklidir', 400);
  }

  try {
    logger.info(`🔍 Metin işleme başladı - User: ${userId}, Type: ${analysisType}`);

    let contentToProcess = text;

    // Eğer URL verilmişse web scraping yap
    if (url && !text) {
      try {
        logger.info(`🌐 Web scraping başladı: ${url}`);
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const $ = cheerio.load(response.data);
        
        // Çeşitli article selectors dene
        const selectors = [
          'article',
          '.article-content',
          '.post-content',
          '.entry-content',
          'main',
          '.content',
          '[role="main"]'
        ];

        let extractedText = '';
        for (const selector of selectors) {
          const element = $(selector);
          if (element.length > 0) {
            // Gereksiz elementleri kaldır
            element.find('script, style, nav, header, footer, aside, .advertisement, .ads, .menu, .sidebar').remove();
            extractedText = element.text().trim();
            if (extractedText.length > 500) break;
          }
        }

        // Eğer hiçbir makale bulunamazsa body'den al
        if (extractedText.length < 500) {
          $('script, style, nav, header, footer, aside, .advertisement, .ads, .menu, .sidebar').remove();
          extractedText = $('body').text().trim();
        }

        if (extractedText.length < 100) {
          throw new Error('URL\'den yeterli metin çıkarılamadı');
        }

        contentToProcess = extractedText;
        logger.info(`✅ Web scraping tamamlandı: ${extractedText.length} karakter`);
        
      } catch (error) {
        logger.error('❌ Web scraping hatası:', error);
        throw new HttpError('Web sayfasından metin çıkarılamadı. Lütfen metni manuel olarak yapıştırın.', 400);
      }
    }

    // AI ile analiz et
    const prompt = `
Sen bir eğitim uzmanısın. Aşağıdaki metni analiz et ve yapılandır.

METIN:
${contentToProcess}

ANALİZ TİPİ: ${analysisType}

Aşağıdaki JSON formatında yanıt ver:

{
  "summary": {
    "title": "Metnin ana başlığı",
    "mainPoints": ["Ana nokta 1", "Ana nokta 2", "Ana nokta 3"],
    "briefSummary": "Kısa özet (2-3 cümle)",
    "detailedSummary": "Detaylı özet",
    "keyTerms": ["Anahtar terim 1", "Anahtar terim 2"]
  },
  "conceptMap": {
    "centralConcept": "Ana kavram",
    "relatedConcepts": [
      {
        "concept": "İlişkili kavram 1",
        "relationship": "İlişki türü",
        "importance": 8
      }
    ],
    "connections": [
      {
        "from": "Kavram A",
        "to": "Kavram B",
        "relationshipType": "causes|enables|requires|includes"
      }
    ]
  },
  "studyGuide": {
    "learningObjectives": ["Öğrenme hedefi 1", "Öğrenme hedefi 2"],
    "keyQuestions": ["Soru 1", "Soru 2"],
    "practiceActivities": ["Aktivite 1", "Aktivite 2"],
    "additionalResources": ["Kaynak önerisi 1", "Kaynak önerisi 2"]
  },
  "difficulty": "beginner|intermediate|advanced",
  "estimatedReadingTime": 15,
  "wordCount": ${contentToProcess.split(' ').length}
}

Önemli: Sadece JSON döndür, başka hiçbir metin ekleme.
`;

    const aiResponse = await callGeminiAPI(prompt);
    const parsedResult = parseGeminiJSON(aiResponse);

    // Sonucu validate et
    if (!parsedResult.summary || !parsedResult.conceptMap) {
      throw new HttpError('AI yanıtı beklenen formatı içermiyor', 500);
    }

    // Sonucu kullanıcı için kaydet (opsiyonel)
    if (analysisType === 'summary') {
      const analysisRef = db.collection(`users/${userId}/text_analyses`);
      await analysisRef.add({
        sourceType: url ? 'url' : 'text',
        sourceUrl: url || null,
        originalLength: contentToProcess.length,
        analysis: parsedResult,
        createdAt: new Date(),
        userId
      });
    }

    logger.info(`✅ Metin analizi tamamlandı - User: ${userId}`);

    const response: ApiResponse = {
      success: true,
      data: {
        ...parsedResult,
        sourceType: url ? 'url' : 'text',
        sourceUrl: url || null,
        analysisType
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Metin işleme hatası:', error);
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(`Metin işleme sırasında hata oluştu: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/analysis/generateTopicMap
 * Bir ders için konu haritası oluşturur
 */
router.post('/generateTopicMap', authenticateToken, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.uid;
  const { subject } = req.body;

  if (!subject) {
    throw new HttpError('subject parametresi gereklidir', 400);
  }

  try {
    logger.info(`🗺️ Konu haritası oluşturuluyor - User: ${userId}, Subject: ${subject}`);

    // Önce kullanıcının profil bilgilerini al
    const profileDoc = await db.doc(`users/${userId}/privateProfile/profile`).get();
    
    if (!profileDoc.exists) {
      throw new HttpError('Kullanıcı profili bulunamadı', 404);
    }

    const profile = profileDoc.data();
    const { grade } = profile;

    // AI'a konu haritası oluşturma isteği gönder
    const topicMapPrompt = `
Sen bir eğitim uzmanısın. ${grade}. sınıf ${subject} dersi için bir konu haritası oluştur. 
Bu harita, konular arasındaki ilişkileri ve bağlantıları göstermelidir.

Lütfen aşağıdaki formatta bir JSON nesnesi döndür:

{
  "subject": "${subject}",
  "grade": "${grade}",
  "nodes": [
    {
      "id": "node1",
      "topic": "Konu adı",
      "subject": "${subject}",
      "description": "Konu açıklaması",
      "importance": 0.8,
      "status": "not_started",
      "mastery": 0.0,
      "connectedTopics": ["node2", "node3"]
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "sourceId": "node1",
      "targetId": "node2",
      "relationshipType": "prerequisite",
      "strength": 0.9,
      "description": "Bağlantı açıklaması"
    }
  ]
}
`;

    const aiResponse = await callGeminiAPI(topicMapPrompt);
    const topicMap = parseGeminiJSON(aiResponse);

    // Konu haritasını kullanıcı için kaydet
    const topicMapRef = db.collection(`users/${userId}/topic_maps`);
    const mapDoc = await topicMapRef.add({
      ...topicMap,
      userId,
      createdAt: new Date(),
      lastUpdated: new Date()
    });

    logger.info(`✅ Konu haritası oluşturuldu - User: ${userId}, MapId: ${mapDoc.id}`);

    const response: ApiResponse = {
      success: true,
      data: {
        mapId: mapDoc.id,
        ...topicMap
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Konu haritası oluşturma hatası:', error);
    throw new HttpError(`Konu haritası oluşturulamadı: ${error.message}`, 500);
  }
}));

/**
 * POST /api/v1/analysis/generateTopicConnection
 * Belirli bir konu için bağlantı analizi oluşturur
 */
router.post('/generateTopicConnection', authenticateToken, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.uid;
  const { subject, topic } = req.body;

  if (!subject || !topic) {
    throw new HttpError('subject ve topic parametreleri gereklidir', 400);
  }

  try {
    logger.info(`🔗 Konu bağlantısı oluşturuluyor - User: ${userId}, Topic: ${subject} - ${topic}`);

    // Kullanıcı profil bilgilerini al
    const profileDoc = await db.doc(`users/${userId}/privateProfile/profile`).get();
    
    if (!profileDoc.exists) {
      throw new HttpError('Kullanıcı profili bulunamadı', 404);
    }

    const profile = profileDoc.data();
    const { grade } = profile;

    // AI'a konu bağlantısı oluşturma isteği gönder
    const topicConnectionPrompt = `
Sen bir eğitim uzmanısın. ${grade}. sınıf ${subject} dersinde "${topic}" konusu için bir konu bağlantısı oluştur.
Bu bağlantı, bu konunun öncül ve ardıl konularını, ayrıca ilişkili konuları göstermelidir.

Lütfen aşağıdaki formatta bir JSON nesnesi döndür:

{
  "subject": "${subject}",
  "topic": "${topic}",
  "description": "Konu açıklaması",
  "prerequisites": ["Öncül konu 1", "Öncül konu 2"],
  "followups": ["Ardıl konu 1", "Ardıl konu 2"],
  "relatedTopics": ["İlişkili konu 1", "İlişkili konu 2"],
  "topicImportance": {
    "Öncül konu 1": 0.8,
    "Ardıl konu 1": 0.9
  },
  "difficulty": "beginner|intermediate|advanced",
  "estimatedStudyTime": 120
}
`;

    const aiResponse = await callGeminiAPI(topicConnectionPrompt);
    const topicConnection = parseGeminiJSON(aiResponse);

    // Konu bağlantısını kullanıcı için kaydet
    const connectionRef = db.collection(`users/${userId}/topic_connections`);
    const connectionDoc = await connectionRef.add({
      ...topicConnection,
      userId,
      createdAt: new Date()
    });

    logger.info(`✅ Konu bağlantısı oluşturuldu - User: ${userId}, ConnectionId: ${connectionDoc.id}`);

    const response: ApiResponse = {
      success: true,
      data: {
        connectionId: connectionDoc.id,
        ...topicConnection
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('❌ Konu bağlantısı oluşturma hatası:', error);
    throw new HttpError(`Konu bağlantısı oluşturulamadı: ${error.message}`, 500);
  }
}));

export default router; 