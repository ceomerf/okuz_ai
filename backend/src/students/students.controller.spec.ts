import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

describe('StudentsController', () => {
  let controller: StudentsController;
  let studentsService: StudentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: {
            createStudent: jest.fn(),
            getStudent: jest.fn(),
            updateStudent: jest.fn(),
            getStudentProgress: jest.fn(),
            createStudySession: jest.fn(),
            recordExamResult: jest.fn(),
            getStudentDashboard: jest.fn(),
            getStudyRecommendations: jest.fn(),
            updateLearningStyle: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StudentsController>(StudentsController);
    studentsService = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createStudent', () => {
    it('should create a new student', async () => {
      const mockStudentData = {
        userId: 'user123',
        grade: 10,
        field: 'Science',
        learningStyle: 'Visual',
        goals: ['Get high score'],
        weaknesses: ['Math'],
        interests: ['Physics'],
      };

      const mockCreatedStudent = {
        id: 'student123',
        ...mockStudentData,
        createdAt: new Date(),
      };

      jest.spyOn(studentsService, 'createStudent').mockResolvedValue(mockCreatedStudent as any);

      const result = await controller.createStudent(mockStudentData);

      expect(result).toEqual(mockCreatedStudent);
      expect(studentsService.createStudent).toHaveBeenCalledWith(mockStudentData);
    });
  });

  describe('getStudent', () => {
    it('should get student by id', async () => {
      const mockStudent = {
        id: 'student123',
        userId: 'user123',
        grade: 10,
        field: 'Science',
      };

      jest.spyOn(studentsService, 'getStudent').mockResolvedValue(mockStudent as any);

      const result = await controller.getStudent('student123');

      expect(result).toEqual(mockStudent);
      expect(studentsService.getStudent).toHaveBeenCalledWith('student123');
    });
  });

  describe('updateStudent', () => {
    it('should update student', async () => {
      const mockUpdateData = {
        grade: 11,
        field: 'Mathematics',
      };

      const mockUpdatedStudent = {
        id: 'student123',
        ...mockUpdateData,
        updatedAt: new Date(),
      };

      jest.spyOn(studentsService, 'updateStudent').mockResolvedValue(mockUpdatedStudent as any);

      const result = await controller.updateStudent('student123', mockUpdateData);

      expect(result).toEqual(mockUpdatedStudent);
      expect(studentsService.updateStudent).toHaveBeenCalledWith('student123', mockUpdateData);
    });
  });

  describe('getStudentProgress', () => {
    it('should get student progress', async () => {
      const mockProgress = {
        sessions: [
          { id: 'session1', subject: 'Math', duration: 60, isCompleted: true },
        ],
        exams: [
          { id: 'exam1', subject: 'Math', score: 85, totalScore: 100 },
        ],
      };

      jest.spyOn(studentsService, 'getStudentProgress').mockResolvedValue(mockProgress as any);

      const result = await controller.getStudentProgress('student123');

      expect(result).toEqual(mockProgress);
      expect(studentsService.getStudentProgress).toHaveBeenCalledWith('student123');
    });
  });

  describe('createStudySession', () => {
    it('should create study session', async () => {
      const mockSessionData = {
        studentId: 'student123',
        subject: 'Math',
        topic: 'Algebra',
        duration: 60,
        difficulty: 'medium',
      };

      const mockCreatedSession = {
        id: 'session123',
        ...mockSessionData,
        startTime: new Date(),
        isCompleted: false,
      };

      jest.spyOn(studentsService, 'createStudySession').mockResolvedValue(mockCreatedSession as any);

      const result = await controller.createStudySession(mockSessionData);

      expect(result).toEqual(mockCreatedSession);
      expect(studentsService.createStudySession).toHaveBeenCalledWith(mockSessionData);
    });
  });

  describe('recordExamResult', () => {
    it('should record exam result', async () => {
      const mockExamData = {
        studentId: 'student123',
        subject: 'Math',
        examType: 'Quiz',
        score: 85,
        totalScore: 100,
        analysis: { strengths: ['Algebra'], weaknesses: ['Geometry'] },
      };

      const mockCreatedExam = {
        id: 'exam123',
        ...mockExamData,
        createdAt: new Date(),
      };

      jest.spyOn(studentsService, 'recordExamResult').mockResolvedValue(mockCreatedExam as any);

      const result = await controller.recordExamResult(mockExamData);

      expect(result).toEqual(mockCreatedExam);
      expect(studentsService.recordExamResult).toHaveBeenCalledWith(mockExamData);
    });
  });

  describe('getStudentDashboard', () => {
    it('should get student dashboard', async () => {
      const mockDashboard = {
        student: { id: 'student123', grade: 10, field: 'Science' },
        progress: { sessions: [], exams: [] },
        recommendations: [],
      };

      jest.spyOn(studentsService, 'getStudentDashboard').mockResolvedValue(mockDashboard as any);

      const result = await controller.getStudentDashboard('student123');

      expect(result).toEqual(mockDashboard);
      expect(studentsService.getStudentDashboard).toHaveBeenCalledWith('student123');
    });
  });

  describe('getStudyRecommendations', () => {
    it('should get study recommendations', async () => {
      const mockRecommendations = [
        { topic: 'Algebra', priority: 'high', reason: 'Weak performance' },
        { topic: 'Geometry', priority: 'medium', reason: 'Average performance' },
      ];

      jest.spyOn(studentsService, 'getStudyRecommendations').mockResolvedValue(mockRecommendations as any);

      const result = await controller.getStudyRecommendations('student123');

      expect(result).toEqual(mockRecommendations);
      expect(studentsService.getStudyRecommendations).toHaveBeenCalledWith('student123');
    });
  });

  describe('updateLearningStyle', () => {
    it('should update learning style', async () => {
      const mockUpdatedStudent = {
        id: 'student123',
        learningStyle: 'Auditory',
        updatedAt: new Date(),
      };

      jest.spyOn(studentsService, 'updateLearningStyle').mockResolvedValue(mockUpdatedStudent as any);

      const result = await controller.updateLearningStyle('student123', { learningStyle: 'Auditory' });

      expect(result).toEqual(mockUpdatedStudent);
      expect(studentsService.updateLearningStyle).toHaveBeenCalledWith('student123', 'Auditory');
    });
  });
});
