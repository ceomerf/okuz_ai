import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  async startAssessment(userId: string, assessmentData: { subjects: string[]; grade: number; learningGoals: string[] }) {
    const existingAssessment = await this.prisma.assessment.findFirst({
      where: { userId, status: 'IN_PROGRESS' },
    });

    if (existingAssessment) {
      throw new BadRequestException('Assessment already in progress');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        userId,
        type: 'DIAGNOSTIC',
        title: 'Initial Learning Assessment',
        description: 'Comprehensive assessment to determine learning needs',
        subjects: assessmentData.subjects,
        grade: assessmentData.grade,
        learningGoals: assessmentData.learningGoals,
        status: 'IN_PROGRESS',
        scheduledDate: new Date(),
        duration: 60, // 60 minutes
      },
    });

    return {
      assessmentId: assessment.id,
      message: 'Assessment started successfully',
      estimatedDuration: '60 minutes',
      subjects: assessmentData.subjects,
    };
  }

  async getAssessmentStatus(userId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!assessment) {
      return {
        hasAssessment: false,
        message: 'No assessment found',
      };
    }

    const progress = this.calculateAssessmentProgress(assessment);
    const recommendations = this.generateAssessmentRecommendations(assessment);

    return {
      hasAssessment: true,
      assessment: {
        id: assessment.id,
        type: assessment.type,
        status: assessment.status,
        progress,
        subjects: assessment.subjects,
        grade: assessment.grade,
        learningGoals: assessment.learningGoals,
        recommendations,
      },
    };
  }

  private calculateAssessmentProgress(assessment: any) {
    const statusMap = {
      'NOT_STARTED': 0,
      'IN_PROGRESS': 50,
      'COMPLETED': 100,
    };

    return statusMap[assessment.status as keyof typeof statusMap] || 0;
  }

  private generateAssessmentRecommendations(assessment: any) {
    const recommendations: string[] = [];
    
    if (assessment.status === 'IN_PROGRESS') {
      recommendations.push('Complete the assessment to get personalized study recommendations.');
    } else if (assessment.status === 'COMPLETED') {
      recommendations.push('Review your assessment results to understand your learning needs.');
      recommendations.push('Use the assessment data to create a personalized study plan.');
    }

    return recommendations;
  }

  async getYksSubjectRecommendations(track?: string) {
    const recommendations = {
      'SAY': ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
      'EA': ['Matematik', 'Türkçe', 'Tarih', 'Coğrafya'],
      'SÖZ': ['Türkçe', 'Tarih', 'Coğrafya', 'Felsefe'],
      'DİL': ['Türkçe', 'İngilizce', 'Almanca', 'Fransızca'],
    };

    if (track && recommendations[track as keyof typeof recommendations]) {
      return recommendations[track as keyof typeof recommendations];
    }

    return Object.values(recommendations).flat();
  }

  async getMebTopics(subject?: string, grade?: string) {
    const where: any = {};
    
    if (subject) {
      where.subject = subject;
    }
    
    if (grade) {
      where.grade = parseInt(grade);
    }

    const topics = await this.prisma.topic.findMany({
      where,
      select: {
        topic: true,
        subject: true,
        grade: true,
        month: true,
        outcomes: true,
      },
      orderBy: [
        { subject: 'asc' },
        { grade: 'asc' },
        { month: 'asc' },
      ],
    });

    return topics.map(topic => ({
      topic: topic.topic,
      subject: topic.subject,
      grade: topic.grade,
      month: topic.month,
      outcomes: topic.outcomes,
    }));
  }
}
