import { Test, TestingModule } from '@nestjs/testing';
import { SmartToolsController } from './smart-tools.controller';
import { SmartToolsService } from './smart-tools.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('SmartToolsController', () => {
  let controller: SmartToolsController;
  let service: SmartToolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmartToolsController],
      providers: [
        {
          provide: SmartToolsService,
          useValue: {
            quickChat: jest.fn(),
            sosQuestion: jest.fn(),
            generateSummary: jest.fn(),
            getUserChatHistory: jest.fn(),
            getUserSOSHistory: jest.fn(),
            getUserSummaries: jest.fn(),
            deleteChat: jest.fn(),
            deleteSOS: jest.fn(),
            deleteSummary: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SmartToolsController>(SmartToolsController);
    service = module.get<SmartToolsService>(SmartToolsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('quickChat', () => {
    it('should handle quick chat request', async () => {
      const chatData = {
        message: 'What is the derivative of x^2?',
        context: 'mathematics',
      };

      const mockResponse = {
        id: 'chat123',
        userId: 'user123',
        message: 'What is the derivative of x^2?',
        response: 'The derivative of x^2 is 2x.',
        context: 'mathematics',
        createdAt: new Date(),
      };

      jest.spyOn(service, 'generateSummary').mockResolvedValue(mockResponse as any);

      const result = await controller.quickChat('user123', chatData);

      expect(result).toEqual(mockResponse);
      expect(service.generateSummary).toHaveBeenCalledWith({
        userId: 'user123',
        ...chatData,
      });
    });

    it('should handle quick chat errors', async () => {
      const chatData = {
        message: '',
        context: 'mathematics',
      };

      jest.spyOn(service, 'generateSummary').mockRejectedValue(new Error('Invalid message'));

      await expect(controller.quickChat('user123', chatData)).rejects.toThrow('Invalid message');
    });
  });

  describe('sosQuestion', () => {
    it('should handle SOS question request', async () => {
      const sosData = {
        question: 'I need help with calculus',
        urgency: 'high',
        subject: 'mathematics',
      };

      const mockResponse = {
        id: 'sos123',
        userId: 'user123',
        question: 'I need help with calculus',
        answer: 'Here are some resources to help with calculus...',
        urgency: 'high',
        subject: 'mathematics',
        createdAt: new Date(),
      };

      jest.spyOn(service, 'generateSummary').mockResolvedValue(mockResponse as any);

      const result = await controller.sosQuestion('user123', sosData);

      expect(result).toEqual(mockResponse);
      expect(service.generateSummary).toHaveBeenCalledWith({
        userId: 'user123',
        ...sosData,
      });
    });

    it('should handle SOS question errors', async () => {
      const sosData = {
        question: '',
        urgency: 'high',
        subject: 'mathematics',
      };

      jest.spyOn(service, 'generateSummary').mockRejectedValue(new Error('Invalid question'));

      await expect(controller.sosQuestion('user123', sosData)).rejects.toThrow('Invalid question');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary', async () => {
      const summaryData = {
        content: 'Long text content to summarize...',
        type: 'study_notes',
        length: 'medium',
      };

      const mockSummary = {
        id: 'summary123',
        userId: 'user123',
        originalContent: 'Long text content to summarize...',
        summary: 'Summarized content...',
        type: 'study_notes',
        length: 'medium',
        createdAt: new Date(),
      };

      jest.spyOn(service, 'generateSummary').mockResolvedValue(mockSummary as any);

      const result = await controller.generateSummary('user123', summaryData);

      expect(result).toEqual(mockSummary);
      expect(service.generateSummary).toHaveBeenCalledWith({
        userId: 'anonymous',
        context: 'paragraph',
        message: '',
      });
    });

    it('should handle summary generation errors', async () => {
      const summaryData = {
        content: '',
        type: 'study_notes',
        length: 'medium',
      };

      jest.spyOn(service, 'generateSummary').mockRejectedValue(new Error('Invalid content'));

      await expect(controller.generateSummary('user123', summaryData)).rejects.toThrow('Invalid content');
    });
  });

  describe('getUserChatHistory', () => {
    it('should get user chat history', async () => {
      const userId = 'user123';
      const mockHistory = [
        { id: 'chat1', message: 'Hello', response: 'Hi there!' },
        { id: 'chat2', message: 'How are you?', response: 'I am fine, thank you!' },
      ];

      jest.spyOn(service, 'getUserChatHistory').mockResolvedValue(mockHistory as any);

      const result = await controller.getUserChatHistory(userId);

      expect(result).toEqual(mockHistory);
      expect(service.getUserChatHistory).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserSOSHistory', () => {
    it('should get user SOS history', async () => {
      const userId = 'user123';
      const mockSOSHistory = [
        { id: 'sos1', question: 'Help with math', answer: 'Here is help...' },
        { id: 'sos2', question: 'Need physics help', answer: 'Physics resources...' },
      ];

      jest.spyOn(service, 'getUserSOSHistory').mockResolvedValue(mockSOSHistory as any);

      const result = await controller.getUserSOSHistory(userId);

      expect(result).toEqual(mockSOSHistory);
      expect(service.getUserSOSHistory).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserSummaries', () => {
    it('should get user summaries', async () => {
      const userId = 'user123';
      const mockSummaries = [
        { id: 'summary1', originalContent: 'Long text...', summary: 'Short summary...' },
        { id: 'summary2', originalContent: 'Another long text...', summary: 'Another summary...' },
      ];

      jest.spyOn(service, 'getUserSummaries').mockResolvedValue(mockSummaries as any);

      const result = await controller.getUserSummaries(userId);

      expect(result).toEqual(mockSummaries);
      expect(service.getUserSummaries).toHaveBeenCalledWith(userId);
    });
  });

  describe('deleteChat', () => {
    it('should delete chat', async () => {
      const chatId = 'chat123';

      jest.spyOn(service, 'deleteChat').mockResolvedValue({ id: chatId } as any);

      const result = await controller.deleteChat(chatId);

      expect(result).toEqual({ id: chatId });
      expect(service.deleteChat).toHaveBeenCalledWith(chatId);
    });

    it('should handle delete chat errors', async () => {
      const chatId = 'chat123';

      jest.spyOn(service, 'deleteChat').mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteChat(chatId)).rejects.toThrow('Delete failed');
    });
  });

  describe('deleteSOS', () => {
    it('should delete SOS question', async () => {
      const sosId = 'sos123';

      jest.spyOn(service, 'deleteSOS').mockResolvedValue({ id: sosId } as any);

      const result = await controller.deleteSOS(sosId);

      expect(result).toEqual({ id: sosId });
      expect(service.deleteSOS).toHaveBeenCalledWith(sosId);
    });
  });

  describe('deleteSummary', () => {
    it('should delete summary', async () => {
      const summaryId = 'summary123';

      jest.spyOn(service, 'deleteSummary').mockResolvedValue({ id: summaryId } as any);

      const result = await controller.deleteSummary(summaryId);

      expect(result).toEqual({ id: summaryId });
      expect(service.deleteSummary).toHaveBeenCalledWith(summaryId);
    });
  });
});
