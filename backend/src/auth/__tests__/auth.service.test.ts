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
      getUserSubscription: jest.fn(),
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
      const userId = '1';
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        isActive: true,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser(userId);

      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        isActive: true,
      });
    });

    it('should return null when user is not found', async () => {
      const userId = '1';

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(userId);

      expect(result).toBeNull();
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
        email: 'test@example.com',
        isActive: true,
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'generateTokens').mockResolvedValue(mockTokens);

      const result = await service.login(loginData);

      expect(result).toEqual({
        user: {
          id: '1',
          email: 'test@example.com',
          isActive: true,
        },
        tokens: mockTokens,
      });
    });
  });

  describe('register', () => {
    it('should create user and return tokens when registration is successful', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
      };

      const mockUser = {
        id: '1',
        email: userData.email,
        name: userData.name,
        isActive: true,
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'generateTokens').mockResolvedValue(mockTokens);

      const result = await service.register(userData);

      expect(result).toEqual({
        user: {
          id: '1',
          email: userData.email,
          name: userData.name,
          isActive: true,
        },
        tokens: mockTokens,
      });
    });

    it('should throw error when user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: userData.email,
      });

      await expect(service.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('logout', () => {
    it('should return success when logout is called', async () => {
      const userId = '1';
      const refreshToken = 'refresh-token';

      const result = await service.logout(userId, refreshToken);

      expect(result).toEqual({ success: true });
    });
  });
});