import { Test, TestingModule } from '@nestjs/testing';
import { PlanGenerationService } from './plan-generation.service';
import { OpenAIService } from '../services/openai.service';
import { MetricsService } from '../monitoring/metrics.service';
import { DigitalDossierService } from './digital-dossier.service';

describe('PlanGenerationService', () => {
  let service: PlanGenerationService;
  let openaiService: OpenAIService;
  let metricsService: MetricsService;
  let dossierService: DigitalDossierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanGenerationService,
        {
          provide: OpenAIService,
          useValue: {
            generateContent: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            recordAiApiCall: jest.fn(),
          },
        },
        {
          provide: DigitalDossierService,
          useValue: {
            buildUserDossier: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlanGenerationService>(PlanGenerationService);
    openaiService = module.get<OpenAIService>(OpenAIService);
    metricsService = module.get<MetricsService>(MetricsService);
    dossierService = module.get<DigitalDossierService>(DigitalDossierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateContentWithRetry', () => {
    it('should generate content successfully on first try', async () => {
      const mockResponse = 'AI generated content';
      jest.spyOn(openaiService, 'generateContent').mockResolvedValue(mockResponse);

      const result = await service.generateContentWithRetry('test prompt');

      expect(result).toBe(mockResponse);
      expect(openaiService.generateContent).toHaveBeenCalledWith('test prompt');
      expect(openaiService.generateContent).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      const mockResponse = 'AI generated content';
      jest.spyOn(openaiService, 'generateContent')
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValueOnce(mockResponse);

      const result = await service.generateContentWithRetry('test prompt', 2, 100);

      expect(result).toBe(mockResponse);
      expect(openaiService.generateContent).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      jest.spyOn(openaiService, 'generateContent').mockRejectedValue(new Error('API Error'));

      await expect(service.generateContentWithRetry('test prompt', 1, 100)).rejects.toThrow();
      expect(openaiService.generateContent).toHaveBeenCalledTimes(2); // initial + 1 retry
    });

    it('should not retry on non-transient errors', async () => {
      jest.spyOn(openaiService, 'generateContent').mockRejectedValue(new Error('Bad Request'));

      await expect(service.generateContentWithRetry('test prompt', 2, 100)).rejects.toThrow();
      expect(openaiService.generateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('generatePlan', () => {
    it('should generate a learning plan successfully', async () => {
      const mockData = {
        subjects: ['Matematik', 'Fizik'],
        goals: ['YKS Başarısı'],
        availableTime: 10,
      };

      const result = await service.generatePlan(mockData);

      expect(result).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.sessions).toBeDefined();
      expect(result.plan.subjects).toContain('Matematik');
      expect(result.plan.subjects).toContain('Fizik');
      expect(result.sessions.length).toBeGreaterThan(0);
    });

    it('should generate plan with default values', async () => {
      const mockData = {
        subjects: ['Türkçe'],
        goals: ['Temel Kavramlar'],
      };

      const result = await service.generatePlan(mockData);

      expect(result).toBeDefined();
      expect(result.plan.startDate).toBeDefined();
      expect(result.plan.endDate).toBeDefined();
    });

    it('should limit sessions based on available time', async () => {
      const mockData = {
        subjects: ['Matematik'],
        goals: ['Test'],
        availableTime: 5,
      };

      const result = await service.generatePlan(mockData);

      expect(result.sessions.length).toBeLessThanOrEqual(5);
    });

    it('should distribute sessions across subjects', async () => {
      const mockData = {
        subjects: ['Matematik', 'Fizik', 'Kimya'],
        goals: ['Test'],
        availableTime: 9,
      };

      const result = await service.generatePlan(mockData);

      const subjects = result.sessions.map(s => s.subject);
      expect(subjects).toContain('Matematik');
      expect(subjects).toContain('Fizik');
      expect(subjects).toContain('Kimya');
    });
  });

  describe('filterSubjectsForGradeAndTrack', () => {
    it('should return all subjects for grades below 11', () => {
      const subjects = ['Matematik', 'Türkçe', 'Fizik'];
      const result = service.filterSubjectsForGradeAndTrack(subjects, 10, 'Sayısal');

      expect(result).toEqual(subjects);
    });

    it('should filter subjects for 11th grade sayısal track', () => {
      const subjects = ['Matematik', 'Fizik', 'Edebiyat', 'Tarih'];
      const result = service.filterSubjectsForGradeAndTrack(subjects, 11, 'Sayısal');

      expect(result).toContain('Matematik');
      expect(result).toContain('Fizik');
    });

    it('should filter subjects for 11th grade eşit ağırlık track', () => {
      const subjects = ['Matematik', 'Türkçe', 'Fizik', 'Edebiyat'];
      const result = service.filterSubjectsForGradeAndTrack(subjects, 11, 'Eşit Ağırlık');

      expect(result).toContain('Matematik');
      expect(result).toContain('Türkçe');
    });

    it('should handle empty subjects array', () => {
      const result = service.filterSubjectsForGradeAndTrack([], 11, 'Sayısal');

      expect(result).toEqual([]);
    });
  });

  describe('parseJsonBlock', () => {
    it('should parse valid JSON', () => {
      const jsonString = '{"key": "value"}';
      const result = service.parseJsonBlock(jsonString);

      expect(result).toEqual({ key: 'value' });
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const jsonString = '```json\n{"key": "value"}\n```';
      const result = service.parseJsonBlock(jsonString);

      expect(result).toEqual({ key: 'value' });
    });

    it('should return empty object for invalid JSON', () => {
      const invalidJson = 'not a json string';
      const result = service.parseJsonBlock(invalidJson);

      expect(result).toEqual({});
    });

    it('should handle empty input', () => {
      const result = service.parseJsonBlock('');

      expect(result).toEqual({});
    });
  });

  describe('normalizeText', () => {
    it('should normalize Turkish characters', () => {
      const input = 'ŞşİıÇçĞğÜüÖö';
      const result = service.normalizeText(input);

      expect(result).toContain('ssi');
      expect(result).toContain('cc');
      expect(result).toContain('gg');
      expect(result).toContain('uu');
      expect(result).toContain('oo');
    });

    it('should convert to lowercase', () => {
      const input = 'HELLO WORLD';
      const result = service.normalizeText(input);

      expect(result).toBe('hello world');
    });

    it('should trim whitespace', () => {
      const input = '  test  ';
      const result = service.normalizeText(input);

      expect(result).toBe('test');
    });

    it('should handle empty string', () => {
      const result = service.normalizeText('');

      expect(result).toBe('');
    });
  });
});
