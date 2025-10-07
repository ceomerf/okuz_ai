import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CacheService } from '../common/cache/cache.service';

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  type: string;
  template: string;
  variables: string[];
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptContext {
  [key: string]: any;
}

export interface PromptResult {
  prompt: string;
  template: PromptTemplate;
  variables: Record<string, any>;
  renderedAt: Date;
}

@Injectable()
export class PromptRegistry {
  private readonly logger = new Logger(PromptRegistry.name);
  private readonly templates: Map<string, PromptTemplate> = new Map();
  private readonly typeIndex: Map<string, Set<string>> = new Map();

  constructor(private readonly cache: CacheService) {
    this.initializeDefaultPrompts();
  }

  /**
   * Varsayılan prompt'ları başlat
   */
  private initializeDefaultPrompts(): void {
    // Plan generation prompts
    this.registerPrompt({
      id: 'plan_generation_basic',
      name: 'Basic Plan Generation',
      version: '1.0.0',
      type: 'plan_generation',
      template: `Create a personalized study plan for a student.

Student Profile:
- Name: {{studentName}}
- Grade: {{grade}}
- Learning Style: {{learningStyle}}
- Current Level: {{currentLevel}}
- Goals: {{goals}}
- Available Time: {{availableTime}} minutes per day
- Subjects: {{subjects}}

Weak Areas: {{weakAreas}}
Strong Areas: {{strongAreas}}
Topic Success Rates: {{topicSuccessRates}}

Please create a detailed study plan with:
1. Weekly structure
2. Daily sessions
3. Subject distribution
4. Difficulty progression
5. Study techniques

Format the response as JSON with the following structure:
{
  "plan": {
    "title": "Plan Title",
    "description": "Plan Description",
    "subjects": ["Subject1", "Subject2"],
    "goals": ["Goal1", "Goal2"],
    "weeks": [...],
    "totalSessions": 20,
    "duration": 7
  },
  "sessions": [
    {
      "subject": "Mathematics",
      "topic": "Algebra",
      "duration": 60,
      "difficulty": "medium",
      "type": "study",
      "startTime": "2024-01-01T09:00:00Z",
      "objectives": ["Learn basic algebra"],
      "resources": ["Textbook", "Practice problems"],
      "techniques": ["Problem solving", "Practice"]
    }
  ]
}`,
      variables: [
        'studentName', 'grade', 'learningStyle', 'currentLevel', 
        'goals', 'availableTime', 'subjects', 'weakAreas', 
        'strongAreas', 'topicSuccessRates'
      ],
      description: 'Basic plan generation prompt for creating personalized study plans',
      tags: ['planning', 'education', 'personalization'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Plan optimization prompts
    this.registerPrompt({
      id: 'plan_optimization',
      name: 'Plan Optimization',
      version: '1.0.0',
      type: 'plan_optimization',
      template: `Optimize the following study plan based on student performance and preferences.

Current Plan:
{{currentPlan}}

Student Performance:
- Completion Rate: {{completionRate}}%
- Average Score: {{averageScore}}
- Time Spent: {{timeSpent}} hours
- Weak Subjects: {{weakSubjects}}
- Strong Subjects: {{strongSubjects}}

Optimization Goals:
- Focus on weak areas: {{focusWeakAreas}}
- Balance subjects: {{balanceSubjects}}
- Optimize timing: {{optimizeTiming}}
- Adjust difficulty: {{adjustDifficulty}}

Please provide optimized plan with:
1. Improved subject distribution
2. Better time allocation
3. Difficulty adjustments
4. Performance improvements

Format as JSON with optimization details and reasoning.`,
      variables: [
        'currentPlan', 'completionRate', 'averageScore', 'timeSpent',
        'weakSubjects', 'strongSubjects', 'focusWeakAreas', 
        'balanceSubjects', 'optimizeTiming', 'adjustDifficulty'
      ],
      description: 'Plan optimization prompt for improving existing study plans',
      tags: ['optimization', 'planning', 'performance'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Content generation prompts
    this.registerPrompt({
      id: 'content_generation_flashcards',
      name: 'Flashcard Generation',
      version: '1.0.0',
      type: 'content_generation',
      template: `Generate educational flashcards for the following topic.

Topic: {{topic}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Difficulty: {{difficulty}}
Number of Cards: {{count}}

Please create flashcards with:
- Clear, concise questions
- Accurate, detailed answers
- Appropriate difficulty level
- Educational value

Format as JSON array:
[
  {
    "question": "What is...?",
    "answer": "The answer is...",
    "difficulty": "easy|medium|hard",
    "tags": ["tag1", "tag2"]
  }
]`,
      variables: ['topic', 'subject', 'gradeLevel', 'difficulty', 'count'],
      description: 'Generate educational flashcards for any topic',
      tags: ['content', 'education', 'flashcards'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Analysis prompts
    this.registerPrompt({
      id: 'performance_analysis',
      name: 'Performance Analysis',
      version: '1.0.0',
      type: 'analysis',
      template: `Analyze student performance data and provide insights.

Student Data:
- Study Sessions: {{studySessions}}
- Exam Results: {{examResults}}
- Time Spent: {{timeSpent}}
- Completion Rate: {{completionRate}}
- Subject Performance: {{subjectPerformance}}

Analysis Focus:
- Strengths and weaknesses
- Learning patterns
- Improvement areas
- Recommendations

Provide detailed analysis with:
1. Performance summary
2. Key insights
3. Strengths identified
4. Areas for improvement
5. Specific recommendations
6. Next steps

Format as structured JSON with clear sections.`,
      variables: [
        'studySessions', 'examResults', 'timeSpent', 
        'completionRate', 'subjectPerformance'
      ],
      description: 'Analyze student performance and provide actionable insights',
      tags: ['analysis', 'performance', 'insights'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Coaching prompts
    this.registerPrompt({
      id: 'coaching_motivation',
      name: 'Motivational Coaching',
      version: '1.0.0',
      type: 'coaching',
      template: `Provide motivational coaching and study advice.

Student Context:
- Name: {{studentName}}
- Current Performance: {{currentPerformance}}
- Recent Achievements: {{recentAchievements}}
- Challenges: {{challenges}}
- Goals: {{goals}}
- Study Style: {{studyStyle}}

Coaching Focus:
- Motivation and encouragement
- Study strategies
- Goal setting
- Overcoming challenges
- Building confidence

Provide personalized coaching with:
1. Motivational message
2. Study strategy recommendations
3. Goal-setting advice
4. Challenge solutions
5. Confidence building tips

Be encouraging, specific, and actionable.`,
      variables: [
        'studentName', 'currentPerformance', 'recentAchievements',
        'challenges', 'goals', 'studyStyle'
      ],
      description: 'Provide motivational coaching and study advice',
      tags: ['coaching', 'motivation', 'advice'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Question solving prompts
    this.registerPrompt({
      id: 'question_solving',
      name: 'Question Solving',
      version: '1.0.0',
      type: 'question_solving',
      template: `Solve the following educational question step by step.

Question: {{question}}
Subject: {{subject}}
Grade Level: {{gradeLevel}}
Question Type: {{questionType}}

Please provide:
1. Step-by-step solution
2. Explanation of each step
3. Key concepts used
4. Alternative approaches (if any)
5. Common mistakes to avoid
6. Practice recommendations

Format the response clearly with numbered steps and explanations.`,
      variables: ['question', 'subject', 'gradeLevel', 'questionType'],
      description: 'Solve educational questions with step-by-step explanations',
      tags: ['solving', 'education', 'explanation'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Quick chat prompts
    this.registerPrompt({
      id: 'quick_chat',
      name: 'Quick Chat',
      version: '1.0.0',
      type: 'quick_chat',
      template: `You are a helpful educational assistant. Respond to the student's question in a friendly, informative way.

Student Question: {{question}}
Context: {{context}}
Subject: {{subject}}

Provide a helpful, accurate response that:
- Answers the question directly
- Provides additional context if helpful
- Suggests related topics to explore
- Encourages further learning

Keep the response concise but informative.`,
      variables: ['question', 'context', 'subject'],
      description: 'Quick chat responses for student questions',
      tags: ['chat', 'support', 'education'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(`Initialized ${this.templates.size} default prompts`);
  }

  /**
   * Prompt kaydet
   */
  registerPrompt(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    
    // Type index'e ekle
    if (!this.typeIndex.has(template.type)) {
      this.typeIndex.set(template.type, new Set());
    }
    this.typeIndex.get(template.type)!.add(template.id);
    
    this.logger.log(`Registered prompt: ${template.id} (${template.type})`);
  }

  /**
   * Prompt getir
   */
  async getPrompt(promptType: string, context: PromptContext = {}): Promise<string> {
    try {
      // Cache kontrolü
      const cacheKey = `prompt:${promptType}:${JSON.stringify(context)}`;
      const cached = await this.cache.get<string>(cacheKey);
      if (cached) {
        return cached;
      }

      // Template bul
      const template = this.findTemplateByType(promptType);
      if (!template) {
        throw new NotFoundException(`Prompt template not found for type: ${promptType}`);
      }

      // Prompt render et
      const result = this.renderPrompt(template, context);
      
      // Cache'e kaydet
      await this.cache.set(cacheKey, result.prompt, 3600); // 1 saat

      return result.prompt;
    } catch (error) {
      this.logger.error(`Failed to get prompt for type: ${promptType}`, {
        error: (error instanceof Error ? error.message : String(error)),
        context,
      });
      throw error;
    }
  }

  /**
   * Template bul
   */
  private findTemplateByType(type: string): PromptTemplate | undefined {
    const typeTemplates = this.typeIndex.get(type);
    if (!typeTemplates || typeTemplates.size === 0) {
      return undefined;
    }

    // En son güncellenen template'i al
    let latestTemplate: PromptTemplate | undefined;
    let latestDate = new Date(0);

    for (const templateId of typeTemplates) {
      const template = this.templates.get(templateId);
      if (template && template.updatedAt > latestDate) {
        latestTemplate = template;
        latestDate = template.updatedAt;
      }
    }

    return latestTemplate;
  }

  /**
   * Prompt render et
   */
  private renderPrompt(template: PromptTemplate, context: PromptContext): PromptResult {
    let renderedPrompt = template.template;
    const usedVariables: Record<string, any> = {};

    // Template değişkenlerini değiştir
    for (const variable of template.variables) {
      const value = context[variable];
      if (value !== undefined) {
        const placeholder = `{{${variable}}}`;
        renderedPrompt = renderedPrompt.replace(new RegExp(placeholder, 'g'), String(value));
        usedVariables[variable] = value;
      }
    }

    return {
      prompt: renderedPrompt,
      template,
      variables: usedVariables,
      renderedAt: new Date(),
    };
  }

  /**
   * Template getir
   */
  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Type'a göre template'leri getir
   */
  getTemplatesByType(type: string): PromptTemplate[] {
    const typeTemplates = this.typeIndex.get(type);
    if (!typeTemplates) return [];

    return Array.from(typeTemplates)
      .map(id => this.templates.get(id))
      .filter((template): template is PromptTemplate => template !== undefined);
  }

  /**
   * Tüm template'leri getir
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Template güncelle
   */
  updateTemplate(templateId: string, updates: Partial<PromptTemplate>): void {
    const existing = this.templates.get(templateId);
    if (!existing) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);
    this.logger.log(`Updated template: ${templateId}`);
  }

  /**
   * Template sil
   */
  deleteTemplate(templateId: string): void {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    // Type index'ten kaldır
    const typeTemplates = this.typeIndex.get(template.type);
    if (typeTemplates) {
      typeTemplates.delete(templateId);
    }

    this.templates.delete(templateId);
    this.logger.log(`Deleted template: ${templateId}`);
  }

  /**
   * Template arama
   */
  searchTemplates(query: {
    type?: string;
    tags?: string[];
    name?: string;
  }): PromptTemplate[] {
    let results = Array.from(this.templates.values());

    if (query.type) {
      results = results.filter(template => template.type === query.type);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(template =>
        query.tags!.some(tag => template.tags.includes(tag))
      );
    }

    if (query.name) {
      const nameRegex = new RegExp(query.name, 'i');
      results = results.filter(template => nameRegex.test(template.name));
    }

    return results;
  }

  /**
   * Template istatistikleri
   */
  getTemplateStats(): {
    totalTemplates: number;
    templatesByType: Record<string, number>;
    templatesByVersion: Record<string, number>;
    averageVariables: number;
  } {
    const templates = Array.from(this.templates.values());
    
    const templatesByType: Record<string, number> = {};
    const templatesByVersion: Record<string, number> = {};
    let totalVariables = 0;

    templates.forEach(template => {
      // Type istatistikleri
      templatesByType[template.type] = (templatesByType[template.type] || 0) + 1;
      
      // Version istatistikleri
      templatesByVersion[template.version] = (templatesByVersion[template.version] || 0) + 1;
      
      // Variable sayısı
      totalVariables += template.variables.length;
    });

    return {
      totalTemplates: templates.length,
      templatesByType,
      templatesByVersion,
      averageVariables: templates.length > 0 ? totalVariables / templates.length : 0,
    };
  }

  /**
   * Template validasyonu
   */
  validateTemplate(template: PromptTemplate): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Gerekli alanlar
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.type) errors.push('Template type is required');
    if (!template.template) errors.push('Template content is required');

    // Template içeriği kontrolü
    if (template.template) {
      const variableMatches = template.template.match(/\{\{(\w+)\}\}/g);
      const templateVariables = variableMatches ? 
        variableMatches.map(match => match.replace(/\{\{|\}\}/g, '')) : [];
      
      // Tanımlanmamış değişkenler
      const undefinedVariables = templateVariables.filter(
        variable => !template.variables.includes(variable)
      );
      
      if (undefinedVariables.length > 0) {
        warnings.push(`Undefined variables in template: ${undefinedVariables.join(', ')}`);
      }

      // Kullanılmayan değişkenler
      const unusedVariables = template.variables.filter(
        variable => !templateVariables.includes(variable)
      );
      
      if (unusedVariables.length > 0) {
        warnings.push(`Unused variables: ${unusedVariables.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
