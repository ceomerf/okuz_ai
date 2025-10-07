import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EmotionalState {
  mood: string;
  stressLevel: number;
  motivationLevel: number;
  confidence: number;
  frustration: number;
  excitement: number;
  anxiety: number;
  satisfaction: number;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  emotionalStability: number;
  learningReadiness: number;
  socialEngagement: number;
  timestamp: Date;
}

export interface TextEmotionAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
  };
  stressIndicators: string[];
  motivationIndicators: string[];
  confidenceIndicators: string[];
  learningReadiness: number;
}

export interface VoiceEmotionAnalysis {
  tone: 'calm' | 'excited' | 'frustrated' | 'confident' | 'anxious' | 'tired';
  pitch: number;
  pace: number;
  volume: number;
  stressLevel: number;
  emotionalState: string;
  confidence: number;
}

export interface BehaviorEmotionAnalysis {
  studyPattern: string;
  engagementLevel: number;
  persistenceLevel: number;
  frustrationSigns: string[];
  motivationSigns: string[];
  learningStyle: string;
  socialPreference: string;
}

@Injectable()
export class EmotionalAIService {
  private readonly logger = new Logger(EmotionalAIService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Analyze emotional state from multiple sources
   */
  async analyzeEmotionalState(userId: string, context: any): Promise<EmotionalState> {
    try {
      this.logger.log(`Analyzing emotional state for user: ${userId}`);

      // Get recent user data
      const recentData = await this.getRecentUserData(userId);
      
      // Analyze text emotions
      const textEmotions = await this.analyzeTextEmotions(recentData.textData);
      
      // Analyze voice emotions (if available)
      const voiceEmotions = await this.analyzeVoiceEmotions(recentData.voiceData);
      
      // Analyze behavior patterns
      const behaviorEmotions = await this.analyzeBehaviorEmotions(recentData.behaviorData);
      
      // Combine all analyses
      const emotionalState = await this.combineEmotionalAnalyses(
        textEmotions,
        voiceEmotions,
        behaviorEmotions,
        context,
      );

      // Store emotional state
      await this.storeEmotionalState(userId, emotionalState);

      this.logger.log(`Emotional state analysis completed for user: ${userId}`);
      
      return emotionalState;
    } catch (error) {
      this.logger.error(`Error analyzing emotional state for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze emotions from text data
   */
  async analyzeTextEmotions(textData: string[]): Promise<TextEmotionAnalysis> {
    if (!textData || textData.length === 0) {
      return this.getDefaultTextEmotions();
    }

    try {
      // Use OpenAI for text emotion analysis
      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `Analyze the emotional content of the following text. Return a JSON object with:
                - sentiment: "positive", "neutral", or "negative"
                - emotions: object with joy, sadness, anger, fear, surprise, disgust (0-1 scale)
                - stressIndicators: array of stress-related phrases found
                - motivationIndicators: array of motivation-related phrases found
                - confidenceIndicators: array of confidence-related phrases found
                - learningReadiness: number 0-1 indicating readiness to learn`,
              },
              {
                role: 'user',
                content: `Analyze these texts for emotional content: ${textData.join(' ')}`,
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

      const analysis = JSON.parse(response.data.choices[0].message.content);
      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing text emotions:', error);
      return this.getDefaultTextEmotions();
    }
  }

  /**
   * Analyze emotions from voice data
   */
  async analyzeVoiceEmotions(voiceData: any[]): Promise<VoiceEmotionAnalysis> {
    if (!voiceData || voiceData.length === 0) {
      return this.getDefaultVoiceEmotions();
    }

    try {
      // Use Azure Cognitive Services for voice emotion analysis
      const azureApiKey = this.configService.get<string>('AZURE_SPEECH_API_KEY');
      const azureRegion = this.configService.get<string>('AZURE_SPEECH_REGION');
      
      const response = await firstValueFrom(
        this.httpService.post(
          `https://${azureRegion}.api.cognitive.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`,
          {
            audio: voiceData[0].audioData, // Assuming audio data is available
          },
          {
            headers: {
              'Ocp-Apim-Subscription-Key': azureApiKey,
              'Content-Type': 'audio/wav',
            },
          },
        ),
      );

      // Process voice analysis results
      const voiceAnalysis = this.processVoiceAnalysis(response.data);
      return voiceAnalysis;
    } catch (error) {
      this.logger.error('Error analyzing voice emotions:', error);
      return this.getDefaultVoiceEmotions();
    }
  }

