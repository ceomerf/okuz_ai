import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { SubscriptionService } from '../../subscription/subscription.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockSubscriptionService = {
      getActiveSubscription: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when user exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);

      const result = await service.validateUser('1');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('1');

      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should create user when registration is successful', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        accountType: 'STUDENT',
      };

      const mockUser = {
        id: '1',
        email: userData.email,
        name: userData.name,
        accountType: userData.accountType,
        isActive: true,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser as any);

      const result = await service.register(userData);

      expect(result).toEqual({
        user: mockUser,
        tokens: expect.any(Object),
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        accountType: 'STUDENT',
      };

      const existingUser = {
        id: '1',
        email: userData.email,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(existingUser as any);

      await expect(service.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should return tokens when login is successful', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        password: '$2b$10$hashedpassword',
        isActive: true,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);
      // Password validation is done internally in login method

      const result = await service.login(loginData);

      expect(result).toEqual({
        user: expect.any(Object),
        tokens: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockRefreshToken = {
        id: '1',
        userId: '1',
        token: refreshToken,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        isActive: true,
      };

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken as any);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser as any);

      const result = await service.refreshToken({ refreshToken });

      expect(result).toEqual({
        tokens: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshToken({ refreshToken })).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should deactivate refresh token when logout is successful', async () => {
      const userId = '1';
      const refreshToken = 'valid-refresh-token';

      (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.logout(userId, refreshToken);

      expect(result).toEqual({ success: true });
    });

    it('should throw UnauthorizedException when logout fails', async () => {
      const userId = '1';
      const refreshToken = 'invalid-refresh-token';

      (prismaService.refreshToken.delete as jest.Mock).mockRejectedValue(new Error('Token not found'));

      await expect(service.logout(userId, refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });
});