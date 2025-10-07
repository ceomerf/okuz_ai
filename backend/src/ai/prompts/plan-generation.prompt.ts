import { PromptTemplate } from '../prompt-registry.service';

export const PLAN_GENERATION_PROMPTS: PromptTemplate[] = [
  {
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
  },

  {
    id: 'plan_generation_advanced',
    name: 'Advanced Plan Generation',
    version: '1.1.0',
    type: 'plan_generation',
    template: `Create an advanced, AI-optimized study plan for a student with comprehensive analysis.

Student Profile:
- Name: {{studentName}}
- Grade: {{grade}}
- Learning Style: {{learningStyle}}
- Current Level: {{currentLevel}}
- Goals: {{goals}}
- Available Time: {{availableTime}} minutes per day
- Subjects: {{subjects}}
- Target Exam: {{targetExam}}
- Plan Duration: {{planDurationDays}} days

Performance Analysis:
- Weak Areas: {{weakAreas}}
- Strong Areas: {{strongAreas}}
- Topic Success Rates: {{topicSuccessRates}}
- Subject Performance: {{subjectPerformance}}
- Preferred Study Hours: {{preferredStudyHours}}
- Subject Time Allocation: {{subjectTimeAllocation}}

Curriculum Context:
- Topic Order: {{topicOrder}}
- Prerequisites: {{prerequisites}}
- Exam Focus: {{examFocus}}

Create an advanced study plan with:
1. Adaptive learning progression
2. Personalized difficulty scaling
3. Optimal time distribution
4. Subject-specific strategies
5. Performance tracking milestones
6. Revision and reinforcement cycles
7. Exam preparation phases

Format as comprehensive JSON with detailed session planning, learning objectives, and performance metrics.`,
    variables: [
      'studentName', 'grade', 'learningStyle', 'currentLevel', 
      'goals', 'availableTime', 'subjects', 'targetExam', 'planDurationDays',
      'weakAreas', 'strongAreas', 'topicSuccessRates', 'subjectPerformance',
      'preferredStudyHours', 'subjectTimeAllocation', 'topicOrder', 
      'prerequisites', 'examFocus'
    ],
    description: 'Advanced plan generation with comprehensive analysis and optimization',
    tags: ['planning', 'education', 'personalization', 'advanced', 'optimization'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'plan_generation_weekly',
    name: 'Weekly Plan Generation',
    version: '1.0.0',
    type: 'plan_generation',
    template: `Generate a focused weekly study plan.

Student Context:
- Name: {{studentName}}
- Grade: {{grade}}
- Current Week: Week {{weekNumber}}
- Focus Areas: {{focusAreas}}
- Available Time: {{availableTime}} minutes per day
- Subjects: {{subjects}}

Previous Week Performance:
- Completion Rate: {{completionRate}}%
- Average Score: {{averageScore}}
- Time Spent: {{timeSpent}} hours
- Challenges: {{challenges}}

Create a weekly plan with:
1. Daily study schedule
2. Subject rotation
3. Review sessions
4. Practice exercises
5. Assessment points
6. Break periods

Format as JSON with daily breakdown and specific activities.`,
    variables: [
      'studentName', 'grade', 'weekNumber', 'focusAreas', 
      'availableTime', 'subjects', 'completionRate', 
      'averageScore', 'timeSpent', 'challenges'
    ],
    description: 'Generate focused weekly study plans',
    tags: ['planning', 'weekly', 'education'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: 'plan_generation_holiday',
    name: 'Holiday Plan Generation',
    version: '1.0.0',
    type: 'plan_generation',
    template: `Create a holiday study plan that balances learning with relaxation.

Student Profile:
- Name: {{studentName}}
- Grade: {{grade}}
- Holiday Duration: {{holidayDuration}} days
- Holiday Type: {{holidayType}}
- Available Time: {{availableTime}} minutes per day
- Subjects: {{subjects}}
- Goals: {{goals}}

Holiday Context:
- Family Time: {{familyTime}} hours
- Relaxation: {{relaxationTime}} hours
- Travel: {{travelTime}} hours
- Special Activities: {{specialActivities}}

Create a balanced holiday plan with:
1. Light study sessions
2. Review and reinforcement
3. Fun learning activities
4. Reading assignments
5. Project-based learning
6. Family learning time
7. Relaxation periods

Format as JSON with flexible scheduling and engaging activities.`,
    variables: [
      'studentName', 'grade', 'holidayDuration', 'holidayType',
      'availableTime', 'subjects', 'goals', 'familyTime',
      'relaxationTime', 'travelTime', 'specialActivities'
    ],
    description: 'Create balanced holiday study plans',
    tags: ['planning', 'holiday', 'balance', 'education'],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];