  /**
   * Analyze emotions from behavior patterns
   */
  async analyzeBehaviorEmotions(behaviorData: any[]): Promise<BehaviorEmotionAnalysis> {
    if (!behaviorData || behaviorData.length === 0) {
      return this.getDefaultBehaviorEmotions();
    }

    try {
      // Analyze study patterns
      const studyPattern = this.analyzeStudyPattern(behaviorData);
      
      // Analyze engagement level
      const engagementLevel = this.calculateEngagementLevel(behaviorData);
      
      // Analyze persistence level
      const persistenceLevel = this.calculatePersistenceLevel(behaviorData);
      
      // Identify frustration signs
      const frustrationSigns = this.identifyFrustrationSigns(behaviorData);
      
      // Identify motivation signs
      const motivationSigns = this.identifyMotivationSigns(behaviorData);
      
      // Determine learning style
      const learningStyle = this.determineLearningStyle(behaviorData);
      
      // Determine social preference
      const socialPreference = this.determineSocialPreference(behaviorData);

      return {
        studyPattern,
        engagementLevel,
        persistenceLevel,
        frustrationSigns,
        motivationSigns,
        learningStyle,
        socialPreference,
      };
    } catch (error) {
      this.logger.error('Error analyzing behavior emotions:', error);
      return this.getDefaultBehaviorEmotions();
    }
  }

