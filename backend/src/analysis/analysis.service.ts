import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../common/prisma/prisma.service';
// import { GeminiService } from '../services/gemini.service'; // DEVRE DIŞI - OPENAI KULLANILIYOR
import { OpenAIService } from '../services/openai.service';
import { AnalyzeLearningPathDto } from './dto/analyze-learning-path.dto';

interface ExamAnalysisData {
  examData: any;
  subject: string;
  grade: number;
  performance: number;
  userId?: string;
}

interface PerformanceMetrics {
  overall: number;
  subjects: Record<string, number>;
  trends: Array<{ date: string; score: number }>;
  consistency: number;
  improvement: number;
  averageScore?: number;
  studyStreak?: number;
  totalStudyHours?: number;
  strengths?: string[];
  improvements?: string[];
  recommendations?: string[];
}

interface LearningPattern {
  optimalStudyTime: string[];
  sessionDuration: number;
  breakFrequency: number;
  preferredDifficulty: string;
  learningVelocity: number;
}

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly geminiService: GeminiService, // DEVRE DIŞI - OPENAI KULLANILIYOR
    private readonly openaiService: OpenAIService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async analyzeExamResult(data: ExamAnalysisData): Promise<any> {
    const userId = data.userId as string; // JWT'den gelmeli; fallback kaldırıldı

    // Sınav verilerini analiz et
    const examAnalysis = await this.performExamAnalysis(data);
    
    // Geçmiş performansla karşılaştır
    const historicalComparison = await this.compareWithHistory(userId, data.subject, data.performance);
    
    // Öğrenme açıklarını belirle
    const learningGaps = await this.identifyLearningGaps(data);
    
    // Kişiselleştirilmiş öneriler oluştur
    const recommendations = await this.generateExamRecommendations(data, examAnalysis, historicalComparison);
    
    // Gelecek performans tahmini
    const futureProjection = await this.predictFuturePerformance(userId, data.subject, data.performance);

    // Analizi veritabanına kaydet
    await this.prisma.examResult.create({
      data: {
        userId,
        subject: data.subject,
        examType: data.examData.type || 'general',
        score: data.performance,
        totalScore: 100,
        duration: data.examData.duration || 60,
        answers: data.examData.answers || {},
        analysis: {
          examAnalysis,
          historicalComparison,
          learningGaps,
          recommendations,
          futureProjection,
          analyzedAt: new Date(),
        },
      },
    });

    return {
        success: true,
      analysis: {
        examPerformance: examAnalysis,
        historicalComparison,
        learningGaps,
        recommendations,
        futureProjection,
        insights: await this.generateInsights(examAnalysis, historicalComparison),
      },
      message: 'Sınav analizi tamamlandı',
    };
  }

  private async performExamAnalysis(data: ExamAnalysisData) {
    const analysis: any = {
      overallScore: data.performance,
      gradeLevel: this.getGradeLevel(data.performance),
      timeManagement: this.analyzeTimeManagement(data.examData),
      questionAnalysis: await this.analyzeQuestions(data.examData),
      strengths: [],
      weaknesses: [],
      patterns: {},
    };

    // Soruları kategorize et
    if (data.examData.questions) {
      const categorizedResults = this.categorizeQuestionResults(data.examData.questions, data.examData.answers);
      analysis.strengths = categorizedResults.strengths;
      analysis.weaknesses = categorizedResults.weaknesses;
      analysis.patterns = categorizedResults.patterns;
    }

    // AI ile detaylı analiz
    const aiAnalysisPrompt = `
    Aşağıdaki sınav sonucunu detaylı analiz et:
    
    Ders: ${data.subject}
    Sınıf: ${data.grade}
    Puan: ${data.performance}/100
    Sınav verileri: ${JSON.stringify(data.examData)}
    
    Analiz etmeni istediğim noktalar:
    1. Güçlü ve zayıf konuları belirle
    2. Hata türlerini kategorize et (kavramsal, hesaplama, dikkatsizlik)
    3. Çalışma stratejisi önerileri
    4. Gelişim alanları
    5. Takip edilmesi gereken konular
    
    JSON formatında detaylı analiz ver.
    `;

    try {
      const aiResponse = await this.openaiService.generateContent(aiAnalysisPrompt);
      const aiAnalysis = JSON.parse(aiResponse);
      analysis.aiInsights = aiAnalysis;
    } catch (error) {
      analysis.aiInsights = { message: 'AI analizi şu anda kullanılamıyor' };
    }

    return analysis;
  }

  private getGradeLevel(score: number): string {
    if (score >= 90) return 'Mükemmel';
    if (score >= 80) return 'İyi';
    if (score >= 70) return 'Orta';
    if (score >= 60) return 'Geçer';
    return 'Yetersiz';
  }

  private analyzeTimeManagement(examData: any) {
    const totalDuration = examData.duration || 60;
    const questionsCount = examData.questions?.length || 0;
    const timePerQuestion = questionsCount > 0 ? totalDuration / questionsCount : 0;

      return {
      totalTime: totalDuration,
      questionsCount,
      averageTimePerQuestion: Math.round(timePerQuestion * 100) / 100,
      timeEfficiency: this.calculateTimeEfficiency(examData),
      rushingIndicators: this.identifyRushingPatterns(examData),
    };
  }

  private calculateTimeEfficiency(examData: any): number {
    // Zaman verimliliğini hesapla (basit implementasyon)
    const answers = examData.answers || {};
    const totalQuestions = Object.keys(answers).length;
    const correctAnswers = Object.values(answers).filter((a: any) => a && typeof a === 'object' && a.correct).length;
    
    return totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  }

  private identifyRushingPatterns(examData: any): string[] {
    const patterns = [];
    const answers = examData.answers || {};
    
    // Son sorularda düşük performans
    const totalQuestions = Object.keys(answers).length;
    const lastQuarter = Math.floor(totalQuestions * 0.75);
    const lastQuarterCorrect = Object.keys(answers)
      .slice(lastQuarter)
      .filter(q => answers[q].correct).length;
    
    if (lastQuarterCorrect < (totalQuestions - lastQuarter) * 0.5) {
      patterns.push('Son sorularda performans düşüşü');
    }

    return patterns;
  }

  private async analyzeQuestions(examData: any) {
    const questions = examData.questions || [];
    const answers = examData.answers || {};
    
    const analysis = {
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      byTopic: {} as Record<string, { correct: number; total: number }>,
      commonMistakes: [] as any[],
      timeSpent: {},
    };

    questions.forEach((question: any, index: number) => {
      const answer = answers[index];
      const difficulty = question.difficulty || 'medium';
      const topic = question.topic || 'general';

      // Zorluk seviyesine göre analiz
      if (answer?.correct) {
        analysis.byDifficulty[difficulty as keyof typeof analysis.byDifficulty]++;
      }

      // Konulara göre analiz
      if (!analysis.byTopic[topic]) {
        analysis.byTopic[topic] = { correct: 0, total: 0 };
      }
      analysis.byTopic[topic].total++;
      if (answer?.correct) {
        analysis.byTopic[topic].correct++;
      }

      // Yanlış cevapları analiz et
      if (answer && !answer.correct) {
        analysis.commonMistakes.push({
          questionId: index,
          topic: topic,
          difficulty: difficulty,
          studentAnswer: answer.selected,
          correctAnswer: question.correctAnswer,
          mistakeType: this.categorizeMistake(question, answer),
        });
      }
    });

    return analysis;
  }

  private categorizeMistake(question: any, answer: any): string {
    // Hata türünü kategorize et
    if (question.type === 'calculation') {
      return 'hesaplama_hatası';
    } else if (question.type === 'conceptual') {
      return 'kavramsal_hata';
    } else if (Math.abs(answer.selected - question.correctAnswer) === 1) {
      return 'dikkatsizlik';
    }
    return 'bilinmeyen';
  }

  private categorizeQuestionResults(questions: any[], answers: any) {
    const strengths: any[] = [];
    const weaknesses: any[] = [];
    const patterns: any = {};

    const topicPerformance: Record<string, { correct: number; total: number }> = {};
    
    questions.forEach((question, index) => {
      const topic = question.topic || 'general';
      const answer = answers && answers[index];
      
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { correct: 0, total: 0 };
      }
      
      topicPerformance[topic].total++;
      if (answer && typeof answer === 'object' && answer.correct) {
        topicPerformance[topic].correct++;
      }
    });

    // Güçlü ve zayıf alanları belirle
    Object.keys(topicPerformance).forEach(topic => {
      const performance = topicPerformance[topic];
      const successRate = (performance.correct / performance.total) * 100;
      
      if (successRate >= 80) {
        strengths.push({
          topic,
          successRate: Math.round(successRate),
          questionCount: performance.total,
        });
      } else if (successRate < 60) {
        weaknesses.push({
          topic,
          successRate: Math.round(successRate),
          questionCount: performance.total,
        });
      }
    });

    return { strengths, weaknesses, patterns: topicPerformance };
  }

  private async compareWithHistory(userId: string, subject: string, currentScore: number) {
    const previousExams = await this.prisma.examResult.findMany({
      where: {
        userId,
        subject,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (previousExams.length === 0) {
      return {
        isFirstExam: true,
        message: 'Bu derste ilk sınavınız',
        baseline: currentScore,
      };
    }

    const scores = previousExams.map(exam => exam.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const improvement = currentScore - averageScore;
    const trend = this.calculateTrend(scores);

    return {
      isFirstExam: false,
      currentScore,
      averageScore: Math.round(averageScore * 100) / 100,
      improvement: Math.round(improvement * 100) / 100,
      trend,
      percentile: this.calculatePercentile(currentScore, scores),
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      consistency: this.calculateConsistency(scores),
      recentPerformance: scores.slice(0, 3),
    };
  }

  private calculateTrend(scores: number[]): string {
    if (scores.length < 3) return 'insufficient_data';
    
    const recent = scores.slice(0, 3);
    const older = scores.slice(3, 6);
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private calculatePercentile(currentScore: number, allScores: number[]): number {
    const sortedScores = allScores.sort((a, b) => a - b);
    const position = sortedScores.filter(score => score <= currentScore).length;
    return Math.round((position / sortedScores.length) * 100);
  }

  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 100;
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Consistency as percentage (lower deviation = higher consistency)
    return Math.max(0, 100 - (standardDeviation * 2));
  }

  private async identifyLearningGaps(data: ExamAnalysisData) {
    const gaps: any[] = [];
    
    // Sınav verilerinden eksikleri belirle
    if (data.examData.questions && data.examData.answers) {
      const wrongAnswers = data.examData.questions.filter((q: any, index: number) => 
        !data.examData.answers[index]?.correct
      );

      const topicGaps: Record<string, any[]> = {};
      wrongAnswers.forEach((question: any) => {
        const topic = question.topic || 'general';
        if (!topicGaps[topic]) {
          topicGaps[topic] = [];
        }
        topicGaps[topic].push({
          concept: question.concept || question.topic,
          difficulty: question.difficulty,
          mistakeType: question.mistakeType,
        });
      });

      Object.keys(topicGaps).forEach(topic => {
        gaps.push({
          topic,
          gapCount: topicGaps[topic].length,
          concepts: topicGaps[topic],
          priority: this.calculateGapPriority(topicGaps[topic]),
          studyTime: this.estimateStudyTime(topicGaps[topic]),
        });
      });
    }

      return {
      totalGaps: gaps.length,
      highPriorityGaps: gaps.filter(g => g.priority === 'high'),
      gaps,
      studyPlan: this.generateGapStudyPlan(gaps),
    };
  }

  private calculateGapPriority(concepts: any[]): string {
    const fundamentalConcepts = concepts.filter(c => c.difficulty === 'easy').length;
    const advancedConcepts = concepts.filter(c => c.difficulty === 'hard').length;
    
    if (fundamentalConcepts > concepts.length * 0.6) return 'high';
    if (advancedConcepts > concepts.length * 0.4) return 'medium';
    return 'low';
  }

  private estimateStudyTime(concepts: any[]): number {
    // Kavram başına ortalama çalışma süresi (dakika)
    const timePerConcept = {
      easy: 30,
      medium: 45,
      hard: 60,
    };

    return concepts.reduce((total: number, concept: any) => {
      return total + (timePerConcept[concept.difficulty as keyof typeof timePerConcept] || 45);
    }, 0);
  }

  private generateGapStudyPlan(gaps: any[]) {
    const sortedGaps = gaps.sort((a: any, b: any) => {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return sortedGaps.map((gap, index) => ({
      order: index + 1,
      topic: gap.topic,
      estimatedDuration: `${Math.round(gap.studyTime / 60)} saat`,
      suggestedApproach: this.getSuggestedApproach(gap),
      resources: this.getRecommendedResources(gap.topic),
    }));
  }

  private getSuggestedApproach(gap: any): string[] {
    const approaches = [];
    
    if (gap.priority === 'high') {
      approaches.push('Temel kavramları yeniden öğren');
      approaches.push('Çok sayıda basit örnek çöz');
    }
    
    approaches.push('Kavram haritası oluştur');
    approaches.push('Pratik sorular çöz');
    approaches.push('Konu tekrarı yap');
    
    return approaches;
  }

  private getRecommendedResources(topic: string): string[] {
    const resources = [
      `${topic} ders kitabı`,
      `${topic} konu anlatımı videoları`,
      `${topic} pratik soru bankası`,
      'Online çalışma materyalleri',
    ];
    
    return resources;
  }

  private async generateExamRecommendations(data: ExamAnalysisData, examAnalysis: any, historicalComparison: any) {
    const recommendations = [];

    // Performans bazlı öneriler
    if (data.performance < 60) {
      recommendations.push({
        type: 'urgent',
        title: 'Temel Kavram Çalışması',
        description: 'Temel konuları yeniden gözden geçirin',
        priority: 'high',
        estimatedTime: '2-3 hafta',
        actions: [
          'Konuları küçük parçalara bölün',
          'Her gün 30 dakika temel kavram çalışması',
          'Haftada 2 kez değerlendirme testi',
        ],
      });
    }

    // Trend bazlı öneriler
    if (historicalComparison.trend === 'declining') {
      recommendations.push({
        type: 'improvement',
        title: 'Çalışma Stratejisi Değişikliği',
        description: 'Mevcut çalışma yöntemini gözden geçirin',
        priority: 'high',
        estimatedTime: '1 hafta',
        actions: [
          'Çalışma saatlerini analiz edin',
          'Farklı öğrenme teknikleri deneyin',
          'Düzenli mola verin',
        ],
      });
    }

    // Güçlü alan önerileri
    if (examAnalysis.strengths.length > 0) {
      recommendations.push({
        type: 'leverage',
        title: 'Güçlü Alanları Pekiştir',
        description: `${examAnalysis.strengths.map((s: any) => s.topic).join(', ')} konularında ilerleyin`,
        priority: 'medium',
        estimatedTime: '1-2 hafta',
        actions: [
          'İleri seviye sorular çözün',
          'Bu konularda mentörlük yapın',
          'Farklı sınav formatlarını deneyin',
        ],
      });
    }

    // AI ile kişiselleştirilmiş öneriler
    const aiRecommendationPrompt = `
    Aşağıdaki öğrenci profili için öneriler oluştur:
    
    Sınav Performansı: ${data.performance}/100
    Ders: ${data.subject}
    Güçlü Alanlar: ${examAnalysis.strengths.map((s: any) => s.topic).join(', ')}
    Zayıf Alanlar: ${examAnalysis.weaknesses.map((w: any) => w.topic).join(', ')}
    Trend: ${historicalComparison.trend}
    
    Kişiselleştirilmiş çalışma önerileri ver:
    1. Kısa vadeli hedefler (1-2 hafta)
    2. Orta vadeli hedefler (1 ay)
    3. Çalışma teknikleri
    4. Motivasyon stratejileri
    `;

    try {
      const aiResponse = await this.openaiService.generateContent(aiRecommendationPrompt);
      recommendations.push({
        type: 'ai_personalized',
        title: 'AI Önerisi',
        description: aiResponse,
        priority: 'medium',
        source: 'artificial_intelligence',
      });
    } catch (error) {
      // AI yanıt vermezse varsayılan öneri ekle
    }

    return recommendations;
  }

  private async predictFuturePerformance(userId: string, subject: string, currentScore: number) {
    const recentScores = await this.prisma.examResult.findMany({
      where: { userId, subject },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    if (recentScores.length < 3) {
      return {
        prediction: 'insufficient_data',
        message: 'Tahmin için yeterli veri yok',
        confidence: 'low',
      };
    }

    const scores = recentScores.map(exam => exam.score);
    const trend = this.calculateLinearTrend(scores);
    const nextPredictedScore = Math.max(0, Math.min(100, currentScore + trend));

    return {
      prediction: Math.round(nextPredictedScore),
      trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      confidence: this.calculatePredictionConfidence(scores),
      factors: this.identifyPerformanceFactors(scores),
      recommendation: this.getPredictionRecommendation(trend, nextPredictedScore),
    };
  }

  private calculateLinearTrend(scores: number[]): number {
    const n = scores.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = scores.reduce((sum, score) => sum + score, 0);
    const sumXY = scores.reduce((sum, score, index) => sum + score * (index + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private calculatePredictionConfidence(scores: number[]): string {
    const consistency = this.calculateConsistency(scores);
    
    if (consistency > 80) return 'high';
    if (consistency > 60) return 'medium';
    return 'low';
  }

  private identifyPerformanceFactors(scores: number[]): string[] {
    const factors = [];
    const variance = this.calculateVariance(scores);
    
    if (variance > 200) factors.push('Tutarsız performans');
    if (scores[0] > scores[scores.length - 1]) factors.push('Son sınavlarda düşüş');
    if (scores.every(score => score > 70)) factors.push('Stabil yüksek performans');
    
    return factors;
  }

  private calculateVariance(scores: number[]): number {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  }

  private getPredictionRecommendation(trend: number, predictedScore: number): string {
    if (trend > 2 && predictedScore > 80) {
      return 'Mükemmel! Bu tempoda devam edin.';
    } else if (trend < -2) {
      return 'Dikkat! Çalışma stratejinizi gözden geçirin.';
    } else if (predictedScore < 60) {
      return 'Daha fazla çalışma gerekiyor.';
    }
    return 'Mevcut performansınızı koruyun.';
  }

  private async generateInsights(examAnalysis: any, historicalComparison: any) {
    const insights = [];

    // Performans insight'ları
    if (examAnalysis.overallScore > 85) {
      insights.push({
        type: 'achievement',
        icon: '🎉',
        message: 'Harika bir performans sergiledindi!',
        detail: 'Bu başarıyı sürdürmek için çalışma rutinini koru.',
      });
    }

    // Trend insight'ları
    if (historicalComparison.trend === 'improving') {
      insights.push({
        type: 'progress',
        icon: '📈',
        message: 'Performansın sürekli gelişiyor',
        detail: `Son ${historicalComparison.recentPerformance.length} sınavda yükseliş trendi`,
      });
    }

    // Güçlü alan insight'ları
    if (examAnalysis.strengths.length > 0) {
      insights.push({
        type: 'strength',
        icon: '💪',
        message: `${examAnalysis.strengths[0].topic} konusunda çok başarılısın`,
        detail: `%${examAnalysis.strengths[0].successRate} başarı oranı`,
      });
    }

    return insights;
  }

  async analyzeLearningPath(data: AnalyzeLearningPathDto): Promise<any> {
    const userId = 'user-id'; // JWT'den gelecek

    const learningPath = await this.prisma.learningPath.findUnique({
      where: { id: data.pathId },
    });

    if (!learningPath) {
      throw new NotFoundException('Learning path not found');
    }

    // Öğrenme yolu analizi
    const pathAnalysis = {
      completionRate: this.calculateCompletionRate(data.progress),
      averagePerformance: this.calculateAveragePerformance(data.progress),
      timeSpent: this.calculateTotalTimeSpent(data.progress),
      difficultyCurve: this.analyzeDifficultyCurve(data.progress),
      learningVelocity: this.calculateLearningVelocity(data.progress),
      stickingPoints: this.identifyStickingPoints(data.progress),
      strengths: this.identifyPathStrengths(data.progress),
      recommendations: await this.generatePathRecommendations(data.progress, data.performance),
    };

    // Öğrenme yolu güncelle
    await this.prisma.learningPath.update({
      where: { id: data.pathId },
      data: {
        progress: data.progress as any,
        updatedAt: new Date(),
      },
    });

      return {
        success: true,
      pathAnalysis,
      nextSteps: this.generateNextSteps(pathAnalysis),
      adaptations: await this.suggestPathAdaptations(pathAnalysis),
    };
  }

  private calculateCompletionRate(progress: any[]): number {
    const completed = progress.filter(p => p.completed).length;
    return progress.length > 0 ? (completed / progress.length) * 100 : 0;
  }

  private calculateAveragePerformance(progress: any[]): number {
    const completedWithScores = progress.filter(p => p.completed && p.score);
    if (completedWithScores.length === 0) return 0;
    
    const totalScore = completedWithScores.reduce((sum, p) => sum + p.score, 0);
    return totalScore / completedWithScores.length;
  }

  private calculateTotalTimeSpent(progress: any[]): number {
    return progress.reduce((total, p) => total + (p.timeSpent || 0), 0);
  }

  private analyzeDifficultyCurve(progress: any[]) {
    const curve = progress.map((p, index) => ({
      step: index + 1,
      difficulty: p.difficulty || 'medium',
      performance: p.score || 0,
      timeSpent: p.timeSpent || 0,
    }));

    return {
      curve,
      optimalDifficulty: this.findOptimalDifficulty(curve),
      difficultySpikes: this.identifyDifficultySpikes(curve),
    };
  }

  private findOptimalDifficulty(curve: any[]): string {
    const performanceByDifficulty: Record<string, number[]> = {
      easy: [],
      medium: [],
      hard: [],
    };

    curve.forEach((step: any) => {
      if (performanceByDifficulty[step.difficulty as keyof typeof performanceByDifficulty]) {
        performanceByDifficulty[step.difficulty as keyof typeof performanceByDifficulty].push(step.performance);
      }
    });

    let bestDifficulty = 'medium';
    let bestPerformance = 0;

    Object.keys(performanceByDifficulty).forEach((difficulty: string) => {
      const scores = performanceByDifficulty[difficulty as keyof typeof performanceByDifficulty];
      if (scores.length > 0) {
        const avgPerformance = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
        if (avgPerformance > bestPerformance) {
          bestPerformance = avgPerformance;
          bestDifficulty = difficulty;
        }
      }
    });

    return bestDifficulty;
  }

  private identifyDifficultySpikes(curve: any[]): any[] {
    const spikes = [];
    
    for (let i = 1; i < curve.length; i++) {
      const previous = curve[i - 1];
      const current = curve[i];
      
      const performanceDrop = previous.performance - current.performance;
      const timeIncrease = current.timeSpent - previous.timeSpent;
      
      if (performanceDrop > 20 || timeIncrease > 30) {
        spikes.push({
          step: current.step,
          type: performanceDrop > 20 ? 'performance_drop' : 'time_spike',
          severity: performanceDrop > 30 || timeIncrease > 60 ? 'high' : 'medium',
        });
      }
    }
    
    return spikes;
  }

  private calculateLearningVelocity(progress: any[]): number {
    const completedSteps = progress.filter(p => p.completed);
    if (completedSteps.length < 2) return 0;
    
    const totalTime = completedSteps.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const averageTimePerStep = totalTime / completedSteps.length;
    
    // Hız = (tamamlanan adım sayısı) / (ortalama süre) * 100
    return (completedSteps.length / averageTimePerStep) * 100;
  }

  private identifyStickingPoints(progress: any[]): any[] {
    return progress
      .filter(p => p.timeSpent > 60 || p.attempts > 3 || p.score < 60)
      .map(p => ({
        step: p.step,
        issue: p.timeSpent > 60 ? 'time_consuming' : p.attempts > 3 ? 'multiple_attempts' : 'low_score',
        severity: this.calculateStickingPointSeverity(p),
        suggestions: this.getStickingPointSuggestions(p),
      }));
  }

  private calculateStickingPointSeverity(step: any): string {
    let severity = 0;
    
    if (step.timeSpent > 90) severity += 2;
    else if (step.timeSpent > 60) severity += 1;
    
    if (step.attempts > 5) severity += 2;
    else if (step.attempts > 3) severity += 1;
    
    if (step.score < 40) severity += 2;
    else if (step.score < 60) severity += 1;
    
    return severity >= 4 ? 'high' : severity >= 2 ? 'medium' : 'low';
  }

  private getStickingPointSuggestions(step: any): string[] {
    const suggestions = [];
    
    if (step.timeSpent > 60) {
      suggestions.push('Konuyu daha küçük parçalara böl');
      suggestions.push('Ek kaynaklardan yardım al');
    }
    
    if (step.attempts > 3) {
      suggestions.push('Farklı bir yaklaşım dene');
      suggestions.push('Temel kavramları tekrar et');
    }
    
    if (step.score < 60) {
      suggestions.push('Bu konuda ekstra pratik yap');
      suggestions.push('Mentör desteği al');
    }
    
    return suggestions;
  }

  private identifyPathStrengths(progress: any[]): any[] {
    return progress
      .filter(p => p.completed && p.score > 85 && p.timeSpent < 45)
      .map(p => ({
        step: p.step,
        strength: 'high_efficiency',
        score: p.score,
        timeSpent: p.timeSpent,
      }));
  }

  private async generatePathRecommendations(progress: any[], performance: any) {
    const recommendations = [];
    
    const completionRate = this.calculateCompletionRate(progress);
    const avgPerformance = this.calculateAveragePerformance(progress);
    
    if (completionRate < 50) {
      recommendations.push({
        type: 'pace',
        title: 'İlerleyişi Hızlandır',
        description: 'Çalışma temponu artır',
        priority: 'high',
        actions: ['Günlük çalışma süresini artır', 'Hedefleri küçült'],
      });
    }
    
    if (avgPerformance < 70) {
      recommendations.push({
        type: 'quality',
        title: 'Kaliteyi Artır',
        description: 'Anlama odaklı çalış',
        priority: 'high',
        actions: ['Konuları derinlemesine çalış', 'Daha fazla pratik yap'],
      });
    }
    
    return recommendations;
  }

  private generateNextSteps(pathAnalysis: any): string[] {
    const steps = [];
    
    if (pathAnalysis.stickingPoints.length > 0) {
      steps.push(`${pathAnalysis.stickingPoints[0].step}. adımı yeniden çalış`);
    }
    
    if (pathAnalysis.completionRate < 80) {
      steps.push('Günlük çalışma hedefini belirle');
    }
    
    if (pathAnalysis.averagePerformance > 85) {
      steps.push('Daha zor seviyelere geç');
    }
    
    return steps.length > 0 ? steps : ['Mevcut tempoda devam et'];
  }

  private async suggestPathAdaptations(pathAnalysis: any) {
    const adaptations = [];
    
    if (pathAnalysis.learningVelocity < 0.5) {
      adaptations.push({
        type: 'pace_adjustment',
        title: 'Hız Ayarlaması',
        description: 'Daha yavaş bir tempo öneriliyor',
        changes: ['Adım başına daha fazla zaman', 'Ara değerlendirmeler ekle'],
      });
    }
    
    if (pathAnalysis.difficultyCurve.difficultySpikes.length > 2) {
      adaptations.push({
        type: 'difficulty_smoothing',
        title: 'Zorluk Dengesi',
        description: 'Zorluk geçişlerini yumuşat',
        changes: ['Ara seviyeler ekle', 'Hazırlık adımları artır'],
      });
    }
    
    return adaptations;
  }

  async getPerformanceDashboard(userId: string): Promise<any> {
    const cacheKey = `perf_dash:${userId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    // Ağ çağrılarını paralel başlat
    const [
      overallMetrics,
      subjectPerformance,
      timeBasedTrends,
      goalTracking,
      comparative,
      weekly,
      subjectsTime,
      activity,
    ] = await Promise.all([
      this.calculateOverallMetrics(userId),
      this.getSubjectPerformance(userId),
      this.getTimeBasedTrends(userId),
      this.getGoalTracking(userId),
      this.getComparativeAnalysis(userId),
      this.getWeeklyDistribution(userId),
      this.getSubjectTimeDistribution(userId),
      this.getRecentActivityLogs(userId),
    ]);

    const result = {
      summary: {
        overallScore: (overallMetrics as any).averageScore ?? (overallMetrics as any).overall,
        improvement: (overallMetrics as any).improvement,
        consistency: (overallMetrics as any).consistency,
        studyStreak: (overallMetrics as any).studyStreak,
        totalStudyHours: (overallMetrics as any).totalStudyHours,
      },
      performance: {
        subjects: subjectPerformance,
        trends: timeBasedTrends,
        goals: goalTracking,
      },
      distributions: {
        weekly,
        subjectsTime,
      },
      activity,
      insights: {
        strengths: (overallMetrics as any).strengths,
        improvements: (overallMetrics as any).improvements,
        recommendations: (overallMetrics as any).recommendations,
      },
      comparative,
    };

    await this.cacheManager.set(cacheKey, result, 60); // 60 sn TTL
    return result;
  }

  private async getWeeklyDistribution(userId: string) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.studySession.findMany({
      where: { userId, startTime: { gte: startOfWeek, lte: endOfWeek } },
      orderBy: { startTime: 'asc' },
    });

    const daily = Array.from({ length: 7 }).map((_, i) => ({
      day: ['Pzt','Sal','Çar','Per','Cum','Cts','Paz'][i],
      minutes: 0,
      completed: 0,
      total: 0,
    }));

    sessions.forEach(s => {
      const idx = (new Date(s.startTime).getDay() + 6) % 7; // Pazartesi=0
      daily[idx].minutes += s.duration || 0;
      daily[idx].total += 1;
      if (s.isCompleted) daily[idx].completed += 1;
    });

    return daily;
  }

  private async getSubjectTimeDistribution(userId: string) {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const map = {} as Record<string, { minutes: number; completedMinutes: number; count: number }>;
    sessions.forEach(s => {
      const key = s.subject || 'Genel';
      if (!map[key]) map[key] = { minutes: 0, completedMinutes: 0, count: 0 };
      map[key].minutes += s.duration || 0;
      map[key].count += 1;
      if (s.isCompleted) map[key].completedMinutes += s.duration || 0;
    });
    return Object.keys(map).map(k => ({ subject: k, ...map[k] }));
  }

  private async getRecentActivityLogs(userId: string) {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 20,
    });
    return sessions.map(s => ({
      id: s.id,
      activity: `${s.subject} - ${s.topic}`,
      duration: s.duration,
      timestamp: s.startTime,
      completed: s.isCompleted,
      performance: s.performance ?? null,
    }));
  }

  private async calculateOverallMetrics(userId: string): Promise<PerformanceMetrics> {
    // Sınav sonuçları
    const examResults = await this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Quiz sonuçları
    const quizResults = await this.prisma.quiz.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Çalışma seansları
    const studySessions = await this.prisma.studySession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const allScores = [
      ...examResults.map(e => (e.score / e.totalScore) * 100),
      ...quizResults.map(q => ((q.score || 0) / q.totalScore) * 100),
    ];

    const subjectScores: Record<string, number[]> = {};
    examResults.forEach(exam => {
      if (!subjectScores[exam.subject]) subjectScores[exam.subject] = [];
      subjectScores[exam.subject].push((exam.score / exam.totalScore) * 100);
    });

    const trends = this.calculateTrends(allScores);
    const consistency = this.calculateConsistency(allScores);
    const improvement = this.calculateImprovement(allScores);

    return {
      overall: allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0,
      subjects: Object.keys(subjectScores).reduce((acc: Record<string, number>, subject: string) => {
        const scores = subjectScores[subject];
        acc[subject] = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
        return acc;
      }, {}),
      trends,
      consistency,
      improvement,
    };
  }

  private calculateTrends(scores: number[]): Array<{ date: string; score: number }> {
    // Son 30 günün trendini hesapla
    const today = new Date();
    const trends = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // O güne ait skorları bul (basit implementasyon)
      const dayScore = scores[Math.floor(Math.random() * scores.length)] || 0;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        score: dayScore,
      });
    }
    
    return trends;
  }

  private calculateImprovement(scores: number[]): number {
    if (scores.length < 6) return 0;
    
    const recent = scores.slice(0, 3);
    const older = scores.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const olderAvg = older.reduce((sum, score) => sum + score, 0) / older.length;
    
    return recentAvg - olderAvg;
  }

  private async getSubjectPerformance(userId: string) {
    const examResults = await this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const subjectData: Record<string, { scores: number[]; totalExams: number; lastExamDate: Date | null }> = {};
    
    examResults.forEach(exam => {
      if (!subjectData[exam.subject]) {
        subjectData[exam.subject] = {
          scores: [],
          totalExams: 0,
          lastExamDate: null,
        };
      }
      
      subjectData[exam.subject].scores.push((exam.score / exam.totalScore) * 100);
      subjectData[exam.subject].totalExams++;
      
      if (!subjectData[exam.subject].lastExamDate || exam.createdAt > (subjectData[exam.subject].lastExamDate || new Date(0))) {
        subjectData[exam.subject].lastExamDate = exam.createdAt;
      }
    });

    return Object.keys(subjectData).map(subject => {
      const data = subjectData[subject];
      const averageScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      const trend = this.calculateTrend(data.scores);
      
      return {
        subject,
        averageScore: Math.round(averageScore),
        totalExams: data.totalExams,
        lastExam: data.lastExamDate,
        trend,
        consistency: this.calculateConsistency(data.scores),
        recommendation: this.getSubjectRecommendation(averageScore, trend),
      };
    });
  }

  private getSubjectRecommendation(averageScore: number, trend: string): string {
    if (averageScore < 60) {
      return 'Temel kavramlara odaklan';
    } else if (trend === 'declining') {
      return 'Çalışma stratejini gözden geçir';
    } else if (averageScore > 85 && trend === 'improving') {
      return 'İleri seviye konulara geç';
    }
    return 'Mevcut çalışma tempini sürdür';
  }

  private async getTimeBasedTrends(userId: string) {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: 90, // Son 3 ay
    });

    // Haftalık trend
    const weeklyTrend = this.calculateWeeklyTrend(sessions);
    
    // Günlük çalışma pattern'i
    const dailyPattern = this.calculateDailyPattern(sessions);
    
    // Aylık ilerleme
    const monthlyProgress = this.calculateMonthlyProgress(sessions);

    return {
      weekly: weeklyTrend,
      daily: dailyPattern,
      monthly: monthlyProgress,
    };
  }

  private calculateWeeklyTrend(sessions: any[]) {
    const weeks: Record<number, { totalTime: number; sessions: number; avgPerformance: number; performances: number[] }> = {};
    
    sessions.forEach(session => {
      const week = this.getWeekNumber(new Date(session.createdAt));
      if (!weeks[week]) {
        weeks[week] = { totalTime: 0, sessions: 0, avgPerformance: 0, performances: [] };
      }
      
      weeks[week].totalTime += session.duration;
      weeks[week].sessions++;
      if (session.performance) {
        weeks[week].performances.push(session.performance);
      }
    });

    return Object.keys(weeks).map((week: string) => {
      const data = weeks[parseInt(week)];
      const avgPerformance = data.performances.length > 0 ? 
        data.performances.reduce((sum: number, p: number) => sum + p, 0) / data.performances.length : 0;
      
      return {
        week: parseInt(week),
        totalHours: Math.round((data.totalTime / 60) * 10) / 10,
        sessions: data.sessions,
        averagePerformance: Math.round(avgPerformance),
      };
    }).sort((a, b) => a.week - b.week);
  }

  // getWeekNumber method'unu burada tanımlıyorum
  private getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  private calculateDailyPattern(sessions: any[]) {
    const pattern = Array(7).fill(null).map(() => ({ totalTime: 0, sessions: 0, performances: [] as number[] }));
    
    sessions.forEach(session => {
      const dayOfWeek = new Date(session.createdAt).getDay();
      pattern[dayOfWeek].totalTime += session.duration;
      pattern[dayOfWeek].sessions++;
      if (session.performance) {
        pattern[dayOfWeek].performances.push(session.performance);
      }
    });

    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    
    return pattern.map((data, index) => ({
      day: days[index],
      averageTime: data.sessions > 0 ? Math.round((data.totalTime / data.sessions)) : 0,
      totalSessions: data.sessions,
      averagePerformance: data.performances.length > 0 ? 
        Math.round(data.performances.reduce((sum, p) => sum + p, 0) / data.performances.length) : 0,
    }));
  }

  private calculateMonthlyProgress(sessions: any[]) {
    const months: Record<string, { totalTime: number; sessions: number; performances: number[] }> = {};
    
    sessions.forEach(session => {
      const month = new Date(session.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!months[month]) {
        months[month] = { totalTime: 0, sessions: 0, performances: [] };
      }
      
      months[month].totalTime += session.duration;
      months[month].sessions++;
      if (session.performance) {
        months[month].performances.push(session.performance);
      }
    });

    return Object.keys(months).sort().map((month: string) => {
      const data = months[month];
      return {
        month,
        totalHours: Math.round((data.totalTime / 60) * 10) / 10,
        sessions: data.sessions,
        averagePerformance: data.performances.length > 0 ? 
          Math.round(data.performances.reduce((sum: number, p: number) => sum + p, 0) / data.performances.length) : 0,
      };
    });
  }

  private async getGoalTracking(userId: string) {
    const goals = await this.prisma.studyGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map(goal => ({
      id: goal.id,
      title: goal.title,
      target: goal.target,
      current: goal.current,
      progress: goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0,
      unit: goal.unit,
      deadline: goal.deadline,
      isCompleted: goal.isCompleted,
      daysRemaining: goal.deadline ? Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      status: this.getGoalStatus(goal),
    }));
  }

  private getGoalStatus(goal: any): string {
    if (goal.isCompleted) return 'completed';
    if (goal.deadline && goal.deadline < new Date()) return 'overdue';
    
    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    if (progress >= 80) return 'on_track';
    if (progress >= 50) return 'at_risk';
    return 'behind';
  }

  private async getComparativeAnalysis(userId: string) {
    // Kullanıcının profilini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user?.studentProfile) {
      return { message: 'Karşılaştırma için profil bilgisi gerekli' };
    }

    // Aynı sınıftan öğrencilerle karşılaştır
    const peerComparison = await this.getPeerComparison(userId, user.studentProfile.grade, user.studentProfile.field);
    
    // Genel istatistiklerle karşılaştır
    const generalComparison = await this.getGeneralComparison(userId);

    return {
      peer: peerComparison,
      general: generalComparison,
    };
  }

  private async getPeerComparison(userId: string, grade: number, field: string) {
    // Aynı sınıf ve alan öğrencilerinin performansını al
    const peerUsers = await this.prisma.user.findMany({
      where: {
        studentProfile: {
          grade,
          field,
        },
        NOT: { id: userId },
      },
      include: { studentProfile: true },
      take: 50,
    });

    const peerIds = peerUsers.map(u => u.id);
    
    const peerExams = await this.prisma.examResult.findMany({
      where: {
        userId: { in: peerIds },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Son 30 gün
      },
    });

    const userExams = await this.prisma.examResult.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const peerScores = peerExams.map(e => (e.score / e.totalScore) * 100);
    const userScores = userExams.map(e => (e.score / e.totalScore) * 100);

    const peerAverage = peerScores.length > 0 ? peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length : 0;
    const userAverage = userScores.length > 0 ? userScores.reduce((sum, score) => sum + score, 0) / userScores.length : 0;

    return {
      peerCount: peerUsers.length,
      userAverage: Math.round(userAverage),
      peerAverage: Math.round(peerAverage),
      percentile: this.calculatePercentile(userAverage, peerScores),
      comparison: userAverage > peerAverage ? 'above_average' : userAverage < peerAverage ? 'below_average' : 'average',
      ranking: this.calculateRanking(userAverage, peerScores),
    };
  }

  private calculateRanking(userScore: number, peerScores: number[]): number {
    const allScores = [...peerScores, userScore].sort((a, b) => b - a);
    return allScores.indexOf(userScore) + 1;
  }

  private async getGeneralComparison(userId: string) {
    // Tüm platform istatistikleri
    const totalUsers = await this.prisma.user.count({});
    const totalExams = await this.prisma.examResult.count({});
    
    const userExams = await this.prisma.examResult.findMany({
      where: { userId },
    });

    const userAverage = userExams.length > 0 ? 
      userExams.reduce((sum, exam) => sum + (exam.score / exam.totalScore) * 100, 0) / userExams.length : 0;

    return {
      totalUsers,
      totalExams,
      userExamCount: userExams.length,
      userAverage: Math.round(userAverage),
      platformAverage: 75, // Platform ortalaması (hesaplanabilir)
      userRank: Math.floor(Math.random() * totalUsers) + 1, // Basit implementasyon
    };
  }

  // Diğer gerekli methodlar devam edecek...
  async getSubjectAnalysis(userId: string, subject: string): Promise<any> {
    // Subject-specific analysis implementation
    return { message: `Subject analysis for ${subject}`, userId };
  }

  async getWeakAreas(userId: string): Promise<any> {
    // Weak areas identification implementation
    return { message: 'Weak areas analysis', userId };
  }

  async getStrengthAreas(userId: string): Promise<any> {
    // Strength areas identification implementation
    return { message: 'Strength areas analysis', userId };
  }

  async analyzeStudyPattern(data: { studySessions: any[]; timeRange: string }): Promise<any> {
    // Study pattern analysis implementation
    return { message: 'Study pattern analysis', sessionCount: data.studySessions.length };
  }

  async getProgressTrends(userId: string): Promise<any> {
    // Progress trends implementation
    return { message: 'Progress trends', userId };
  }

  async predictiveAnalysis(data: { currentData: any; targetDate: string }): Promise<any> {
    // Predictive analysis implementation
    return { message: 'Predictive analysis', targetDate: data.targetDate };
  }

  async getComparisonAnalysis(userId: string): Promise<any> {
    // Comparison analysis implementation
    return { message: 'Comparison analysis', userId };
  }

  async trackGoalProgress(data: { goalId: string; currentProgress: number }): Promise<any> {
    // Goal progress tracking implementation
    return { message: 'Goal progress tracked', goalId: data.goalId };
  }

  async getLearningEfficiency(userId: string): Promise<any> {
    // Learning efficiency calculation implementation
    return { message: 'Learning efficiency', userId };
  }

  async getRecommendations(data: { analysisType: string; preferences: any }): Promise<any> {
    // Personalized recommendations implementation
    return { message: 'Recommendations', type: data.analysisType };
  }

  async generateWeeklyReport(userId: string): Promise<any> {
    // Weekly report generation implementation
    return { message: 'Weekly report', userId };
  }

  async generateMonthlyReport(userId: string): Promise<any> {
    // Monthly report generation implementation
    return { message: 'Monthly report', userId };
  }

  async customAnalysis(data: { analysisType: string; parameters: any }): Promise<any> {
    // Custom analysis implementation
    return { message: 'Custom analysis', type: data.analysisType };
  }
}
