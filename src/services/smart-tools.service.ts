import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class SmartToolsService {
  
  /**
   * Stream AI response using Server-Sent Events
   */
  async streamResponse(message: string, subject?: string, grade?: string, res?: Response) {
    console.log('🤖 AI Response streaming started');
    console.log('   Message:', message);
    console.log('   Subject:', subject);
    console.log('   Grade:', grade);

    // Simulate AI response with streaming
    const responseWords = [
      'Merhaba!', 'Size', 'yardımcı', 'olabilirim.', 
      'Matematik', 'konusunda', 'hangi', 'sorunuz', 'var?',
      '12.', 'sınıf', 'matematik', 'konuları', 'hakkında',
      'detaylı', 'bilgi', 'verebilirim.', 'Türev', 've',
      'integral', 'konularında', 'yardıma', 'ihtiyacınız', 'var mı?'
    ];

    let wordIndex = 0;
    
    const sendWord = () => {
      if (wordIndex < responseWords.length) {
        const word = responseWords[wordIndex];
        
        // Send text chunk
        res?.write(`data: ${JSON.stringify({
          type: 'TEXT_CHUNK',
          content: word + ' '
        })}\n\n`);
        
        wordIndex++;
        
        // Send next word after a delay
        setTimeout(sendWord, 150);
      } else {
        // Send metadata with follow-up questions
        res?.write(`data: ${JSON.stringify({
          type: 'METADATA_CHUNK',
          content: {
            followUpQuestions: [
              'Hangi matematik konusunda yardım istiyorsunuz?',
              'Türev konusunda sorunuz var mı?',
              'İntegral konusunu anlamakta zorlanıyor musunuz?',
              'Limit konusunda yardıma ihtiyacınız var mı?'
            ]
          }
        })}\n\n`);
        
        // End the stream
        res?.write(`data: ${JSON.stringify({
          type: 'STATUS',
          content: 'Yanıt tamamlandı'
        })}\n\n`);
        
        res?.end();
      }
    };

    // Start sending words after a short delay
    setTimeout(sendWord, 500);
  }

  /**
   * Generate non-streaming AI response
   */
  async generateResponse(message: string, subject?: string, grade?: string) {
    console.log('🤖 AI Response generation started');
    console.log('   Message:', message);
    console.log('   Subject:', subject);
    console.log('   Grade:', grade);

    // Simulate AI response
    const response = `Merhaba! ${subject || 'Matematik'} konusunda size yardımcı olabilirim. ${grade || '12. sınıf'} seviyesinde hangi konuda sorunuz var? Türev, integral, limit gibi konularda detaylı açıklama yapabilirim.`;

    return {
      message: response,
      subject: subject,
      grade: grade,
      timestamp: new Date().toISOString()
    };
  }
} 