  /**
   * Combine all emotional analyses
   */
  private async combineEmotionalAnalyses(
    textEmotions: TextEmotionAnalysis,
    voiceEmotions: VoiceEmotionAnalysis,
    behaviorEmotions: BehaviorEmotionAnalysis,
    context: any,
  ): Promise<EmotionalState> {
    // Calculate overall mood
    const mood = this.calculateOverallMood(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate stress level
    const stressLevel = this.calculateStressLevel(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate motivation level
    const motivationLevel = this.calculateMotivationLevel(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate frustration
    const frustration = this.calculateFrustration(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate excitement
    const excitement = this.calculateExcitement(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate anxiety
    const anxiety = this.calculateAnxiety(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate satisfaction
    const satisfaction = this.calculateSatisfaction(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Determine overall sentiment
    const overallSentiment = this.determineOverallSentiment(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate emotional stability
    const emotionalStability = this.calculateEmotionalStability(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate learning readiness
    const learningReadiness = this.calculateLearningReadiness(textEmotions, voiceEmotions, behaviorEmotions);
    
    // Calculate social engagement
    const socialEngagement = this.calculateSocialEngagement(textEmotions, voiceEmotions, behaviorEmotions);

    return {
      mood,
      stressLevel,
      motivationLevel,
      confidence,
      frustration,
      excitement,
      anxiety,
      satisfaction,
      overallSentiment,
      emotionalStability,
      learningReadiness,
      socialEngagement,
      timestamp: new Date(),
    };
  }

  /**
   * Get current mood
   */
  async getCurrentMood(userId: string): Promise<string> {
    const recentState = await (this.prisma as any).emotionalState.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // DÜZELTME: timestamp yerine createdAt
    });

    return (recentState as any)?.overallMood || 'neutral'; // DÜZELTME: mood -> overallMood
  }

  /**
   * Get stress level
   */
  async getStressLevel(userId: string): Promise<number> {
    const recentState = await (this.prisma as any).emotionalState.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // DÜZELTME
    });

    return (recentState as any)?.stressLevel || 0.5;
  }

  /**
   * Get motivation level
   */
  async getMotivationLevel(userId: string): Promise<number> {
    const recentState = await (this.prisma as any).emotionalState.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // DÜZELTME
    });

    return (recentState as any)?.motivationLevel || 0.5;
  }

  /**
   * Store emotional state in database
   */
  private async storeEmotionalState(userId: string, emotionalState: EmotionalState): Promise<void> {
    // Prisma şemasına göre EmotionalState alanları eşleştirildi
    await (this.prisma as any).emotionalState.create({
      data: {
        userId,
        overallMood: emotionalState.mood,
        emotions: {
          mood: emotionalState.mood,
          frustration: emotionalState.frustration,
          excitement: emotionalState.excitement,
          anxiety: emotionalState.anxiety,
          satisfaction: emotionalState.satisfaction,
          overallSentiment: emotionalState.overallSentiment,
          emotionalStability: emotionalState.emotionalStability,
          learningReadiness: emotionalState.learningReadiness,
          socialEngagement: emotionalState.socialEngagement,
        } as any,
        stressLevel: emotionalState.stressLevel,
        energyLevel: emotionalState.learningReadiness,
        motivationLevel: emotionalState.motivationLevel,
        confidenceLevel: emotionalState.confidence,
        context: null,
        triggers: [],
        copingStrategies: [],
        recommendations: [],
        confidence: emotionalState.confidence,
      },
    });
  }

  /**
   * Get recent user data
   */
  private async getRecentUserData(userId: string): Promise<any> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // DÜZELTME: UserActivity modelinde content/audioData/type alanları yok; metinler için StudentJournal kullanıldı
    const journals = await (this.prisma as any).studentJournal.findMany({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
      select: { content: true },
    });

    const behaviorData = await (this.prisma as any).userActivity.findMany({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
      select: { activity: true, metadata: true }, // DÜZELTME: activity ve metadata seçildi
    });

    return {
      textData: journals.map((j: any) => j.content),
      voiceData: [], // DÜZELTME: voice verisi mevcut olmadığından boş
      behaviorData,
    };
  }

  // Helper methods for emotional calculations
  private calculateOverallMood(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): string {
    const textMood = text.sentiment === 'positive' ? 0.8 : text.sentiment === 'negative' ? 0.2 : 0.5;
    const voiceMood = voice.tone === 'confident' ? 0.9 : voice.tone === 'frustrated' ? 0.2 : 0.5;
    const behaviorMood = behavior.engagementLevel > 0.7 ? 0.8 : 0.4;
    
    const averageMood = (textMood + voiceMood + behaviorMood) / 3;
    
    if (averageMood > 0.7) return 'positive';
    if (averageMood < 0.3) return 'negative';
    return 'neutral';
  }

  private calculateStressLevel(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textStress = text.stressIndicators.length * 0.2;
    const voiceStress = voice.stressLevel;
    const behaviorStress = behavior.frustrationSigns.length * 0.15;
    
    return Math.min(1, (textStress + voiceStress + behaviorStress) / 3);
  }

  private calculateMotivationLevel(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textMotivation = text.motivationIndicators.length * 0.2;
    const voiceMotivation = voice.tone === 'excited' ? 0.9 : 0.5;
    const behaviorMotivation = behavior.motivationSigns.length * 0.2;
    
    return Math.min(1, (textMotivation + voiceMotivation + behaviorMotivation) / 3);
  }

  private calculateConfidence(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textConfidence = text.confidenceIndicators.length * 0.2;
    const voiceConfidence = voice.confidence;
    const behaviorConfidence = behavior.engagementLevel;
    
    return Math.min(1, (textConfidence + voiceConfidence + behaviorConfidence) / 3);
  }

  private calculateFrustration(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textFrustration = text.emotions.anger + text.emotions.sadness;
    const voiceFrustration = voice.tone === 'frustrated' ? 0.9 : 0.1;
    const behaviorFrustration = behavior.frustrationSigns.length * 0.2;
    
    return Math.min(1, (textFrustration + voiceFrustration + behaviorFrustration) / 3);
  }

  private calculateExcitement(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textExcitement = text.emotions.joy + text.emotions.surprise;
    const voiceExcitement = voice.tone === 'excited' ? 0.9 : 0.1;
    const behaviorExcitement = behavior.engagementLevel;
    
    return Math.min(1, (textExcitement + voiceExcitement + behaviorExcitement) / 3);
  }

  private calculateAnxiety(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textAnxiety = text.emotions.fear; // DÜZELTME: anxiety alanı yok, fear kullanıldı
    const voiceAnxiety = voice.tone === 'anxious' ? 0.9 : 0.1;
    const behaviorAnxiety = behavior.frustrationSigns.length * 0.15;
    
    return Math.min(1, (textAnxiety + voiceAnxiety + behaviorAnxiety) / 3);
  }

  private calculateSatisfaction(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textSatisfaction = text.sentiment === 'positive' ? 0.8 : 0.3;
    const voiceSatisfaction = voice.tone === 'calm' ? 0.8 : 0.4;
    const behaviorSatisfaction = behavior.engagementLevel;
    
    return Math.min(1, (textSatisfaction + voiceSatisfaction + behaviorSatisfaction) / 3);
  }

  private determineOverallSentiment(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): 'positive' | 'neutral' | 'negative' {
    const textSentiment = text.sentiment === 'positive' ? 0.8 : text.sentiment === 'negative' ? 0.2 : 0.5;
    const voiceSentiment = voice.tone === 'confident' ? 0.8 : voice.tone === 'frustrated' ? 0.2 : 0.5;
    const behaviorSentiment = behavior.engagementLevel > 0.7 ? 0.8 : 0.4;
    
    const averageSentiment = (textSentiment + voiceSentiment + behaviorSentiment) / 3;
    
    if (averageSentiment > 0.6) return 'positive';
    if (averageSentiment < 0.4) return 'negative';
    return 'neutral';
  }

  private calculateEmotionalStability(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    // Calculate stability based on consistency across different indicators
    const textStability = 1 - Math.abs(text.emotions.joy - text.emotions.sadness);
    const voiceStability = voice.tone === 'calm' ? 0.9 : 0.5;
    const behaviorStability = 1 - behavior.frustrationSigns.length * 0.1;
    
    return Math.min(1, (textStability + voiceStability + behaviorStability) / 3);
  }

  private calculateLearningReadiness(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textReadiness = text.learningReadiness;
    const voiceReadiness = voice.tone === 'excited' ? 0.9 : 0.5;
    const behaviorReadiness = behavior.engagementLevel;
    
    return Math.min(1, (textReadiness + voiceReadiness + behaviorReadiness) / 3);
  }

  private calculateSocialEngagement(text: TextEmotionAnalysis, voice: VoiceEmotionAnalysis, behavior: BehaviorEmotionAnalysis): number {
    const textSocial = text.sentiment === 'positive' ? 0.8 : 0.4;
    const voiceSocial = voice.tone === 'excited' ? 0.9 : 0.5;
    const behaviorSocial = behavior.socialPreference === 'high' ? 0.9 : 0.3;
    
    return Math.min(1, (textSocial + voiceSocial + behaviorSocial) / 3);
  }

  // Default values for when data is not available
  private getDefaultTextEmotions(): TextEmotionAnalysis {
    return {
      sentiment: 'neutral',
      emotions: { joy: 0.5, sadness: 0.3, anger: 0.2, fear: 0.2, surprise: 0.3, disgust: 0.1 },
      stressIndicators: [],
      motivationIndicators: [],
      confidenceIndicators: [],
      learningReadiness: 0.5,
    };
  }

  private getDefaultVoiceEmotions(): VoiceEmotionAnalysis {
    return {
      tone: 'calm',
      pitch: 0.5,
      pace: 0.5,
      volume: 0.5,
      stressLevel: 0.3,
      emotionalState: 'neutral',
      confidence: 0.5,
    };
  }

  private getDefaultBehaviorEmotions(): BehaviorEmotionAnalysis {
    return {
      studyPattern: 'regular',
      engagementLevel: 0.5,
      persistenceLevel: 0.5,
      frustrationSigns: [],
      motivationSigns: [],
      learningStyle: 'mixed',
      socialPreference: 'moderate',
    };
  }

  // Additional helper methods for behavior analysis
  private analyzeStudyPattern(behaviorData: any[]): string {
    // Analyze study patterns from behavior data
    return 'regular';
  }

  private calculateEngagementLevel(behaviorData: any[]): number {
    // Calculate engagement level from behavior data
    return 0.5;
  }

  private calculatePersistenceLevel(behaviorData: any[]): number {
    // Calculate persistence level from behavior data
    return 0.5;
  }

  private identifyFrustrationSigns(behaviorData: any[]): string[] {
    // Identify frustration signs from behavior data
    return [];
  }

  private identifyMotivationSigns(behaviorData: any[]): string[] {
    // Identify motivation signs from behavior data
    return [];
  }

  private determineLearningStyle(behaviorData: any[]): string {
    // Determine learning style from behavior data
    return 'mixed';
  }

  private determineSocialPreference(behaviorData: any[]): string {
    // Determine social preference from behavior data
    return 'moderate';
  }

  private processVoiceAnalysis(voiceData: any): VoiceEmotionAnalysis {
    // Process voice analysis results
    return this.getDefaultVoiceEmotions();
  }
}