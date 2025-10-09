import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CoachingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSmartCoaching(userId: string) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        studySessions: {
          where: { isCompleted: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user?.studentProfile) {
      return {
        message: 'Complete your profile to get personalized coaching',
        recommendations: ['Complete your student profile', 'Take an assessment'],
      };
    }

    const progressOverview = await this.calculateProgressOverview(user.studySessions);
    const motivationMessages = this.generateMotivationMessages(progressOverview.averageScore, progressOverview.completionRate);
    const personalizedAdvice = this.generatePersonalizedAdvice(user.studentProfile, progressOverview, user.studySessions);
    const goalRecommendations = this.generateGoalRecommendations(user.studentProfile, progressOverview);

    return {
      motivation: motivationMessages,
      advice: personalizedAdvice,
      goals: goalRecommendations,
      progress: progressOverview,
      nextSteps: this.generateNextSteps(progressOverview),
    };
  }

  private async calculateProgressOverview(sessions: any[]) {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.isCompleted).length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    
    const scores = sessions.map(s => s.performance).filter(s => s !== null && s !== undefined);
    const averageScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    
    const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    
    return {
      totalSessions,
      completedSessions,
      completionRate,
      averageScore,
      totalStudyTime,
    };
  }

  private generateMotivationMessages(averageScore: number, completionRate: number): string[] {
    const messages: string[] = [];
    
    if (averageScore >= 85) {
      messages.push('🎉 Excellent work! You\'re performing at a high level.');
      messages.push('Keep up the great momentum!');
    } else if (averageScore >= 70) {
      messages.push('👍 Good progress! You\'re on the right track.');
      messages.push('A little more practice will help you reach your goals.');
    } else if (averageScore >= 50) {
      messages.push('💪 You\'re making progress! Every step counts.');
      messages.push('Focus on understanding the basics before moving forward.');
    } else {
      messages.push('🌟 Don\'t give up! Every expert was once a beginner.');
      messages.push('Take it step by step, and you\'ll see improvement.');
    }

    if (completionRate >= 80) {
      messages.push('📅 Great consistency! Your study schedule is working well.');
    } else if (completionRate >= 50) {
      messages.push('📚 Good effort! Try to maintain a more regular schedule.');
    } else {
      messages.push('⏰ Consider setting a more consistent study routine.');
    }

    return messages;
  }

  private generatePersonalizedAdvice(profile: any, progressOverview: any, recentSessions: any[]): string[] {
    const advice: string[] = [];
    
    // Learning style based advice
    const learningStyle = profile.learningStyle || 'visual';
    switch (learningStyle) {
      case 'visual':
        advice.push('Use diagrams, charts, and color coding to enhance your learning.');
        advice.push('Create mind maps to organize information visually.');
        break;
      case 'auditory':
        advice.push('Try reading aloud or explaining concepts to yourself.');
        advice.push('Consider joining study groups for discussion.');
        break;
      case 'kinesthetic':
        advice.push('Use hands-on activities and experiments when possible.');
        advice.push('Take breaks to move around during study sessions.');
        break;
      case 'reading':
        advice.push('Take detailed notes and create comprehensive summaries.');
        advice.push('Read additional materials to deepen your understanding.');
        break;
    }

    // Performance based advice
    if (progressOverview.averageScore < 70) {
      advice.push('Focus on understanding concepts before attempting practice problems.');
      advice.push('Consider reviewing previous topics to strengthen your foundation.');
    }

    // Consistency based advice
    if (progressOverview.completionRate < 60) {
      advice.push('Set specific study times and stick to them.');
      advice.push('Break down large tasks into smaller, manageable chunks.');
    }

    return advice;
  }

  private generateGoalRecommendations(profile: any, progressOverview: any): string[] {
    const goals: string[] = [];
    
    if (progressOverview.averageScore < 70) {
      goals.push('Improve understanding of fundamental concepts');
      goals.push('Increase study session consistency');
    } else if (progressOverview.averageScore < 85) {
      goals.push('Maintain current performance level');
      goals.push('Challenge yourself with more difficult problems');
    } else {
      goals.push('Help peers with their studies');
      goals.push('Explore advanced topics in your field');
    }

    if (progressOverview.completionRate < 80) {
      goals.push('Establish a regular study routine');
      goals.push('Complete at least 80% of planned sessions');
    }

    return goals;
  }

  private generateNextSteps(progressOverview: any): string[] {
    const steps: string[] = [];
    
    if (progressOverview.completionRate < 50) {
      steps.push('Set up a daily study schedule');
      steps.push('Start with shorter, more manageable sessions');
    } else if (progressOverview.completionRate < 80) {
      steps.push('Increase session frequency gradually');
      steps.push('Track your progress weekly');
    } else {
      steps.push('Maintain your current routine');
      steps.push('Consider adding more challenging content');
    }

    if (progressOverview.averageScore < 60) {
      steps.push('Review basic concepts in weak subjects');
      steps.push('Seek help from teachers or tutors');
    } else if (progressOverview.averageScore < 80) {
      steps.push('Practice more problems in your weak areas');
      steps.push('Focus on understanding rather than memorizing');
    } else {
      steps.push('Challenge yourself with advanced topics');
      steps.push('Consider teaching others to reinforce learning');
    }

    return steps;
  }
}
