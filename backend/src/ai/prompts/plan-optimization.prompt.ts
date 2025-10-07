import { PromptTemplate } from '../prompt-registry.service';

export const PLAN_OPTIMIZATION_PROMPTS: PromptTemplate[] = [
  {
    id: 'plan_optimization_basic',
    name: 'Basic Plan Optimization',
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
    description: 'Basic plan optimization based on performance data',
    tags: ['optimization', 'planning', 'performance'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'plan_optimization_advanced',
    name: 'Advanced Plan Optimization',
    version: '1.1.0',
    type: 'plan_optimization',
    template: `Perform advanced optimization of the study plan using AI-driven insights.

Current Plan Analysis:
- Plan Structure: {{planStructure}}
- Session Distribution: {{sessionDistribution}}
- Time Allocation: {{timeAllocation}}
- Difficulty Progression: {{difficultyProgression}}

Student Performance Metrics:
- Overall Completion: {{completionRate}}%
- Subject Performance: {{subjectPerformance}}
- Time Efficiency: {{timeEfficiency}}
- Learning Velocity: {{learningVelocity}}
- Retention Rate: {{retentionRate}}

Learning Patterns:
- Peak Performance Hours: {{peakHours}}
- Preferred Study Duration: {{preferredDuration}}
- Effective Techniques: {{effectiveTechniques}}
- Challenging Areas: {{challengingAreas}}

Optimization Parameters:
- Focus Areas: {{focusAreas}}
- Balance Requirements: {{balanceRequirements}}
- Time Constraints: {{timeConstraints}}
- Difficulty Preferences: {{difficultyPreferences}}
- Learning Style: {{learningStyle}}

Provide comprehensive optimization with:
1. Performance-based adjustments
2. Learning pattern optimization
3. Time efficiency improvements
4. Difficulty curve optimization
5. Subject balance enhancement
6. Technique recommendations
7. Milestone adjustments

Format as detailed JSON with optimization rationale and expected improvements.`,
    variables: [
      'planStructure', 'sessionDistribution', 'timeAllocation', 'difficultyProgression',
      'completionRate', 'subjectPerformance', 'timeEfficiency', 'learningVelocity',
      'retentionRate', 'peakHours', 'preferredDuration', 'effectiveTechniques',
      'challengingAreas', 'focusAreas', 'balanceRequirements', 'timeConstraints',
      'difficultyPreferences', 'learningStyle'
    ],
    description: 'Advanced AI-driven plan optimization with comprehensive analysis',
    tags: ['optimization', 'advanced', 'ai-driven', 'performance'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'plan_optimization_time',
    name: 'Time-based Optimization',
    version: '1.0.0',
    type: 'plan_optimization',
    template: `Optimize study plan timing and scheduling for maximum efficiency.

Current Schedule:
{{currentSchedule}}

Time Analysis:
- Available Time: {{availableTime}} hours
- Peak Performance: {{peakPerformance}} hours
- Break Requirements: {{breakRequirements}} minutes
- Family Time: {{familyTime}} hours
- Other Commitments: {{otherCommitments}} hours

Student Preferences:
- Preferred Start Time: {{preferredStartTime}}
- Preferred End Time: {{preferredEndTime}}
- Break Frequency: {{breakFrequency}} minutes
- Study Session Length: {{sessionLength}} minutes

Optimization Focus:
- Time Efficiency: {{timeEfficiency}}
- Energy Management: {{energyManagement}}
- Break Optimization: {{breakOptimization}}
- Schedule Flexibility: {{scheduleFlexibility}}

Create optimized schedule with:
1. Optimal time slots
2. Break distribution
3. Energy-based scheduling
4. Flexible adjustments
5. Peak performance utilization

Format as JSON with detailed time allocation and scheduling rationale.`,
    variables: [
      'currentSchedule', 'availableTime', 'peakPerformance', 'breakRequirements',
      'familyTime', 'otherCommitments', 'preferredStartTime', 'preferredEndTime',
      'breakFrequency', 'sessionLength', 'timeEfficiency', 'energyManagement',
      'breakOptimization', 'scheduleFlexibility'
    ],
    description: 'Optimize study plan timing and scheduling',
    tags: ['optimization', 'timing', 'scheduling', 'efficiency'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'plan_optimization_difficulty',
    name: 'Difficulty Optimization',
    version: '1.0.0',
    type: 'plan_optimization',
    template: `Optimize study plan difficulty progression for optimal learning.

Current Difficulty Distribution:
{{currentDifficulty}}

Student Capability:
- Current Level: {{currentLevel}}
- Learning Speed: {{learningSpeed}}
- Challenge Tolerance: {{challengeTolerance}}
- Frustration Threshold: {{frustrationThreshold}}

Performance Data:
- Success Rate by Difficulty: {{successRateByDifficulty}}
- Time Spent by Difficulty: {{timeSpentByDifficulty}}
- Engagement Level: {{engagementLevel}}
- Retention Rate: {{retentionRate}}

Optimization Goals:
- Gradual Progression: {{gradualProgression}}
- Challenge Level: {{challengeLevel}}
- Success Rate: {{targetSuccessRate}}
- Engagement: {{targetEngagement}}

Create optimized difficulty progression with:
1. Gradual difficulty increase
2. Appropriate challenge levels
3. Success rate optimization
4. Engagement maintenance
5. Learning curve adjustment

Format as JSON with difficulty progression and learning curve analysis.`,
    variables: [
      'currentDifficulty', 'currentLevel', 'learningSpeed', 'challengeTolerance',
      'frustrationThreshold', 'successRateByDifficulty', 'timeSpentByDifficulty',
      'engagementLevel', 'retentionRate', 'gradualProgression', 'challengeLevel',
      'targetSuccessRate', 'targetEngagement'
    ],
    description: 'Optimize difficulty progression for optimal learning',
    tags: ['optimization', 'difficulty', 'progression', 'learning'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];
