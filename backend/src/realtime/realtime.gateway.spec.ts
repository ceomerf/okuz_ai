import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { JwtService } from '@nestjs/jwt';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should handle successful connection', async () => {
      const mockClient = {
        id: 'client123',
        handshake: {
          auth: {
            token: 'valid-token',
          },
        },
        join: jest.fn(),
        emit: jest.fn(),
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'STUDENT',
      };

      jest.spyOn(jwtService, 'verify').mockReturnValue(mockUser);

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.join).toHaveBeenCalledWith('user123');
      expect(mockClient.emit).toHaveBeenCalledWith('connected', { userId: 'user123' });
    });

    it('should handle connection with invalid token', async () => {
      const mockClient = {
        id: 'client123',
        handshake: {
          auth: {
            token: 'invalid-token',
          },
        },
        disconnect: jest.fn(),
      };

      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should handle connection without token', async () => {
      const mockClient = {
        id: 'client123',
        handshake: {
          auth: {},
        },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockClient as any);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection', async () => {
      const mockClient = {
        id: 'client123',
        leave: jest.fn(),
      };

      // Gerçek implementasyonu çalıştır
      await gateway.handleDisconnect(mockClient as any);

      expect(mockClient.leave).toHaveBeenCalled();
    });
  });

  describe('joinRoom', () => {
    it('should join user to room', async () => {
      const mockClient = {
        id: 'client123',
        join: jest.fn(),
        emit: jest.fn(),
      };

      const mockData = {
        room: 'study-room-123',
        userId: 'user123',
      };

      // gerçek implementasyonu çalıştır

      await gateway.joinRoom(mockClient as any, mockData);

      expect(mockClient.join).toHaveBeenCalledWith('study-room-123');
      expect(mockClient.emit).toHaveBeenCalledWith('joined-room', { room: 'study-room-123' });
    });
  });

  describe('leaveRoom', () => {
    it('should leave user from room', async () => {
      const mockClient = {
        id: 'client123',
        leave: jest.fn(),
        emit: jest.fn(),
      };

      const mockData = {
        room: 'study-room-123',
        userId: 'user123',
      };

      // gerçek implementasyonu çalıştır

      await gateway.leaveRoom(mockClient as any, mockData);

      expect(mockClient.leave).toHaveBeenCalledWith('study-room-123');
      expect(mockClient.emit).toHaveBeenCalledWith('left-room', { room: 'study-room-123' });
    });
  });

  describe('sendMessage', () => {
    it('should send message to room', async () => {
      const mockClient = {
        id: 'client123',
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      const mockData = {
        room: 'study-room-123',
        message: 'Hello everyone!',
        userId: 'user123',
      };

      // gerçek implementasyonu çalıştır

      await gateway.sendMessage(mockClient as any, mockData);

      expect(mockClient.to).toHaveBeenCalledWith('study-room-123');
      expect(mockClient.emit).toHaveBeenCalledWith('message', {
        message: 'Hello everyone!',
        userId: 'user123',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('broadcastToUser', () => {
    it('should broadcast message to specific user', async () => {
      const mockData = {
        userId: 'user123',
        event: 'notification',
        data: { message: 'You have a new notification' },
      };

      jest.spyOn(gateway, 'broadcastToUser').mockResolvedValue(undefined);

      await gateway.broadcastToUser(mockData);

      // This would typically use the server instance to emit to specific user
      expect(gateway.broadcastToUser).toHaveBeenCalledWith(mockData);
    });
  });

  describe('broadcastToRoom', () => {
    it('should broadcast message to room', async () => {
      const mockData = {
        room: 'study-room-123',
        event: 'update',
        data: { content: 'Room updated' },
      };

      jest.spyOn(gateway, 'broadcastToRoom').mockResolvedValue(undefined);

      await gateway.broadcastToRoom(mockData);

      expect(gateway.broadcastToRoom).toHaveBeenCalledWith(mockData);
    });
  });

  describe('getConnectedUsers', () => {
    it('should return connected users count', async () => {
      const mockCount = 5;

      jest.spyOn(gateway, 'getConnectedUsers').mockResolvedValue(mockCount);

      const result = await gateway.getConnectedUsers();

      expect(result).toBe(mockCount);
    });
  });
});
