import { PromptTemplate } from '../prompt-registry.service';

export const COACHING_PROMPTS: PromptTemplate[] = [
  {
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
  },

  {
    id: 'coaching_strategy',
    name: 'Study Strategy Coaching',
    version: '1.0.0',
    type: 'coaching',
    template: `Provide personalized study strategy coaching.

Student Profile:
- Name: {{studentName}}
- Learning Style: {{learningStyle}}
- Current Challenges: {{currentChallenges}}
- Study Habits: {{studyHabits}}
- Time Management: {{timeManagement}}

Performance Context:
- Recent Performance: {{recentPerformance}}
- Study Efficiency: {{studyEfficiency}}
- Retention Rate: {{retentionRate}}
- Engagement Level: {{engagementLevel}}

Strategy Focus:
- Study Techniques: {{studyTechniques}}
- Time Management: {{timeManagement}}
- Note-taking: {{noteTaking}}
- Review Methods: {{reviewMethods}}
- Test Preparation: {{testPreparation}}

Provide coaching with:
1. Personalized study strategies
2. Technique recommendations
3. Habit formation advice
4. Efficiency improvements
5. Long-term planning

Format as actionable advice with specific techniques.`,
    variables: [
      'studentName', 'learningStyle', 'currentChallenges', 'studyHabits',
      'timeManagement', 'recentPerformance', 'studyEfficiency', 'retentionRate',
      'engagementLevel', 'studyTechniques', 'timeManagement', 'noteTaking',
      'reviewMethods', 'testPreparation'
    ],
    description: 'Provide personalized study strategy coaching',
    tags: ['coaching', 'strategy', 'study', 'techniques'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'coaching_goal_setting',
    name: 'Goal Setting Coaching',
    version: '1.0.0',
    type: 'coaching',
    template: `Provide goal-setting coaching and planning guidance.

Student Context:
- Name: {{studentName}}
- Current Goals: {{currentGoals}}
- Achievement History: {{achievementHistory}}
- Motivation Level: {{motivationLevel}}
- Time Horizon: {{timeHorizon}}

Goal Setting Focus:
- Short-term goals (1-3 months)
- Medium-term goals (3-6 months)
- Long-term goals (6+ months)
- SMART criteria
- Action planning

Provide coaching with:
1. Goal assessment and refinement
2. SMART goal creation
3. Action plan development
4. Milestone setting
5. Progress tracking methods
6. Motivation maintenance

Format as structured goal-setting guidance with templates.`,
    variables: [
      'studentName', 'currentGoals', 'achievementHistory', 'motivationLevel',
      'timeHorizon'
    ],
    description: 'Provide goal-setting coaching and planning guidance',
    tags: ['coaching', 'goals', 'planning', 'motivation'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'coaching_problem_solving',
    name: 'Problem Solving Coaching',
    version: '1.0.0',
    type: 'coaching',
    template: `Provide problem-solving coaching for academic challenges.

Student Context:
- Name: {{studentName}}
- Current Problem: {{currentProblem}}
- Problem Type: {{problemType}}
- Attempted Solutions: {{attemptedSolutions}}
- Emotional State: {{emotionalState}}

Problem Analysis:
- Problem Description: {{problemDescription}}
- Root Causes: {{rootCauses}}
- Impact Assessment: {{impactAssessment}}
- Available Resources: {{availableResources}}

Coaching Approach:
- Problem breakdown
- Solution brainstorming
- Implementation planning
- Progress monitoring
- Emotional support

Provide coaching with:
1. Problem analysis and breakdown
2. Solution brainstorming
3. Implementation strategies
4. Progress monitoring
5. Emotional support and encouragement

Format as step-by-step problem-solving guidance.`,
    variables: [
      'studentName', 'currentProblem', 'problemType', 'attemptedSolutions',
      'emotionalState', 'problemDescription', 'rootCauses', 'impactAssessment',
      'availableResources'
    ],
    description: 'Provide problem-solving coaching for academic challenges',
    tags: ['coaching', 'problem-solving', 'support', 'guidance'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'coaching_confidence',
    name: 'Confidence Building Coaching',
    version: '1.0.0',
    type: 'coaching',
    template: `Provide confidence-building coaching and encouragement.

Student Context:
- Name: {{studentName}}
- Current Confidence Level: {{confidenceLevel}}
- Self-Doubt Areas: {{selfDoubtAreas}}
- Recent Setbacks: {{recentSetbacks}}
- Strengths: {{strengths}}

Confidence Building Focus:
- Self-awareness development
- Strength recognition
- Challenge reframing
- Success celebration
- Growth mindset

Provide coaching with:
1. Confidence assessment
2. Strength recognition
3. Challenge reframing
4. Success strategies
5. Positive reinforcement
6. Growth mindset development

Format as encouraging and supportive guidance.`,
    variables: [
      'studentName', 'confidenceLevel', 'selfDoubtAreas', 'recentSetbacks',
      'strengths'
    ],
    description: 'Provide confidence-building coaching and encouragement',
    tags: ['coaching', 'confidence', 'encouragement', 'growth'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];
