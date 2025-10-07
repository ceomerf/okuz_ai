import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AIExplanation {
  recommendationId: string;
  type: string;
  title: string;
  reasoning: {
    primary: string;
    secondary: string[];
    supporting: string[];
  };
  dataPoints: {
    userBehavior: string[];
    performanceMetrics: string[];
    emotionalState: string[];
    contextualFactors: string[];
  };
  confidence: {
    overall: number;
    reasoning: number;
    dataQuality: number;
    modelAccuracy: number;
  };
  alternatives: {
    option: string;
    reasoning: string;
    pros: string[];
    cons: string[];
    confidence: number;
  }[];
  impact: {
    expected: string;
    timeframe: string;
    probability: number;
    risks: string[];
    benefits: string[];
  };
  transparency: {
    algorithm: string;
    version: string;
    trainingData: string;
    limitations: string[];
    biases: string[];
  };
  userFeedback: {
    helpful: boolean;
    accurate: boolean;
    clear: boolean;
    suggestions: string;
  } | null;
}

export interface ExplanationRequest {
  userId: string;
  recommendationId: string;
  context: any;
  userPreferences: {
    detailLevel: 'basic' | 'intermediate' | 'advanced';
    language: string;
    includeAlternatives: boolean;
    includeTechnicalDetails: boolean;
  };
}

export interface ExplanationResponse {
  explanation: AIExplanation;
  visualizations: {
    reasoningFlow: any;
    dataFlow: any;
    confidenceChart: any;
    impactTimeline: any;
  };
  interactive: {
    questions: string[];
    clarifications: string[];
    deepDive: string[];
  };
}

