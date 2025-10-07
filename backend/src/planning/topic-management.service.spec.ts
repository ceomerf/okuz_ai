import { Test, TestingModule } from '@nestjs/testing';
import { TopicManagementService } from './topic-management.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

describe('TopicManagementService', () => {
  let service: TopicManagementService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockPrismaService = {
    topic: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    curriculum: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicManagementService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<TopicManagementService>(TopicManagementService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopicsByGrade', () => {
    it('should return topics for a specific grade', async () => {
      const grade = '9';
      const mockTopics = [
        { id: '1', name: 'Algebra', grade: '9', subject: 'Math' },
        { id: '2', name: 'Geometry', grade: '9', subject: 'Math' },
      ];

      mockPrismaService.topic.findMany.mockResolvedValue(mockTopics);

      const result = await service.getTopicsByGrade(parseInt(grade));

      expect(result).toEqual({ message: 'Topics found', topics: mockTopics });
      expect(mockPrismaService.topic.findMany).toHaveBeenCalledWith({
        where: { grade: parseInt(grade) },
        orderBy: { month: 'asc' }
      });
    });

    it('should handle database error', async () => {
      const grade = '9';
      mockPrismaService.topic.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getTopicsByGrade(parseInt(grade))).rejects.toThrow('Failed to get topics by grade');
    });
  });

  describe('getTopicsBySubject', () => {
    it('should return topics for a specific subject', async () => {
      const subject = 'Math';
      const mockTopics = [
        { id: '1', name: 'Algebra', subject: 'Math' },
        { id: '2', name: 'Geometry', subject: 'Math' },
      ];

      mockPrismaService.topic.findMany.mockResolvedValue(mockTopics);

      const result = await service.getTopicsBySubject(subject);

      expect(result).toEqual({ message: 'Topics found', topics: mockTopics });
      expect(mockPrismaService.topic.findMany).toHaveBeenCalledWith({
        where: { subject },
        orderBy: { month: 'asc' }
      });
    });
  });

  describe('createTopic', () => {
    it('should create a new topic', async () => {
      const topicData = {
        name: 'Calculus',
        subject: 'Math',
        grade: '12',
        description: 'Advanced mathematics',
      };

      const mockCreatedTopic = {
        id: '1',
        ...topicData,
        createdAt: new Date(),
      };

      mockPrismaService.topic.create.mockResolvedValue(mockCreatedTopic);

      const result = await service.createTopic(topicData);

      expect(result).toEqual({ message: 'Topic created', topic: mockCreatedTopic });
      expect(mockPrismaService.topic.create).toHaveBeenCalledWith({
        data: {
          topic: undefined,
          subject: topicData.subject,
          grade: topicData.grade,
          description: topicData.description,
          month: undefined,
          outcomes: [],
          tytWeight: undefined,
          aytWeight: undefined
        },
      });
    });
  });

  describe('updateTopic', () => {
    it('should update an existing topic', async () => {
      const topicId = '1';
      const updateData = {
        name: 'Advanced Calculus',
        description: 'Updated description',
      };

      const mockUpdatedTopic = {
        id: topicId,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrismaService.topic.update.mockResolvedValue(mockUpdatedTopic);

      const result = await service.updateTopic(topicId, updateData);

      expect(result).toEqual({ message: 'Topic updated', topic: mockUpdatedTopic });
      expect(mockPrismaService.topic.update).toHaveBeenCalledWith({
        where: { id: topicId },
        data: updateData,
      });
    });
  });

  describe('deleteTopic', () => {
    it('should delete a topic', async () => {
      const topicId = '1';

      mockPrismaService.topic.delete.mockResolvedValue({ id: topicId });

      const result = await service.deleteTopic(topicId);

      expect(result).toEqual({ message: 'Topic deleted' });
      expect(mockPrismaService.topic.delete).toHaveBeenCalledWith({
        where: { id: topicId },
      });
    });
  });

  describe('getCurriculum', () => {
    it('should return curriculum for a grade', async () => {
      const grade = '9';
      const mockCurriculum = [
        { id: '1', subject: 'Math', grade: '9', topics: [] },
        { id: '2', subject: 'Science', grade: '9', topics: [] },
      ];

      mockPrismaService.topic.findMany.mockResolvedValue(mockCurriculum);

      const result = await service.getCurriculum(parseInt(grade));

      expect(result).toEqual({ message: 'Curriculum found', curriculum: mockCurriculum });
      expect(mockPrismaService.topic.findMany).toHaveBeenCalledWith({
        where: { grade: parseInt(grade) },
        orderBy: [
          { subject: 'asc' },
          { month: 'asc' }
        ]
      });
    });
  });
});
