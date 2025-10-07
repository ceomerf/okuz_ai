import { User, Plan, StudySession, AiRequestLog, AiPromptTemplate } from '@prisma/client';

// Test user fixtures
export const testUsers: Partial<User>[] = [
  {
    id: 'test-user-1',
    email: 'student@test.com',
    password: '$2b$10$test.hash.for.student',
    name: 'Test Student',
    role: 'STUDENT',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-user-2',
    email: 'parent@test.com',
    password: '$2b$10$test.hash.for.parent',
    name: 'Test Parent',
    role: 'PARENT',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-user-3',
    email: 'teacher@test.com',
    password: '$2b$10$test.hash.for.teacher',
    name: 'Test Teacher',
    role: 'TEACHER',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// Test plan fixtures
export const testPlans: Partial<Plan>[] = [
  {
    id: 'test-plan-1',
    userId: 'test-user-1',
    title: 'Mathematics Study Plan',
    description: 'Comprehensive mathematics study plan',
    subjects: ['Mathematics', 'Physics'],
    goals: ['Master algebra', 'Understand calculus', 'Prepare for YKS'],
    planType: 'DAILY',
    isActive: true,
    totalSessions: 20,
    duration: 30,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-plan-2',
    userId: 'test-user-1',
    title: 'Science Study Plan',
    description: 'Science subjects study plan',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    goals: ['Understand concepts', 'Practice problems'],
    planType: 'WEEKLY',
    isActive: false,
    totalSessions: 15,
    duration: 14,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// Test session fixtures
export const testSessions: Partial<StudySession>[] = [
  {
    id: 'test-session-1',
    planId: 'test-plan-1',
    userId: 'test-user-1',
    subject: 'Mathematics',
    topic: 'Algebra',
    startTime: new Date('2024-01-01T09:00:00Z'),
    duration: 60,
    difficulty: 'medium',
    sessionType: 'study',
    isCompleted: false,
    objectives: ['Learn basic algebra', 'Practice problems'],
    resources: ['Textbook', 'Practice problems'],
    techniques: ['Problem solving', 'Practice'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-session-2',
    planId: 'test-plan-1',
    userId: 'test-user-1',
    subject: 'Physics',
    topic: 'Mechanics',
    startTime: new Date('2024-01-01T10:00:00Z'),
    duration: 90,
    difficulty: 'hard',
    sessionType: 'study',
    isCompleted: true,
    objectives: ['Understand mechanics', 'Solve problems'],
    resources: ['Physics textbook', 'Lab manual'],
    techniques: ['Conceptual learning', 'Problem solving'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// Test AI request log fixtures
export const testAIRequestLogs: Partial<AiRequestLog>[] = [
  {
    id: 'test-ai-log-1',
    requestId: 'test-request-1',
    userId: 'test-user-1',
    promptType: 'plan_generation',
    model: 'gpt-3.5-turbo',
    prompt: 'Generate a study plan for mathematics',
    response: 'Here is your study plan...',
    promptTokens: 50,
    completionTokens: 200,
    totalTokens: 250,
    duration: 1500,
    success: true,
    error: null,
    timestamp: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-ai-log-2',
    requestId: 'test-request-2',
    userId: 'test-user-1',
    promptType: 'content_generation',
    model: 'gpt-4',
    prompt: 'Generate flashcards for algebra',
    response: 'Here are your flashcards...',
    promptTokens: 30,
    completionTokens: 150,
    totalTokens: 180,
    duration: 2000,
    success: true,
    error: null,
    timestamp: new Date('2024-01-01T01:00:00Z'),
  },
];

// Test AI prompt template fixtures
export const testAITemplates: Partial<AiPromptTemplate>[] = [
  {
    id: 'test-template-1',
    name: 'Test Plan Generation',
    version: '1.0.0',
    type: 'plan_generation',
    template: 'Generate a study plan for {{subject}} with goals: {{goals}}',
    variables: ['subject', 'goals'],
    description: 'Test template for plan generation',
    tags: ['test', 'planning'],
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-template-2',
    name: 'Test Content Generation',
    version: '1.0.0',
    type: 'content_generation',
    template: 'Generate {{contentType}} for {{topic}} at {{level}} level',
    variables: ['contentType', 'topic', 'level'],
    description: 'Test template for content generation',
    tags: ['test', 'content'],
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

// Test data generators
export const testDataGenerators = {
  // Generate test user
  generateUser: (overrides: Partial<User> = {}): Partial<User> => ({
    id: `test-user-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    password: '$2b$10$test.hash',
    name: 'Test User',
    role: 'STUDENT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  // Generate test plan
  generatePlan: (userId: string, overrides: Partial<Plan> = {}): Partial<Plan> => ({
    id: `test-plan-${Date.now()}`,
    userId,
    title: 'Test Plan',
    description: 'Test Plan Description',
    subjects: ['Mathematics'],
    goals: ['Learn basics'],
    planType: 'DAILY',
    isActive: true,
    totalSessions: 10,
    duration: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  // Generate test session
  generateSession: (planId: string, userId: string, overrides: Partial<StudySession> = {}): Partial<StudySession> => ({
    id: `test-session-${Date.now()}`,
    planId,
    userId,
    subject: 'Mathematics',
    topic: 'Algebra',
    startTime: new Date(),
    duration: 60,
    difficulty: 'medium',
    sessionType: 'study',
    isCompleted: false,
    objectives: ['Learn basics'],
    resources: ['Textbook'],
    techniques: ['Practice'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  // Generate test AI request log
  generateAIRequestLog: (userId: string, overrides: Partial<AiRequestLog> = {}): Partial<AiRequestLog> => ({
    id: `test-ai-log-${Date.now()}`,
    requestId: `test-request-${Date.now()}`,
    userId,
    promptType: 'plan_generation',
    model: 'gpt-3.5-turbo',
    prompt: 'Test prompt',
    response: 'Test response',
    promptTokens: 10,
    completionTokens: 50,
    totalTokens: 60,
    duration: 1000,
    success: true,
    error: null,
    timestamp: new Date(),
    ...overrides,
  }),
  
  // Generate test AI template
  generateAITemplate: (overrides: Partial<AiPromptTemplate> = {}): Partial<AiPromptTemplate> => ({
    id: `test-template-${Date.now()}`,
    name: 'Test Template',
    version: '1.0.0',
    type: 'test',
    template: 'Test template with {{variable}}',
    variables: ['variable'],
    description: 'Test template description',
    tags: ['test'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};

// Test scenarios
export const testScenarios = {
  // Complete user journey
  completeUserJourney: {
    user: testUsers[0],
    plans: testPlans,
    sessions: testSessions,
    aiLogs: testAIRequestLogs,
  },
  
  // Auth scenarios
  authScenarios: {
    validLogin: {
      email: 'student@test.com',
      password: 'testpassword',
    },
    invalidLogin: {
      email: 'student@test.com',
      password: 'wrongpassword',
    },
    newUserRegistration: {
      email: 'newuser@test.com',
      password: 'newpassword',
      name: 'New User',
      role: 'STUDENT',
    },
  },
  
  // Planning scenarios
  planningScenarios: {
    createPlan: {
      title: 'New Study Plan',
      description: 'New plan description',
      subjects: ['Mathematics', 'Physics'],
      goals: ['Learn basics', 'Practice problems'],
      planType: 'DAILY',
    },
    updatePlan: {
      title: 'Updated Study Plan',
      description: 'Updated plan description',
    },
    generateSessions: {
      subject: 'Mathematics',
      topic: 'Algebra',
      duration: 60,
      difficulty: 'medium',
    },
  },
  
  // AI scenarios
  aiScenarios: {
    planGeneration: {
      promptType: 'plan_generation',
      context: {
        studentName: 'Test Student',
        grade: 11,
        subjects: ['Mathematics'],
        goals: ['Learn algebra'],
      },
    },
    contentGeneration: {
      promptType: 'content_generation',
      context: {
        topic: 'Algebra',
        subject: 'Mathematics',
        gradeLevel: 11,
      },
    },
    questionSolving: {
      promptType: 'question_solving',
      context: {
        question: 'What is 2x + 3 = 7?',
        subject: 'Mathematics',
        gradeLevel: 11,
      },
    },
  },
};