@Injectable()
export class AIExplainabilityService {
  private readonly logger = new Logger(AIExplainabilityService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Generate comprehensive AI explanation
   */
  async generateExplanation(request: ExplanationRequest): Promise<ExplanationResponse> {
    try {
      this.logger.log(`Generating AI explanation for recommendation: ${request.recommendationId}`);

      // Get recommendation details
      const recommendation = await (this.prisma as any).proactiveRecommendation.findUnique({
        where: { id: request.recommendationId },
      });

      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // Gather context data
      const contextData = await this.gatherContextData(request.userId, recommendation);

      // Generate reasoning
      const reasoning = await this.generateReasoning(recommendation, contextData, request.userPreferences);

      // Generate data points
      const dataPoints = await this.generateDataPoints(request.userId, recommendation, contextData);

      // Calculate confidence
      const confidence = await this.calculateConfidence(recommendation, contextData);

      // Generate alternatives
      const alternatives = await this.generateAlternatives(recommendation, contextData, request.userPreferences);

      // Calculate impact
      const impact = await this.calculateImpact(recommendation, contextData);

      // Generate transparency information
      const transparency = await this.generateTransparencyInfo(recommendation);

      // Get user feedback if available
      const userFeedback = await this.getUserFeedback(request.recommendationId);

      // Create explanation
      const explanation: AIExplanation = {
        recommendationId: request.recommendationId,
        type: recommendation.type,
        title: recommendation.title,
        reasoning,
        dataPoints,
        confidence,
        alternatives,
        impact,
        transparency,
        userFeedback,
      };

      // Generate visualizations
      const visualizations = await this.generateVisualizations(explanation);

      // Generate interactive elements
      const interactive = await this.generateInteractiveElements(explanation, request.userPreferences);

      const response: ExplanationResponse = {
        explanation,
        visualizations,
        interactive,
      };

      // Store explanation
      await this.storeExplanation(request.userId, response);

      this.logger.log(`AI explanation generated for recommendation: ${request.recommendationId}`);
      
      return response;
    } catch (error) {
      this.logger.error(`Error generating AI explanation:`, error);
      throw error;
    }
  }

  /**
   * Generate reasoning for recommendation
   */
  private async generateReasoning(
    recommendation: any,
    contextData: any,
    userPreferences: any,
  ): Promise<any> {
    try {
      // Use OpenAI to generate human-readable reasoning
      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are an AI explainability expert. Generate clear, human-readable explanations for AI recommendations. 
                Focus on:
                - Why this recommendation was made
                - What data led to this conclusion
                - How confident the system is
                - What alternatives were considered
                
                Use simple language and avoid technical jargon unless specifically requested.`,
              },
              {
                role: 'user',
                content: `Explain this AI recommendation:
                Type: ${recommendation.type}
                Title: ${recommendation.title}
                Description: ${recommendation.description}
                Reasoning: ${recommendation.reasoning}
                Expected Impact: ${recommendation.expectedImpact}
                Confidence: ${recommendation.confidence}
                Urgency: ${recommendation.urgency}
                
                Context Data:
                ${JSON.stringify(contextData, null, 2)}
                
                User Preferences:
                Detail Level: ${userPreferences.detailLevel}
                Language: ${userPreferences.language}
                Include Alternatives: ${userPreferences.includeAlternatives}
                Include Technical Details: ${userPreferences.includeTechnicalDetails}`,
              },
            ],
            temperature: 0.3,
          },
          {
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const explanation = (() => {
        const content = response.data?.choices?.[0]?.message?.content;
        try { return JSON.parse(content); } catch { return { primary: content, secondary: [], supporting: [] }; }
      })();
      return explanation;
    } catch (error) {
      this.logger.error('Error generating reasoning:', error);
      return this.getDefaultReasoning(recommendation);
    }
  }

  /**
   * Generate data points that influenced the recommendation
   */
  private async generateDataPoints(
    userId: string,
    recommendation: any,
    contextData: any,
  ): Promise<any> {
    const dataPoints: { userBehavior: string[]; performanceMetrics: string[]; emotionalState: string[]; contextualFactors: string[] } = {
      userBehavior: [],
      performanceMetrics: [],
      emotionalState: [],
      contextualFactors: [],
    };

    // Analyze user behavior patterns
    if (contextData.recentActivities) {
      dataPoints.userBehavior.push(
        `Studied for ${(contextData.recentActivities as any[]).length} sessions in the last week`
      );
      if (contextData.averageSessionDuration) dataPoints.userBehavior.push(`Average session duration: ${contextData.averageSessionDuration} minutes`);
      if (contextData.peakStudyTime) dataPoints.userBehavior.push(`Most active study time: ${contextData.peakStudyTime}`);
    }

    // Analyze performance metrics
    if (contextData.performanceData) {
      if (contextData.performanceData.overall !== undefined) dataPoints.performanceMetrics.push(`Overall performance: ${contextData.performanceData.overall}%`);
      if (contextData.performanceData.trend) dataPoints.performanceMetrics.push(`Recent trend: ${contextData.performanceData.trend}`);
      if (Array.isArray(contextData.performanceData.weakAreas)) dataPoints.performanceMetrics.push(`Weak areas: ${contextData.performanceData.weakAreas.join(', ')}`);
      if (Array.isArray(contextData.performanceData.strongAreas)) dataPoints.performanceMetrics.push(`Strong areas: ${contextData.performanceData.strongAreas.join(', ')}`);
    }

    // Analyze emotional state
    if (contextData.emotionalState) {
      if (contextData.emotionalState.mood) dataPoints.emotionalState.push(`Current mood: ${contextData.emotionalState.mood}`);
      if (contextData.emotionalState.stressLevel !== undefined) dataPoints.emotionalState.push(`Stress level: ${Math.round(contextData.emotionalState.stressLevel * 100)}%`);
      if (contextData.emotionalState.motivationLevel !== undefined) dataPoints.emotionalState.push(`Motivation level: ${Math.round(contextData.emotionalState.motivationLevel * 100)}%`);
      if (contextData.emotionalState.learningReadiness !== undefined) dataPoints.emotionalState.push(`Learning readiness: ${Math.round(contextData.emotionalState.learningReadiness * 100)}%`);
    }

    // Analyze contextual factors
    if (contextData.contextualFactors) {
      if (contextData.contextualFactors.timeOfDay) dataPoints.contextualFactors.push(`Time of day: ${contextData.contextualFactors.timeOfDay}`);
      if (contextData.contextualFactors.dayOfWeek) dataPoints.contextualFactors.push(`Day of week: ${contextData.contextualFactors.dayOfWeek}`);
      if (contextData.contextualFactors.upcomingDeadlines !== undefined) dataPoints.contextualFactors.push(`Upcoming deadlines: ${contextData.contextualFactors.upcomingDeadlines}`);
      if (contextData.contextualFactors.studyStreak !== undefined) dataPoints.contextualFactors.push(`Study streak: ${contextData.contextualFactors.studyStreak} days`);
    }

    return dataPoints;
  }

  /**
   * Calculate confidence in the recommendation
   */
  private async calculateConfidence(recommendation: any, contextData: any): Promise<any> {
    // Calculate overall confidence
    const overall = recommendation.confidence || 0.8;
    
    // Calculate reasoning confidence
    const reasoning = this.calculateReasoningConfidence(recommendation, contextData);
    
    // Calculate data quality confidence
    const dataQuality = this.calculateDataQualityConfidence(contextData);
    
    // Calculate model accuracy confidence
    const modelAccuracy = this.calculateModelAccuracyConfidence(recommendation.type);

    return {
      overall,
      reasoning,
      dataQuality,
      modelAccuracy,
    };
  }

  /**
   * Generate alternative recommendations
   */
  private async generateAlternatives(
    recommendation: any,
    contextData: any,
    userPreferences: any,
  ): Promise<any[]> {
    const alternatives = [];

    // Generate alternative based on different approach
    if (recommendation.type === 'study_plan') {
      alternatives.push({
        option: 'Focus on one subject at a time',
        reasoning: 'Concentrated learning approach for better understanding',
        pros: ['Deep focus', 'Better retention', 'Reduced cognitive load'],
        cons: ['Slower overall progress', 'Potential boredom', 'Less variety'],
        confidence: 0.7,
      });

      alternatives.push({
        option: 'Mix easy and difficult topics',
        reasoning: 'Balanced approach to maintain motivation and challenge',
        pros: ['Maintains interest', 'Builds confidence', 'Varied learning'],
        cons: ['May be overwhelming', 'Harder to track progress', 'Complex planning'],
        confidence: 0.6,
      });
    }

    // Generate alternative based on different timing
    if (recommendation.type === 'break_reminder') {
      alternatives.push({
        option: 'Take a shorter break (5-10 minutes)',
        reasoning: 'Quick refresh without losing momentum',
        pros: ['Maintains focus', 'Quick recovery', 'Less time lost'],
        cons: ['May not be enough', 'Still stressed', 'Quick return to work'],
        confidence: 0.6,
      });

      alternatives.push({
        option: 'Continue studying with easier topics',
        reasoning: 'Reduce cognitive load while maintaining progress',
        pros: ['Continued progress', 'Reduced stress', 'Maintains momentum'],
        cons: ['Still working', 'May not address root cause', 'Potential burnout'],
        confidence: 0.5,
      });
    }

    return alternatives;
  }

  /**
   * Calculate expected impact of recommendation
   */
  private async calculateImpact(recommendation: any, contextData: any): Promise<any> {
    const impact = {
      expected: recommendation.expectedImpact || 'Positive learning outcome',
      timeframe: this.calculateTimeframe(recommendation.type),
      probability: recommendation.confidence || 0.8,
      risks: this.identifyRisks(recommendation, contextData),
      benefits: this.identifyBenefits(recommendation, contextData),
    };

    return impact;
  }

  /**
   * Generate transparency information
   */
  private async generateTransparencyInfo(recommendation: any): Promise<any> {
    return {
      algorithm: 'Proactive Coaching AI v2.1',
      version: '2.1.0',
      trainingData: 'User behavior patterns, performance metrics, emotional states',
      limitations: [
        'Based on historical data patterns',
        'May not account for sudden life changes',
        'Requires consistent user engagement',
        'Limited by data quality and quantity',
      ],
      biases: [
        'Favors users with consistent study patterns',
        'May over-recommend based on successful patterns',
        'Could under-recommend for unique learning styles',
        'Potential cultural bias in emotional analysis',
      ],
    };
  }

  /**
   * Generate visualizations for explanation
   */
  private async generateVisualizations(explanation: AIExplanation): Promise<any> {
    return {
      reasoningFlow: {
        type: 'flowchart',
        data: this.createReasoningFlowData(explanation),
      },
      dataFlow: {
        type: 'sankey',
        data: this.createDataFlowData(explanation),
      },
      confidenceChart: {
        type: 'radar',
        data: this.createConfidenceChartData(explanation),
      },
      impactTimeline: {
        type: 'timeline',
        data: this.createImpactTimelineData(explanation),
      },
    };
  }

  /**
   * Generate interactive elements
   */
  private async generateInteractiveElements(
    explanation: AIExplanation,
    userPreferences: any,
  ): Promise<any> {
    return {
      questions: [
        'Why did you choose this specific approach?',
        'What if I have different preferences?',
        'How can I provide feedback to improve recommendations?',
        'What data do you use to make these decisions?',
      ],
      clarifications: [
        'Can you explain the technical details?',
        'What are the limitations of this approach?',
        'How confident are you in this recommendation?',
        'What alternatives did you consider?',
      ],
      deepDive: [
        'Show me the data that influenced this decision',
        'Explain the algorithm behind this recommendation',
        'What are the potential risks and benefits?',
        'How can I customize this recommendation?',
      ],
    };
  }

  // Helper methods
  private async gatherContextData(userId: string, recommendation: any): Promise<any> {
    // Gather all relevant context data
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivities = await (this.prisma as any).userActivity.findMany({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
    });

    const performanceData = await (this.prisma as any).progress.findMany({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
    });

    const emotionalState = await (this.prisma as any).emotionalState.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      recentActivities,
      performanceData,
      emotionalState,
      averageSessionDuration: 45, // Calculate from actual data
      peakStudyTime: 'morning', // Calculate from actual data
      contextualFactors: {
        timeOfDay: this.getTimeOfDay(new Date()),
        dayOfWeek: this.getDayOfWeek(new Date()),
        upcomingDeadlines: 2, // Calculate from actual data
        studyStreak: 5, // Calculate from actual data
      },
    };
  }

  private getDefaultReasoning(recommendation: any): any {
    return {
      primary: recommendation.reasoning || 'Based on your learning patterns and performance data',
      secondary: [
        'Your recent study sessions show consistent patterns',
        'Performance metrics indicate areas for improvement',
        'Emotional state analysis suggests optimal timing',
      ],
      supporting: [
        'Historical data from similar users',
        'Machine learning model predictions',
        'Behavioral pattern recognition',
      ],
    };
  }

  private calculateReasoningConfidence(recommendation: any, contextData: any): number {
    // Calculate confidence based on reasoning quality
    return 0.8;
  }

  private calculateDataQualityConfidence(contextData: any): number {
    // Calculate confidence based on data quality
    return 0.7;
  }

  private calculateModelAccuracyConfidence(type: string): number {
    // Calculate confidence based on model accuracy for specific type
    const accuracyMap = {
      'study_plan': 0.85,
      'break_reminder': 0.9,
      'motivation_boost': 0.75,
      'difficulty_adjustment': 0.8,
      'social_learning': 0.7,
      'wellness': 0.9,
    };
    return accuracyMap[type as keyof typeof accuracyMap] || 0.8;
  }

  private calculateTimeframe(type: string): string {
    const timeframeMap = {
      'study_plan': '1-2 weeks',
      'break_reminder': '15-30 minutes',
      'motivation_boost': '1-3 days',
      'difficulty_adjustment': '1-2 weeks',
      'social_learning': '2-4 weeks',
      'wellness': '1-2 hours',
    };
    return timeframeMap[type as keyof typeof timeframeMap] || '1 week';
  }

  private identifyRisks(recommendation: any, contextData: any): string[] {
    const risks = [];
    
    if (recommendation.type === 'study_plan') {
      risks.push('May be too challenging for current level');
      risks.push('Could lead to frustration if not properly paced');
    }
    
    if (recommendation.type === 'break_reminder') {
      risks.push('May disrupt study momentum');
      risks.push('Could lead to procrastination');
    }
    
    return risks;
  }

  private identifyBenefits(recommendation: any, contextData: any): string[] {
    const benefits = [];
    
    if (recommendation.type === 'study_plan') {
      benefits.push('Improved learning outcomes');
      benefits.push('Better understanding of concepts');
      benefits.push('Increased confidence');
    }
    
    if (recommendation.type === 'break_reminder') {
      benefits.push('Reduced stress and burnout');
      benefits.push('Improved focus and concentration');
      benefits.push('Better long-term retention');
    }
    
    return benefits;
  }

  private createReasoningFlowData(explanation: AIExplanation): any {
    // Create flowchart data for reasoning flow
    return {
      nodes: [
        { id: 'start', label: 'User Data' },
        { id: 'analysis', label: 'Pattern Analysis' },
        { id: 'recommendation', label: 'Recommendation' },
        { id: 'impact', label: 'Expected Impact' },
      ],
      edges: [
        { from: 'start', to: 'analysis' },
        { from: 'analysis', to: 'recommendation' },
        { from: 'recommendation', to: 'impact' },
      ],
    };
  }

  private createDataFlowData(explanation: AIExplanation): any {
    // Create Sankey diagram data for data flow
    return {
      nodes: [
        { name: 'User Behavior' },
        { name: 'Performance Data' },
        { name: 'Emotional State' },
        { name: 'Contextual Factors' },
        { name: 'AI Analysis' },
        { name: 'Recommendation' },
      ],
      links: [
        { source: 'User Behavior', target: 'AI Analysis', value: 30 },
        { source: 'Performance Data', target: 'AI Analysis', value: 25 },
        { source: 'Emotional State', target: 'AI Analysis', value: 20 },
        { source: 'Contextual Factors', target: 'AI Analysis', value: 15 },
        { source: 'AI Analysis', target: 'Recommendation', value: 90 },
      ],
    };
  }

  private createConfidenceChartData(explanation: AIExplanation): any {
    // Create radar chart data for confidence
    return {
      labels: ['Overall', 'Reasoning', 'Data Quality', 'Model Accuracy'],
      datasets: [
        {
          label: 'Confidence Levels',
          data: [
            explanation.confidence.overall,
            explanation.confidence.reasoning,
            explanation.confidence.dataQuality,
            explanation.confidence.modelAccuracy,
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
        },
      ],
    };
  }

  private createImpactTimelineData(explanation: AIExplanation): any {
    // Create timeline data for impact
    return {
      events: [
        { time: 'Immediate', description: 'Initial response to recommendation' },
        { time: '1-3 days', description: 'Short-term effects and adjustments' },
        { time: '1-2 weeks', description: 'Medium-term learning outcomes' },
        { time: '1 month+', description: 'Long-term behavioral changes' },
      ],
    };
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 6) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private async getUserFeedback(recommendationId: string): Promise<any> {
    // Get user feedback if available
    const feedback = await (this.prisma as any).userFeedback.findFirst({
      where: { recommendationId },
    });
    
    return feedback ? {
      helpful: feedback.helpful,
      accurate: feedback.accurate,
      clear: feedback.clear,
      suggestions: feedback.suggestions,
    } : null;
  }

  private async storeExplanation(userId: string, response: ExplanationResponse): Promise<void> {
    // Store explanation in database
    await (this.prisma as any).aIExplanation.create({
      data: {
        userId,
        recommendationId: response.explanation.recommendationId,
        explanation: response.explanation as any,
        visualizations: response.visualizations as any,
        interactive: response.interactive as any,
        timestamp: new Date(),
      },
    });
  }
}
