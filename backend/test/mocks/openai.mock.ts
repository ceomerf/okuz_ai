import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock OpenAI responses
export const mockOpenAIResponses = {
  planGeneration: {
    id: 'chatcmpl-test-123',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-3.5-turbo',
    usage: {
      prompt_tokens: 50,
      completion_tokens: 200,
      total_tokens: 250,
    },
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({
            plan: {
              title: 'AI Generated Study Plan',
              description: 'Comprehensive study plan for mathematics',
              subjects: ['Mathematics', 'Physics'],
              goals: ['Master algebra', 'Understand calculus'],
              weeks: [
                {
                  week: 1,
                  focus: 'Algebra basics',
                  sessions: 5,
                },
              ],
              totalSessions: 20,
              duration: 7,
            },
            sessions: [
              {
                subject: 'Mathematics',
                topic: 'Algebra',
                duration: 60,
                difficulty: 'medium',
                type: 'study',
                startTime: '2024-01-01T09:00:00Z',
                objectives: ['Learn basic algebra'],
                resources: ['Textbook', 'Practice problems'],
                techniques: ['Problem solving', 'Practice'],
              },
            ],
          }),
        },
        finish_reason: 'stop',
      },
    ],
  },
  
  contentGeneration: {
    id: 'chatcmpl-test-456',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-3.5-turbo',
    usage: {
      prompt_tokens: 30,
      completion_tokens: 150,
      total_tokens: 180,
    },
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify([
            {
              question: 'What is the quadratic formula?',
              answer: 'The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a',
              difficulty: 'medium',
              tags: ['algebra', 'formula'],
            },
            {
              question: 'What is the derivative of x²?',
              answer: 'The derivative of x² is 2x',
              difficulty: 'easy',
              tags: ['calculus', 'derivative'],
            },
          ]),
        },
        finish_reason: 'stop',
      },
    ],
  },
  
  questionSolving: {
    id: 'chatcmpl-test-789',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-4',
    usage: {
      prompt_tokens: 40,
      completion_tokens: 300,
      total_tokens: 340,
    },
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `To solve 2x + 3 = 7:

1. Subtract 3 from both sides: 2x = 4
2. Divide both sides by 2: x = 2

The solution is x = 2.

Key concepts used:
- Linear equations
- Algebraic manipulation
- Isolating variables

Alternative approach:
- You could also check by substitution: 2(2) + 3 = 4 + 3 = 7 ✓

Common mistakes to avoid:
- Forgetting to perform the same operation on both sides
- Making arithmetic errors
- Not checking your answer`,
        },
        finish_reason: 'stop',
      },
    ],
  },
  
  analysis: {
    id: 'chatcmpl-test-101',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-4',
    usage: {
      prompt_tokens: 60,
      completion_tokens: 400,
      total_tokens: 460,
    },
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({
            performance: {
              overall: 'good',
              completionRate: 85,
              averageScore: 78,
              timeSpent: 120,
            },
            strengths: [
              'Strong in algebra',
              'Good problem-solving skills',
              'Consistent study habits',
            ],
            weaknesses: [
              'Struggles with calculus',
              'Needs more practice with word problems',
            ],
            recommendations: [
              'Focus more on calculus concepts',
              'Practice word problems daily',
              'Review algebra fundamentals',
            ],
            nextSteps: [
              'Complete calculus review',
              'Practice 5 word problems daily',
              'Schedule weekly review sessions',
            ],
          }),
        },
        finish_reason: 'stop',
      },
    ],
  },
  
  coaching: {
    id: 'chatcmpl-test-202',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-4',
    usage: {
      prompt_tokens: 45,
      completion_tokens: 250,
      total_tokens: 295,
    },
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `Great job on your recent progress! I can see you've been working hard on your mathematics studies. Here's some motivational coaching to keep you going:

🎯 **Your Achievements:**
- Completed 85% of your study sessions
- Improved your algebra skills significantly
- Maintained consistent study habits

💪 **Keep Up the Great Work:**
You're on the right track! Your dedication is paying off. Remember that every expert was once a beginner, and every pro was once an amateur.

🚀 **Next Steps:**
1. Focus on your calculus challenges - you've got this!
2. Practice word problems daily to build confidence
3. Don't forget to take breaks and celebrate your progress

Remember: Success is not final, failure is not fatal - it's the courage to continue that counts!`,
        },
        finish_reason: 'stop',
      },
    ],
  },
  
  quickChat: {
    id: 'chatcmpl-test-303',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-3.5-turbo',
    usage: {
      prompt_tokens: 20,
      completion_tokens: 100,
      total_tokens: 120,
    },
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a. It's used to solve quadratic equations of the form ax² + bx + c = 0. The ± symbol means you get two solutions: one with + and one with -. This formula works for any quadratic equation!`,
        },
        finish_reason: 'stop',
      },
    ],
  },
};

