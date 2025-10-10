import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

interface QueryPattern {
  pattern: RegExp;
  sqlTemplate: string;
  description: string;
}

@Injectable()
export class NlpService {
  constructor(private prisma: PrismaService) {}

  private readonly queryPatterns: QueryPattern[] = [
    // Öğrenci sayısı sorguları
    {
      pattern: /(toplam|kaç|kaç tane).*öğrenci/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\'',
      description: 'Toplam öğrenci sayısı'
    },
    {
      pattern: /(aktif|son.*gün|giriş).*öğrenci/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\' AND "lastActiveAt" > NOW() - INTERVAL \'30 days\'',
      description: 'Aktif öğrenci sayısı'
    },
    {
      pattern: /(yeni|son.*ay|kayıt).*öğrenci/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\' AND "createdAt" > NOW() - INTERVAL \'30 days\'',
      description: 'Son 30 günde kayıt olan öğrenci sayısı'
    },

    // Sınıf bazlı sorgular
    {
      pattern: /(\d+)\.?\s*sınıf.*öğrenci/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\' AND grade = $1',
      description: 'Belirli sınıftaki öğrenci sayısı'
    },
    {
      pattern: /sınıf.*dağılım|sınıflara.*göre/i,
      sqlTemplate: 'SELECT grade, COUNT(*) as count FROM "User" WHERE role = \'STUDENT\' AND grade IS NOT NULL GROUP BY grade ORDER BY grade',
      description: 'Sınıflara göre öğrenci dağılımı'
    },

    // Not ortalaması sorguları
    {
      pattern: /(yüksek|düşük).*not|not.*(yüksek|düşük)/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\' AND gpa > 3.5',
      description: 'Yüksek not ortalamasına sahip öğrenci sayısı'
    },
    {
      pattern: /(düşük|kötü).*not|not.*(düşük|kötü)/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\' AND gpa < 2.0',
      description: 'Düşük not ortalamasına sahip öğrenci sayısı'
    },

    // Öğretmen sorguları
    {
      pattern: /(toplam|kaç).*öğretmen/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'TEACHER\'',
      description: 'Toplam öğretmen sayısı'
    },
    {
      pattern: /(aktif|son.*gün|giriş).*öğretmen/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'TEACHER\' AND "lastActiveAt" > NOW() - INTERVAL \'30 days\'',
      description: 'Aktif öğretmen sayısı'
    },

    // Veli sorguları
    {
      pattern: /(toplam|kaç).*veli/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'PARENT\'',
      description: 'Toplam veli sayısı'
    },

    // Kurs sorguları
    {
      pattern: /(toplam|kaç).*kurs/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "Course"',
      description: 'Toplam kurs sayısı'
    },
    {
      pattern: /(aktif|açık).*kurs/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "Course" WHERE isActive = true',
      description: 'Aktif kurs sayısı'
    },

    // Zaman bazlı sorgular
    {
      pattern: /(bu.*ay|bu.*hafta|son.*ay|son.*hafta).*kayıt/i,
      sqlTemplate: 'SELECT COUNT(*) as total FROM "User" WHERE "createdAt" > NOW() - INTERVAL \'30 days\'',
      description: 'Son 30 günde kayıt olan kullanıcı sayısı'
    },
    {
      pattern: /(aylık|haftalık).*kayıt/i,
      sqlTemplate: 'SELECT DATE_TRUNC(\'month\', "createdAt") as month, COUNT(*) as count FROM "User" WHERE "createdAt" > NOW() - INTERVAL \'12 months\' GROUP BY DATE_TRUNC(\'month\', "createdAt") ORDER BY month',
      description: 'Aylık kayıt sayıları'
    },

    // Genel istatistikler
    {
      pattern: /(genel|toplam|özet).*istatistik/i,
      sqlTemplate: 'SELECT role, COUNT(*) as count FROM "User" GROUP BY role',
      description: 'Kullanıcı rolleri dağılımı'
    },
  ];

