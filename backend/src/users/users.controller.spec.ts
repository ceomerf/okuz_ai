import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            getUser: jest.fn(),
            getUserByEmail: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            getAllUsers: jest.fn(),
            createStudentProfile: jest.fn(),
            createParentProfile: jest.fn(),
            getUserProfile: jest.fn(),
            updateUserProfile: jest.fn(),
            getUserStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const mockUserData = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'STUDENT',
        password: 'hashedpassword',
      };

      const mockCreatedUser = {
        id: 'user123',
        ...mockUserData,
        createdAt: new Date(),
      };

      jest.spyOn(usersService, 'createUser').mockResolvedValue(mockCreatedUser as any);

      const result = await controller.createUser(mockUserData);

      expect(result).toEqual(mockCreatedUser);
      expect(usersService.createUser).toHaveBeenCalledWith(mockUserData);
    });
  });

  describe('getUser', () => {
    it('should get user by id', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STUDENT',
      };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(mockUser as any);

      const result = await controller.getUser('user123');

      expect(result).toEqual(mockUser);
      expect(usersService.getUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STUDENT',
      };

      jest.spyOn(usersService, 'getUserByEmail').mockResolvedValue(mockUser as any);

      const result = await controller.getUserByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(usersService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const mockUpdateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const mockUpdatedUser = {
        id: 'user123',
        ...mockUpdateData,
        updatedAt: new Date(),
      };

      jest.spyOn(usersService, 'updateUser').mockResolvedValue(mockUpdatedUser as any);

      const result = await controller.updateUser('user123', mockUpdateData);

      expect(result).toEqual(mockUpdatedUser);
      expect(usersService.updateUser).toHaveBeenCalledWith('user123', mockUpdateData);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      jest.spyOn(usersService, 'deleteUser').mockResolvedValue({ message: 'User deleted successfully' });

      await controller.deleteUser('user123');

      expect(usersService.deleteUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('getAllUsers', () => {
    it('should get all users', async () => {
      const mockUsers = [
        { id: 'user1', name: 'User 1', email: 'user1@example.com' },
        { id: 'user2', name: 'User 2', email: 'user2@example.com' },
      ];

      jest.spyOn(usersService, 'getAllUsers').mockResolvedValue(mockUsers as any);

      const result = await controller.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(usersService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('createStudentProfile', () => {
    it('should create student profile', async () => {
      const mockProfileData = {
        userId: 'user123',
        grade: 10,
        field: 'Science',
        learningStyle: 'Visual',
        goals: ['Get high score'],
        weaknesses: ['Math'],
        interests: ['Physics'],
      };

      const mockCreatedProfile = {
        id: 'profile123',
        ...mockProfileData,
        createdAt: new Date(),
      };

      jest.spyOn(usersService, 'createStudentProfile').mockResolvedValue(mockCreatedProfile as any);

      const result = await controller.createStudentProfile(mockProfileData);

      expect(result).toEqual(mockCreatedProfile);
      expect(usersService.createStudentProfile).toHaveBeenCalledWith(mockProfileData);
    });
  });

  describe('createParentProfile', () => {
    it('should create parent profile', async () => {
      const mockProfileData = {
        userId: 'user123',
        name: 'Parent Name',
        phone: '+1234567890',
        children: ['child1', 'child2'],
      };

      const mockCreatedProfile = {
        id: 'profile123',
        ...mockProfileData,
        createdAt: new Date(),
      };

      jest.spyOn(usersService, 'createParentProfile').mockResolvedValue(mockCreatedProfile as any);

      const result = await controller.createParentProfile(mockProfileData);

      expect(result).toEqual(mockCreatedProfile);
      expect(usersService.createParentProfile).toHaveBeenCalledWith(mockProfileData);
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile', async () => {
      const mockProfile = {
        id: 'profile123',
        userId: 'user123',
        grade: 10,
        field: 'Science',
      };

      jest.spyOn(usersService, 'getUserProfile').mockResolvedValue(mockProfile as any);

      const result = await controller.getUserProfile('user123');

      expect(result).toEqual(mockProfile);
      expect(usersService.getUserProfile).toHaveBeenCalledWith('user123');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const mockUpdateData = {
        grade: 11,
        field: 'Mathematics',
      };

      const mockUpdatedProfile = {
        id: 'profile123',
        ...mockUpdateData,
        updatedAt: new Date(),
      };

      jest.spyOn(usersService, 'updateUserProfile').mockResolvedValue(mockUpdatedProfile as any);

      const result = await controller.updateUserProfile('user123', mockUpdateData);

      expect(result).toEqual(mockUpdatedProfile);
      expect(usersService.updateUserProfile).toHaveBeenCalledWith('user123', mockUpdateData);
    });
  });

  describe('getUserStats', () => {
    it('should get user statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 85,
        students: 70,
        parents: 15,
        lastLogin: new Date(),
      };

      jest.spyOn(usersService, 'getUserStats').mockResolvedValue(mockStats as any);

      const result = await controller.getUserStats();

      expect(result).toEqual(mockStats);
      expect(usersService.getUserStats).toHaveBeenCalled();
    });
  });
});
