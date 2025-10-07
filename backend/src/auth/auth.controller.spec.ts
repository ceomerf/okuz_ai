import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            validateUser: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const mockRegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const mockResponse = {
        user: { id: 'user123', email: 'test@example.com' },
        token: 'jwt-token',
      };

      jest.spyOn(authService, 'register').mockResolvedValue(mockResponse as any);

      const result = await controller.register(mockRegisterDto as any);

      expect(result).toEqual(mockResponse);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
    });

    it('should handle registration errors', async () => {
      const mockRegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      jest.spyOn(authService, 'register').mockRejectedValue(new Error('User already exists'));

      await expect(controller.register(mockRegisterDto as any)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const mockLoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse = {
        user: { id: 'user123', email: 'test@example.com' },
        token: 'jwt-token',
      };

      jest.spyOn(authService, 'login').mockResolvedValue(mockResponse as any);

      const result = await controller.login(mockLoginDto as any);

      expect(result).toEqual(mockResponse);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
    });

    it('should handle login errors', async () => {
      const mockLoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      jest.spyOn(authService, 'login').mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(mockLoginDto as any)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const mockRefreshDto = {
        refreshToken: 'refresh-token',
      };

      const mockResponse = {
        accessToken: 'new-access-token',
      };

      jest.spyOn(authService, 'refreshToken').mockResolvedValue(mockResponse as any);

      const result = await controller.refreshToken(mockRefreshDto as any);

      expect(result).toEqual(mockResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(mockRefreshDto);
    });

    it('should handle invalid refresh token', async () => {
      const mockRefreshDto = {
        refreshToken: 'invalid-token',
      };

      jest.spyOn(authService, 'refreshToken').mockRejectedValue(new Error('Invalid refresh token'));

      await expect(controller.refreshToken(mockRefreshDto as any)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockRequest = {
        user: { id: 'user123' },
      };

      jest.spyOn(authService, 'logout').mockResolvedValue({ success: true } as any);

      const mockBody = { refreshToken: 'refresh-token-123' };
      const result = await controller.logout(mockRequest as any, mockBody);

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith('user123', 'refresh-token-123');
    });
  });

  describe('getProfile', () => {
    it('should get user profile', async () => {
      const mockRequest = {
        user: {
          id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      const result = await controller.getProfile(mockRequest as any);

      expect(result).toEqual(mockRequest.user);
    });
  });
});

