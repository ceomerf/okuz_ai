import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';

let genAI: GoogleGenerativeAI | null = null;

export const initializeGemini = () => {
  if (genAI) {
    return genAI;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    logger.error('❌ GOOGLE_GENERATIVE_AI_API_KEY environment variable eksik');
    throw new Error('Gemini API key not configured');
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    logger.info('✅ Google Gemini AI başarıyla başlatıldı');
    return genAI;
  } catch (error) {
    logger.error('❌ Gemini AI başlatılamadı:', error);
    throw new Error('Gemini initialization failed');
  }
};

export const getGenAI = () => {
  if (!genAI) {
    return initializeGemini();
  }
  return genAI;
};

/**
 * Gemini API çağrısı yapan yardımcı fonksiyon
 */
export const callGeminiAPI = async (prompt: string, model: string = "gemini-2.0-flash"): Promise<string> => {
  try {
    const geminiAI = getGenAI();
    const aiModel = geminiAI.getGenerativeModel({ model });
    
    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    logger.info(`✅ Gemini API çağrısı başarılı (${text.length} karakter)`);
    return text;
  } catch (error) {
    logger.error('❌ Gemini API hatası:', error);
    throw new Error('AI servisi kullanılamıyor');
  }
};

/**
 * JSON response'u parse eden yardımcı fonksiyon
 */
export const parseGeminiJSON = (text: string): any => {
  try {
    // JSON markdown bloklarını temizle
    const cleanedText = text.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    logger.error('❌ Gemini JSON parse hatası:', error);
    logger.error('Raw text:', text.substring(0, 500));
    throw new Error('AI yanıtı işlenirken hata oluştu');
  }
}; 