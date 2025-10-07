import { PromptTemplate } from '../prompt-registry.service';

export const ANALYSIS_PROMPTS: PromptTemplate[] = [
  {
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
  },

  {
    id: 'learning_pattern_analysis',
    name: 'Learning Pattern Analysis',
    version: '1.0.0',
    type: 'analysis',
    template: `Analyze student learning patterns and behaviors.

Learning Data:
- Study Times: {{studyTimes}}
- Session Duration: {{sessionDuration}}
- Break Patterns: {{breakPatterns}}
- Subject Preferences: {{subjectPreferences}}
- Difficulty Progression: {{difficultyProgression}}

Performance Metrics:
- Success Rate: {{successRate}}
- Time Efficiency: {{timeEfficiency}}
- Retention Rate: {{retentionRate}}
- Engagement Level: {{engagementLevel}}

Behavioral Patterns:
- Peak Performance Hours: {{peakHours}}
- Effective Study Techniques: {{effectiveTechniques}}
- Challenging Areas: {{challengingAreas}}
- Motivation Factors: {{motivationFactors}}

Provide analysis with:
1. Learning pattern identification
2. Behavioral insights
3. Optimal study conditions
4. Personalized recommendations
5. Habit formation strategies

Format as detailed JSON with pattern analysis and recommendations.`,
    variables: [
      'studyTimes', 'sessionDuration', 'breakPatterns', 'subjectPreferences',
      'difficultyProgression', 'successRate', 'timeEfficiency', 'retentionRate',
      'engagementLevel', 'peakHours', 'effectiveTechniques', 'challengingAreas',
      'motivationFactors'
    ],
    description: 'Analyze learning patterns and behaviors',
    tags: ['analysis', 'learning', 'patterns', 'behavior'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'progress_tracking_analysis',
    name: 'Progress Tracking Analysis',
    version: '1.0.0',
    type: 'analysis',
    template: `Analyze student progress over time and identify trends.

Progress Data:
- Time Period: {{timePeriod}}
- Starting Level: {{startingLevel}}
- Current Level: {{currentLevel}}
- Progress Rate: {{progressRate}}
- Milestones Achieved: {{milestones}}

Subject Progress:
- Mathematics: {{mathProgress}}
- Science: {{scienceProgress}}
- Language: {{languageProgress}}
- Other Subjects: {{otherSubjectsProgress}}

Performance Trends:
- Improvement Areas: {{improvementAreas}}
- Consistent Strengths: {{consistentStrengths}}
- Fluctuating Performance: {{fluctuatingPerformance}}
- Plateaus: {{plateaus}}

Provide analysis with:
1. Progress trajectory
2. Trend identification
3. Milestone analysis
4. Performance predictions
5. Intervention recommendations

Format as JSON with progress charts and trend analysis.`,
    variables: [
      'timePeriod', 'startingLevel', 'currentLevel', 'progressRate', 'milestones',
      'mathProgress', 'scienceProgress', 'languageProgress', 'otherSubjectsProgress',
      'improvementAreas', 'consistentStrengths', 'fluctuatingPerformance', 'plateaus'
    ],
    description: 'Analyze progress trends and trajectories',
    tags: ['analysis', 'progress', 'trends', 'tracking'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'weakness_analysis',
    name: 'Weakness Analysis',
    version: '1.0.0',
    type: 'analysis',
    template: `Analyze student weaknesses and provide targeted improvement strategies.

Weakness Data:
- Identified Weaknesses: {{identifiedWeaknesses}}
- Severity Levels: {{severityLevels}}
- Impact on Performance: {{impactOnPerformance}}
- Root Causes: {{rootCauses}}

Subject-Specific Weaknesses:
- Mathematics: {{mathWeaknesses}}
- Science: {{scienceWeaknesses}}
- Language: {{languageWeaknesses}}
- Other Subjects: {{otherWeaknesses}}

Learning Barriers:
- Conceptual Gaps: {{conceptualGaps}}
- Skill Deficiencies: {{skillDeficiencies}}
- Motivation Issues: {{motivationIssues}}
- Study Habits: {{studyHabits}}

Provide analysis with:
1. Weakness categorization
2. Root cause analysis
3. Impact assessment
4. Targeted interventions
5. Improvement strategies
6. Progress monitoring

Format as JSON with detailed weakness analysis and action plans.`,
    variables: [
      'identifiedWeaknesses', 'severityLevels', 'impactOnPerformance', 'rootCauses',
      'mathWeaknesses', 'scienceWeaknesses', 'languageWeaknesses', 'otherWeaknesses',
      'conceptualGaps', 'skillDeficiencies', 'motivationIssues', 'studyHabits'
    ],
    description: 'Analyze weaknesses and provide improvement strategies',
    tags: ['analysis', 'weaknesses', 'improvement', 'intervention'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'strength_analysis',
    name: 'Strength Analysis',
    version: '1.0.0',
    type: 'analysis',
    template: `Analyze student strengths and leverage them for optimal learning.

Strength Data:
- Identified Strengths: {{identifiedStrengths}}
- Strength Levels: {{strengthLevels}}
- Performance Impact: {{performanceImpact}}
- Development Potential: {{developmentPotential}}

Subject-Specific Strengths:
- Mathematics: {{mathStrengths}}
- Science: {{scienceStrengths}}
- Language: {{languageStrengths}}
- Other Subjects: {{otherStrengths}}

Learning Advantages:
- Natural Abilities: {{naturalAbilities}}
- Developed Skills: {{developedSkills}}
- Learning Preferences: {{learningPreferences}}
- Study Techniques: {{studyTechniques}}

Provide analysis with:
1. Strength categorization
2. Performance impact
3. Development opportunities
4. Leverage strategies
5. Advanced challenges
6. Mentoring opportunities

Format as JSON with strength analysis and development plans.`,
    variables: [
      'identifiedStrengths', 'strengthLevels', 'performanceImpact', 'developmentPotential',
      'mathStrengths', 'scienceStrengths', 'languageStrengths', 'otherStrengths',
      'naturalAbilities', 'developedSkills', 'learningPreferences', 'studyTechniques'
    ],
    description: 'Analyze strengths and leverage them for learning',
    tags: ['analysis', 'strengths', 'development', 'leverage'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];