// Mock OpenAI server
export const openAIServer = setupServer(
  // Chat completions endpoint
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    const body = req.body as any;
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';
    
    // Determine response based on content
    let response;
    if (content.includes('plan') || content.includes('study plan')) {
      response = mockOpenAIResponses.planGeneration;
    } else if (content.includes('flashcard') || content.includes('quiz')) {
      response = mockOpenAIResponses.contentGeneration;
    } else if (content.includes('solve') || content.includes('question')) {
      response = mockOpenAIResponses.questionSolving;
    } else if (content.includes('analyze') || content.includes('performance')) {
      response = mockOpenAIResponses.analysis;
    } else if (content.includes('coach') || content.includes('motivate')) {
      response = mockOpenAIResponses.coaching;
    } else {
      response = mockOpenAIResponses.quickChat;
    }
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Models endpoint
  rest.get('https://api.openai.com/v1/models', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        object: 'list',
        data: [
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai',
          },
          {
            id: 'gpt-4',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai',
          },
        ],
      })
    );
  })
);

// Mock OpenAI errors
export const mockOpenAIErrors = {
  rateLimit: {
    error: {
      message: 'Rate limit reached for requests',
      type: 'rate_limit_exceeded',
      code: 'rate_limit_exceeded',
    },
  },
  
  quotaExceeded: {
    error: {
      message: 'You exceeded your current quota',
      type: 'insufficient_quota',
      code: 'insufficient_quota',
    },
  },
  
  invalidApiKey: {
    error: {
      message: 'Invalid API key',
      type: 'invalid_request_error',
      code: 'invalid_api_key',
    },
  },
  
  contextLengthExceeded: {
    error: {
      message: 'Context length exceeded',
      type: 'invalid_request_error',
      code: 'context_length_exceeded',
    },
  },
};

// Mock OpenAI server with error scenarios
export const openAIErrorServer = setupServer(
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    const body = req.body as any;
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';
    
    // Simulate different error scenarios
    if (content.includes('rate_limit')) {
      return res(
        ctx.status(429),
        ctx.json(mockOpenAIErrors.rateLimit)
      );
    } else if (content.includes('quota')) {
      return res(
        ctx.status(429),
        ctx.json(mockOpenAIErrors.quotaExceeded)
      );
    } else if (content.includes('invalid_key')) {
      return res(
        ctx.status(401),
        ctx.json(mockOpenAIErrors.invalidApiKey)
      );
    } else if (content.includes('context_length')) {
      return res(
        ctx.status(400),
        ctx.json(mockOpenAIErrors.contextLengthExceeded)
      );
    } else {
      // Default success response
      return res(
        ctx.status(200),
        ctx.json(mockOpenAIResponses.quickChat)
      );
    }
  })
);

// Mock OpenAI server with delays
export const openAIDelayServer = setupServer(
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    const body = req.body as any;
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';
    
    // Simulate different delay scenarios
    let delay = 1000; // Default 1 second
    
    if (content.includes('slow')) {
      delay = 5000; // 5 seconds
    } else if (content.includes('timeout')) {
      delay = 30000; // 30 seconds (will timeout)
    }
    
    return res(
      ctx.delay(delay),
      ctx.status(200),
      ctx.json(mockOpenAIResponses.quickChat)
    );
  })
);

// Mock OpenAI server with partial responses
export const openAIPartialServer = setupServer(
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    const body = req.body as any;
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';
    
    if (content.includes('partial')) {
      return res(
        ctx.status(200),
        ctx.json({
          id: 'chatcmpl-test-partial',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          usage: {
            prompt_tokens: 20,
            completion_tokens: 50,
            total_tokens: 70,
          },
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'This is a partial response...',
              },
              finish_reason: 'length', // Indicates partial response
            },
          ],
        })
      );
    } else {
      return res(
        ctx.status(200),
        ctx.json(mockOpenAIResponses.quickChat)
      );
    }
  })
);

// Utility functions for testing
export const mockOpenAIUtils = {
  // Start mock server
  startServer: () => {
    openAIServer.listen();
  },
  
  // Stop mock server
  stopServer: () => {
    openAIServer.close();
  },
  
  // Reset handlers
  resetHandlers: () => {
    openAIServer.resetHandlers();
  },
  
  // Set custom response
  setCustomResponse: (response: any) => {
    openAIServer.use(
      rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(response));
      })
    );
  },
  
  // Set error response
  setErrorResponse: (error: any) => {
    openAIServer.use(
      rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
        return res(ctx.status(error.status || 500), ctx.json(error));
      })
    );
  },
  
  // Set delay response
  setDelayResponse: (delay: number) => {
    openAIServer.use(
      rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
        return res(
          ctx.delay(delay),
          ctx.status(200),
          ctx.json(mockOpenAIResponses.quickChat)
        );
      })
    );
  },
};
