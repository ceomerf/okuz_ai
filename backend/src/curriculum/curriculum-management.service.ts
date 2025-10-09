import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CurriculumManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurriculums(options: {
    page: number;
    limit: number;
    subject?: string;
    grade?: number;
    search?: string;
  }) {
    const { page, limit, subject, grade, search } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (subject) {
      where.subject = subject;
    }

    if (grade) {
      where.grade = grade;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const curriculums = await this.prisma.curriculum.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const total = await this.prisma.curriculum.count({ where });

      return {
        success: true,
        data: {
          curriculums,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Müfredatlar getirilemedi');
    }
  }

  async getCurriculumById(id: string) {
    try {
      const curriculum = await this.prisma.curriculum.findUnique({
        where: { id },
      });

      if (!curriculum) {
        throw new NotFoundException('Müfredat bulunamadı');
      }

      return {
        success: true,
        data: curriculum,
      };
    } catch (error) {
      throw new BadRequestException('Müfredat detayları getirilemedi');
    }
  }

  async createCurriculum(createData: {
    name: string;
    subject: string;
    grade: number;
    topics: any;
    description?: string;
  }) {
    try {
      const curriculum = await this.prisma.curriculum.create({
        data: {
          name: createData.name,
          subject: createData.subject,
          grade: createData.grade,
          topics: createData.topics,
          description: createData.description,
        },
      });

      return {
        success: true,
        message: 'Müfredat başarıyla oluşturuldu',
        data: curriculum,
      };
    } catch (error) {
      throw new BadRequestException('Müfredat oluşturulamadı');
    }
  }

  async updateCurriculum(id: string, updateData: {
    subject?: string;
    topic?: string;
    grade?: number;
    description?: string;
    month?: number;
    outcomes?: string[];
    tytWeight?: number;
    aytWeight?: number;
  }) {
    try {
      const curriculum = await this.prisma.curriculum.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        message: 'Müfredat başarıyla güncellendi',
        data: curriculum,
      };
    } catch (error) {
      throw new BadRequestException('Müfredat güncellenemedi');
    }
  }

  async deleteCurriculum(id: string) {
    try {
      await this.prisma.curriculum.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Müfredat başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Müfredat silinemedi');
    }
  }

  async getCurriculumTree(id: string) {
    try {
      const curriculum = await this.prisma.curriculum.findUnique({
        where: { id },
      });

      if (!curriculum) {
        throw new NotFoundException('Müfredat bulunamadı');
      }

      // Mock tree structure
      const tree = {
        id: curriculum.id,
        name: curriculum.name,
        subject: curriculum.subject,
        topics: curriculum.topics,
        grade: curriculum.grade,
        children: [
          {
            id: 'topic_1',
            name: 'Temel Kavramlar',
            level: 1,
            children: [
              { id: 'subtopic_1', name: 'Kavram Tanımları', level: 2 },
              { id: 'subtopic_2', name: 'Örnekler', level: 2 },
            ],
          },
          {
            id: 'topic_2',
            name: 'Uygulamalar',
            level: 1,
            children: [
              { id: 'subtopic_3', name: 'Pratik Örnekler', level: 2 },
              { id: 'subtopic_4', name: 'Alıştırmalar', level: 2 },
            ],
          },
        ],
      };

      return {
        success: true,
        data: tree,
      };
    } catch (error) {
      throw new BadRequestException('Müfredat ağacı getirilemedi');
    }
  }

  async createTopic(createData: {
    name: string;
    subject: string;
    grade: number;
    topics: any;
    description?: string;
  }) {
    try {
      const topic = await this.prisma.curriculum.create({
        data: {
          name: createData.name,
          subject: createData.subject,
          grade: createData.grade,
          topics: createData.topics,
          description: createData.description,
        },
      });

      return {
        success: true,
        message: 'Konu başarıyla oluşturuldu',
        data: topic,
      };
    } catch (error) {
      throw new BadRequestException('Konu oluşturulamadı');
    }
  }

  async updateTopic(id: string, updateData: {
    subject?: string;
    topic?: string;
    grade?: number;
    description?: string;
    month?: number;
    outcomes?: string[];
    tytWeight?: number;
    aytWeight?: number;
  }) {
    try {
      const topic = await this.prisma.curriculum.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        message: 'Konu başarıyla güncellendi',
        data: topic,
      };
    } catch (error) {
      throw new BadRequestException('Konu güncellenemedi');
    }
  }

  async deleteTopic(id: string) {
    try {
      await this.prisma.curriculum.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Konu başarıyla silindi',
      };
    } catch (error) {
      throw new BadRequestException('Konu silinemedi');
    }
  }

  async moveTopic(id: string, moveData: {
    newSubject?: string;
    newGrade?: number;
  }) {
    try {
      const topic = await this.prisma.curriculum.update({
        where: { id },
        data: {
          subject: moveData.newSubject,
          grade: moveData.newGrade,
        },
      });

      return {
        success: true,
        message: 'Konu başarıyla taşındı',
        data: topic,
      };
    } catch (error) {
      throw new BadRequestException('Konu taşınamadı');
    }
  }

  async getCurriculumTemplates() {
    try {
      const templates = [
        {
          id: 'template_1',
          name: 'Matematik 12. Sınıf',
          description: '12. sınıf matematik müfredatı',
          subject: 'Matematik',
          grade: 12,
          topics: 25,
        },
        {
          id: 'template_2',
          name: 'Fizik 11. Sınıf',
          description: '11. sınıf fizik müfredatı',
          subject: 'Fizik',
          grade: 11,
          topics: 20,
        },
      ];

      return {
        success: true,
        data: templates,
      };
    } catch (error) {
      throw new BadRequestException('Müfredat şablonları getirilemedi');
    }
  }

  async getFields() {
    try {
      const fields = [
        { id: 'matematik', name: 'Matematik', description: 'Matematik alanı' },
        { id: 'fizik', name: 'Fizik', description: 'Fizik alanı' },
        { id: 'kimya', name: 'Kimya', description: 'Kimya alanı' },
        { id: 'biyoloji', name: 'Biyoloji', description: 'Biyoloji alanı' },
        { id: 'turkce', name: 'Türkçe', description: 'Türkçe alanı' },
        { id: 'tarih', name: 'Tarih', description: 'Tarih alanı' },
        { id: 'cografya', name: 'Coğrafya', description: 'Coğrafya alanı' },
      ];

      return {
        success: true,
        data: fields,
      };
    } catch (error) {
      throw new BadRequestException('Alanlar getirilemedi');
    }
  }
}