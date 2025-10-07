import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmartToolsService } from './smart-tools.service';
import { AIService } from '../ai/ai.service';
import { CacheService } from '../common/cache/cache.service';
import { LoggingService } from '../common/logging/logging.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('SmartToolsService', () => {
  let service: SmartToolsService;
  let configService: ConfigService;
  let aiService: AIService;
  let cacheService: CacheService;
  let loggingService: LoggingService;
  let prismaService: PrismaService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        NODE_ENV: 'test',
        OPENAI_API_KEY: 'test-openai-key',
        AI_DEFAULT_MODEL: 'gpt-4',
        AI_DEFAULT_TEMPERATURE: '0.7',
        AI_DEFAULT_MAX_TOKENS: '2000',
      };
      return config[key];
    }),
  };

  const mockAIService = {
    generateContent: jest.fn(),
    generateWithPrompt: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockLoggingService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockPrismaService = {
    quickChat: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    sosQuestion: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    summary: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartToolsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SmartToolsService>(SmartToolsService);
    configService = module.get<ConfigService>(ConfigService);
    aiService = module.get<AIService>(AIService);
    cacheService = module.get<CacheService>(CacheService);
    loggingService = module.get<LoggingService>(LoggingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('quickChatStream', () => {
    it('should handle quick chat stream successfully', async () => {
      const data = {
        message: 'What is photosynthesis?',
        context: 'biology',
        userId: 'user-123',
      };

      const mockResponse = {
        content: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
        model: 'gpt-4',
        usage: {
          promptTokens: 20,
          completionTokens: 30,
          totalTokens: 50,
        },
        duration: 1000,
        requestId: 'req-123',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.01,
      };

      const mockRes = {
        write: jest.fn(),
        end: jest.fn(),
        setHeader: jest.fn(),
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);
      mockPrismaService.quickChat.create.mockResolvedValue({
        id: 'chat-123',
        ...data,
        response: mockResponse.content,
        createdAt: new Date(),
      });

      await service.quickChatStream(data, mockRes as any);

      expect(mockAIService.generateContent).toHaveBeenCalledWith({
        prompt: expect.stringContaining(data.message),
        context: data.context,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
      });
      expect(mockPrismaService.quickChat.create).toHaveBeenCalledWith({
        data: {
          userId: data.userId,
          message: data.message,
          context: data.context,
          response: mockResponse.content,
        },
      });
    });

    it('should handle streaming errors', async () => {
      const data = {
        message: 'Test message',
        userId: 'user-123',
      };

      const mockRes = {
        write: jest.fn(),
        end: jest.fn(),
        setHeader: jest.fn(),
      };

      const error = new Error('AI service error');
      mockAIService.generateContent.mockRejectedValue(error);

      await expect(service.quickChatStream(data, mockRes as any)).rejects.toThrow('AI service error');
    });
  });

  describe('solveQuestion', () => {
    it('should solve SOS question successfully', async () => {
      const data = {
        question: 'Solve: 2x + 3 = 7',
        subject: 'mathematics',
        grade: 11,
        userId: 'user-123',
      };

      const mockResponse = {
        content: 'To solve 2x + 3 = 7:\n1. Subtract 3 from both sides: 2x = 4\n2. Divide by 2: x = 2',
        model: 'gpt-4',
        usage: {
          promptTokens: 25,
          completionTokens: 40,
          totalTokens: 65,
        },
        duration: 1200,
        requestId: 'req-124',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.015,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);
      mockPrismaService.sosQuestion.create.mockResolvedValue({
        id: 'sos-123',
        ...data,
        solution: mockResponse.content,
        createdAt: new Date(),
      });

      const result = await service.solveQuestion(data);

      expect(result).toEqual({
        id: 'sos-123',
        question: data.question,
        subject: data.subject,
        grade: data.grade,
        solution: mockResponse.content,
        createdAt: expect.any(Date),
      });
      expect(mockAIService.generateContent).toHaveBeenCalledWith({
        prompt: expect.stringContaining(data.question),
        context: {
          subject: data.subject,
          grade: data.grade,
          type: 'sos_question',
        },
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1500,
      });
    });
  });

  describe('generateSummary', () => {
    it('should generate summary from text successfully', async () => {
      const data = {
        message: 'Long text about photosynthesis and its importance in the ecosystem...',
        context: 'paragraph',
        userId: 'user-123',
      };

      const mockResponse = {
        content: 'Summary: Photosynthesis is crucial for ecosystem balance...',
        model: 'gpt-4',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        duration: 1500,
        requestId: 'req-125',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.02,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);
      mockPrismaService.summary.create.mockResolvedValue({
        id: 'summary-123',
        ...data,
        summary: mockResponse.content,
        createdAt: new Date(),
      });

      const result = await service.generateSummary(data);

      expect(result).toEqual({
        id: 'summary-123',
        originalText: data.message,
        context: data.context,
        summary: mockResponse.content,
        createdAt: expect.any(Date),
      });
    });

    it('should handle file upload for summary generation', async () => {
      const data = {
        message: 'File content here...',
        context: 'document',
        userId: 'user-123',
      };

      const mockResponse = {
        content: 'Document summary...',
        model: 'gpt-4',
        usage: {
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300,
        },
        duration: 2000,
        requestId: 'req-126',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.03,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);
      mockPrismaService.summary.create.mockResolvedValue({
        id: 'summary-124',
        ...data,
        summary: mockResponse.content,
        createdAt: new Date(),
      });

      const result = await service.generateSummary(data);

      expect(result).toEqual({
        id: 'summary-124',
        originalText: data.message,
        context: data.context,
        summary: mockResponse.content,
        createdAt: expect.any(Date),
      });
    });
  });

  describe('generateFlashcards', () => {
    it('should generate flashcards successfully', async () => {
      const data = {
        topic: 'Photosynthesis',
        count: 5,
        cardCount: 5,
      };

      const mockResponse = {
        content: JSON.stringify([
          {
            front: 'What is photosynthesis?',
            back: 'The process by which plants convert light energy into chemical energy.',
          },
          {
            front: 'What are the reactants of photosynthesis?',
            back: 'Carbon dioxide, water, and light energy.',
          },
        ]),
        model: 'gpt-4',
        usage: {
          promptTokens: 30,
          completionTokens: 100,
          totalTokens: 130,
        },
        duration: 1000,
        requestId: 'req-127',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.01,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateFlashcards(data);

      expect(result).toEqual({
        topic: data.topic,
        count: data.count,
        cards: expect.arrayContaining([
          expect.objectContaining({
            front: expect.any(String),
            back: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('generateConceptMap', () => {
    it('should generate concept map successfully', async () => {
      const data = {
        grade: '11',
        subject: 'Biology',
        topic: 'Cell Structure',
      };

      const mockResponse = {
        content: JSON.stringify({
          nodes: [
            { id: 'cell', label: 'Cell', type: 'main' },
            { id: 'nucleus', label: 'Nucleus', type: 'organelle' },
            { id: 'mitochondria', label: 'Mitochondria', type: 'organelle' },
          ],
          edges: [
            { from: 'cell', to: 'nucleus', label: 'contains' },
            { from: 'cell', to: 'mitochondria', label: 'contains' },
          ],
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 40,
          completionTokens: 80,
          totalTokens: 120,
        },
        duration: 1200,
        requestId: 'req-128',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.012,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateConceptMap(data);

      expect(result).toEqual({
        grade: data.grade,
        subject: data.subject,
        topic: data.topic,
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            label: expect.any(String),
            type: expect.any(String),
          }),
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String),
            label: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('feynmanCycle', () => {
    it('should generate Feynman cycle successfully', async () => {
      const data = {
        topic: 'Quantum Mechanics',
        explanation: 'Basic understanding of quantum mechanics',
      };

      const mockResponse = {
        content: JSON.stringify({
          steps: [
            {
              step: 1,
              title: 'Simple Explanation',
              content: 'Explain quantum mechanics as simply as possible...',
            },
            {
              step: 2,
              title: 'Identify Gaps',
              content: 'What don\'t you understand? What needs clarification?',
            },
            {
              step: 3,
              title: 'Go Back to Source',
              content: 'Review the original material with new questions...',
            },
            {
              step: 4,
              title: 'Simplify Again',
              content: 'Now explain it even more simply...',
            },
          ],
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 50,
          completionTokens: 120,
          totalTokens: 170,
        },
        duration: 1500,
        requestId: 'req-129',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.015,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.feynmanCycle(data);

      expect(result).toEqual({
        topic: data.topic,
        explanation: data.explanation,
        steps: expect.arrayContaining([
          expect.objectContaining({
            step: expect.any(Number),
            title: expect.any(String),
            content: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('socraticEvaluation', () => {
    it('should perform Socratic evaluation successfully', async () => {
      const data = {
        answer: 'The mitochondria is the powerhouse of the cell',
        question: 'What is the function of mitochondria?',
      };

      const mockResponse = {
        content: JSON.stringify({
          evaluation: {
            correctness: 0.8,
            completeness: 0.7,
            clarity: 0.9,
          },
          feedback: 'Good answer! You correctly identified the main function of mitochondria.',
          suggestions: [
            'Consider mentioning ATP production specifically',
            'You could also mention cellular respiration',
          ],
          followUpQuestions: [
            'What is ATP and why is it important?',
            'How does cellular respiration work?',
          ],
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 35,
          completionTokens: 90,
          totalTokens: 125,
        },
        duration: 1100,
        requestId: 'req-130',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.011,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.socraticEvaluation(data);

      expect(result).toEqual({
        answer: data.answer,
        question: data.question,
        evaluation: expect.objectContaining({
          correctness: expect.any(Number),
          completeness: expect.any(Number),
          clarity: expect.any(Number),
        }),
        feedback: expect.any(String),
        suggestions: expect.any(Array),
        followUpQuestions: expect.any(Array),
      });
    });
  });

  describe('generateLiveQuiz', () => {
    it('should generate live quiz successfully', async () => {
      const data = {
        topic: 'Photosynthesis',
        difficulty: 'medium',
        count: 10,
        questionCount: 10,
        subject: 'Biology',
        grade: '11',
      };

      const mockResponse = {
        content: JSON.stringify({
          questions: [
            {
              id: 1,
              question: 'What is the main purpose of photosynthesis?',
              options: ['A) Energy storage', 'B) Oxygen production', 'C) Both A and B', 'D) Neither'],
              correctAnswer: 'C',
              explanation: 'Photosynthesis serves both energy storage and oxygen production.',
            },
          ],
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 60,
          completionTokens: 200,
          totalTokens: 260,
        },
        duration: 2000,
        requestId: 'req-131',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.02,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateLiveQuiz(data as any);

      expect(result).toEqual({
        topic: data.topic,
        difficulty: data.difficulty,
        count: data.count,
        questions: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            question: expect.any(String),
            options: expect.any(Array),
            correctAnswer: expect.any(String),
            explanation: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('examSimulator', () => {
    it('should create exam simulator successfully', async () => {
      const data = {
        subject: 'Mathematics',
        grade: 11,
        duration: 120,
      };

      const mockResponse = {
        content: JSON.stringify({
          exam: {
            title: 'Mathematics Grade 11 Exam',
            duration: 120,
            questions: [
              {
                id: 1,
                question: 'Solve for x: 2x + 5 = 13',
                type: 'multiple_choice',
                options: ['A) 4', 'B) 6', 'C) 8', 'D) 10'],
                correctAnswer: 'A',
                points: 2,
              },
            ],
          },
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 80,
          completionTokens: 300,
          totalTokens: 380,
        },
        duration: 2500,
        requestId: 'req-132',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.025,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.examSimulator(data);

      expect(result).toEqual({
        subject: data.subject,
        grade: data.grade,
        duration: data.duration,
        exam: expect.objectContaining({
          title: expect.any(String),
          duration: data.duration,
          questions: expect.any(Array),
        }),
      });
    });
  });

  describe('generateLearningPath', () => {
    it('should generate learning path successfully', async () => {
      const data = {
        topic: 'Calculus',
        level: 'beginner',
        goals: ['Understand derivatives', 'Learn integration'],
        subject: 'Mathematics',
        grade: '12',
      };

      const mockResponse = {
        content: JSON.stringify({
          path: {
            title: 'Calculus Learning Path',
            steps: [
              {
                step: 1,
                title: 'Limits and Continuity',
                description: 'Learn the foundation of calculus',
                duration: '2 weeks',
                resources: ['Textbook Chapter 1', 'Video Series A'],
              },
              {
                step: 2,
                title: 'Derivatives',
                description: 'Master the concept of derivatives',
                duration: '3 weeks',
                resources: ['Textbook Chapter 2', 'Practice Problems Set 1'],
              },
            ],
          },
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 70,
          completionTokens: 250,
          totalTokens: 320,
        },
        duration: 1800,
        requestId: 'req-133',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.022,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.generateLearningPath(data);

      expect(result).toEqual({
        topic: data.topic,
        level: data.level,
        goals: data.goals,
        path: expect.objectContaining({
          title: expect.any(String),
          steps: expect.arrayContaining([
            expect.objectContaining({
              step: expect.any(Number),
              title: expect.any(String),
              description: expect.any(String),
              duration: expect.any(String),
              resources: expect.any(Array),
            }),
          ]),
        }),
      });
    });
  });

  describe('findTopicConnections', () => {
    it('should find topic connections successfully', async () => {
      const data = {
        topic: 'Photosynthesis',
        subjects: ['Biology', 'Chemistry'],
      };

      const mockResponse = {
        content: JSON.stringify({
          connections: [
            {
              topic: 'Cellular Respiration',
              subject: 'Biology',
              connection: 'Opposite process of photosynthesis',
              strength: 0.9,
            },
            {
              topic: 'Light Energy',
              subject: 'Physics',
              connection: 'Energy source for photosynthesis',
              strength: 0.8,
            },
          ],
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 45,
          completionTokens: 120,
          totalTokens: 165,
        },
        duration: 1300,
        requestId: 'req-134',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.013,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.findTopicConnections(data);

      expect(result).toEqual({
        topic: data.topic,
        subjects: data.subjects,
        connections: expect.arrayContaining([
          expect.objectContaining({
            topic: expect.any(String),
            subject: expect.any(String),
            connection: expect.any(String),
            strength: expect.any(Number),
          }),
        ]),
      });
    });
  });

  describe('mentalSupport', () => {
    it('should provide mental support successfully', async () => {
      const data = {
        issue: 'Math anxiety',
        context: 'Struggling with calculus problems',
      };

      const mockResponse = {
        content: JSON.stringify({
          support: {
            message: 'It\'s completely normal to feel anxious about math. Many students experience this.',
            techniques: [
              'Break problems into smaller steps',
              'Practice regularly with easier problems first',
              'Use positive self-talk',
            ],
            resources: [
              'Math anxiety workbook',
              'Breathing exercises',
              'Study group recommendations',
            ],
          },
        }),
        model: 'gpt-4',
        usage: {
          promptTokens: 30,
          completionTokens: 150,
          totalTokens: 180,
        },
        duration: 1400,
        requestId: 'req-135',
        timestamp: '2024-01-01T00:00:00Z',
        cost: 0.014,
      };

      mockAIService.generateContent.mockResolvedValue(mockResponse);

      const result = await service.mentalSupport(data);

      expect(result).toEqual({
        issue: data.issue,
        context: data.context,
        support: expect.objectContaining({
          message: expect.any(String),
          techniques: expect.any(Array),
          resources: expect.any(Array),
        }),
      });
    });
  });

  describe('getToolsList', () => {
    it('should return list of available tools', async () => {
      const result = await service.getToolsList();

      expect(result).toEqual({
        tools: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
            category: expect.any(String),
            icon: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('getUserChatHistory', () => {
    it('should get user chat history', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'chat-1',
          message: 'What is photosynthesis?',
          response: 'Photosynthesis is...',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.quickChat.findMany.mockResolvedValue(mockHistory);

      const result = await service.getUserChatHistory(userId);

      expect(result).toEqual(mockHistory);
      expect(mockPrismaService.quickChat.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getUserSOSHistory', () => {
    it('should get user SOS history', async () => {
      const userId = 'user-123';
      const mockHistory = [
        {
          id: 'sos-1',
          question: 'Solve 2x + 3 = 7',
          solution: 'x = 2',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.sosQuestion.findMany.mockResolvedValue(mockHistory);

      const result = await service.getUserSOSHistory(userId);

      expect(result).toEqual(mockHistory);
      expect(mockPrismaService.sosQuestion.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getUserSummaries', () => {
    it('should get user summaries', async () => {
      const userId = 'user-123';
      const mockSummaries = [
        {
          id: 'summary-1',
          originalText: 'Long text...',
          summary: 'Short summary...',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.summary.findMany.mockResolvedValue(mockSummaries);

      const result = await service.getUserSummaries(userId);

      expect(result).toEqual(mockSummaries);
      expect(mockPrismaService.summary.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('deleteChat', () => {
    it('should delete chat successfully', async () => {
      const chatId = 'chat-123';

      mockPrismaService.quickChat.delete.mockResolvedValue({
        id: chatId,
        message: 'Deleted message',
        response: 'Deleted response',
      });

      const result = await service.deleteChat(chatId);

      expect(result).toEqual({
        success: true,
        message: 'Chat deleted successfully',
      });
      expect(mockPrismaService.quickChat.delete).toHaveBeenCalledWith({
        where: { id: chatId },
      });
    });
  });

  describe('deleteSOS', () => {
    it('should delete SOS question successfully', async () => {
      const sosId = 'sos-123';

      mockPrismaService.sosQuestion.delete.mockResolvedValue({
        id: sosId,
        question: 'Deleted question',
        solution: 'Deleted solution',
      });

      const result = await service.deleteSOS(sosId);

      expect(result).toEqual({
        success: true,
        message: 'SOS question deleted successfully',
      });
      expect(mockPrismaService.sosQuestion.delete).toHaveBeenCalledWith({
        where: { id: sosId },
      });
    });
  });

  describe('deleteSummary', () => {
    it('should delete summary successfully', async () => {
      const summaryId = 'summary-123';

      mockPrismaService.summary.delete.mockResolvedValue({
        id: summaryId,
        originalText: 'Deleted text',
        summary: 'Deleted summary',
      });

      const result = await service.deleteSummary(summaryId);

      expect(result).toEqual({
        success: true,
        message: 'Summary deleted successfully',
      });
      expect(mockPrismaService.summary.delete).toHaveBeenCalledWith({
        where: { id: summaryId },
      });
    });
  });
});