  async processNaturalLanguageQuery(query: string): Promise<{
    success: boolean;
    sql: string;
    description: string;
    data?: any;
    error?: string;
  }> {
    try {
      // Query'yi temizle ve normalize et
      const cleanQuery = query.trim().toLowerCase();
      
      // Pattern matching
      for (const pattern of this.queryPatterns) {
        const match = cleanQuery.match(pattern.pattern);
        if (match) {
          let sql = pattern.sqlTemplate;
          
          // Eğer pattern'de capture group varsa, değerleri SQL'e ekle
          if (match.length > 1) {
            const grade = match[1];
            if (grade && !isNaN(Number(grade))) {
              sql = sql.replace('$1', grade);
            }
          }

          // SQL'i çalıştır
          const result = await this.executeQuery(sql);
          
          return {
            success: true,
            sql,
            description: pattern.description,
            data: result,
          };
        }
      }

      // Eğer hiçbir pattern eşleşmezse, genel arama yap
      return await this.performGeneralSearch(query);

    } catch (error) {
      return {
        success: false,
        sql: '',
        description: '',
        error: `Sorgu işlenirken hata oluştu: ${(error as Error).message}`,
      };
    }
  }

  private async performGeneralSearch(query: string): Promise<{
    success: boolean;
    sql: string;
    description: string;
    data?: any;
    error?: string;
  }> {
    // Basit anahtar kelime araması
    const keywords = query.toLowerCase().split(' ');
    
    if (keywords.includes('öğrenci') || keywords.includes('student')) {
      return {
        success: true,
        sql: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\'',
        description: 'Öğrenci sayısı',
        data: await this.executeQuery('SELECT COUNT(*) as total FROM "User" WHERE role = \'STUDENT\''),
      };
    }
    
    if (keywords.includes('öğretmen') || keywords.includes('teacher')) {
      return {
        success: true,
        sql: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'TEACHER\'',
        description: 'Öğretmen sayısı',
        data: await this.executeQuery('SELECT COUNT(*) as total FROM "User" WHERE role = \'TEACHER\''),
      };
    }
    
    if (keywords.includes('veli') || keywords.includes('parent')) {
      return {
        success: true,
        sql: 'SELECT COUNT(*) as total FROM "User" WHERE role = \'PARENT\'',
        description: 'Veli sayısı',
        data: await this.executeQuery('SELECT COUNT(*) as total FROM "User" WHERE role = \'PARENT\''),
      };
    }

    return {
      success: false,
      sql: '',
      description: '',
      error: 'Sorgunuz anlaşılamadı. Lütfen daha spesifik bir soru sorun.',
    };
  }

  private async executeQuery(sql: string): Promise<any> {
    try {
      const result = await (this.prisma as any).$queryRawUnsafe(sql);
      return result;
    } catch (error) {
      throw new Error(`SQL çalıştırma hatası: ${(error as Error).message}`);
    }
  }

  async getSearchSuggestions(): Promise<{
    success: boolean;
    data: string[];
  }> {
    const suggestions = [
      'Toplam kaç öğrenci var?',
      'Aktif öğrenci sayısı nedir?',
      'Son ay kaç öğrenci kayıt oldu?',
      '9. sınıfta kaç öğrenci var?',
      'Sınıflara göre öğrenci dağılımı',
      'Yüksek not ortalamasına sahip öğrenciler',
      'Toplam kaç öğretmen var?',
      'Aktif öğretmen sayısı',
      'Toplam kaç veli var?',
      'Toplam kaç kurs var?',
      'Aktif kurs sayısı',
      'Bu ay kaç kayıt oldu?',
      'Aylık kayıt sayıları',
      'Genel istatistikler',
    ];

    return {
      success: true,
      data: suggestions,
    };
  }

  async getQueryHistory(userId: string): Promise<{
    success: boolean;
    data: any[];
  }> {
    // Gelecekte query history tablosu eklenebilir
    return {
      success: true,
      data: [],
    };
  }
}
