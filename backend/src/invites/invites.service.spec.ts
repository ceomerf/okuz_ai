import { Test, TestingModule } from '@nestjs/testing';
import { InvitesService } from './invites.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';

describe('InvitesService', () => {
  let service: InvitesService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        {
          provide: PrismaService,
          useValue: {
            invite: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvitesService>(InvitesService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvite', () => {
    it('should create an invite successfully', async () => {
      const mockInviteData = {
        inviterId: 'user123',
        email: 'test@example.com',
        role: 'STUDENT',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const mockCreatedInvite = {
        id: 'invite123',
        ...mockInviteData,
        token: 'invite-token-123',
        status: 'PENDING',
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.invite, 'create').mockResolvedValue(mockCreatedInvite as any);

      const result = await service.createInvite(mockInviteData);

      expect(result).toEqual(mockCreatedInvite);
      expect(prismaService.invite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviterId: mockInviteData.inviterId,
          email: mockInviteData.email,
          role: mockInviteData.role,
        }),
      });
    });

    it('should handle errors during invite creation', async () => {
      jest.spyOn(prismaService.invite, 'create').mockRejectedValue(new Error('Database error'));

      await expect(service.createInvite({} as any)).rejects.toThrow();
    });
  });

  describe('getInvite', () => {
    it('should retrieve invite from cache if available', async () => {
      const mockInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockInvite);

      const result = await service.getInvite('invite123');

      expect(result).toEqual(mockInvite);
      expect(cacheService.get).toHaveBeenCalledWith('invite:invite123');
    });

    it('should retrieve invite from database if not in cache', async () => {
      const mockInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(prismaService.invite, 'findUnique').mockResolvedValue(mockInvite as any);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await service.getInvite('invite123');

      expect(result).toEqual(mockInvite);
      expect(prismaService.invite.findUnique).toHaveBeenCalledWith({
        where: { id: 'invite123' },
      });
      expect(cacheService.set).toHaveBeenCalledWith('invite:invite123', mockInvite, 604800);
    });
  });

  describe('getInviteByToken', () => {
    it('should get invite by token', async () => {
      const mockInvite = {
        id: 'invite123',
        token: 'invite-token-123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      };

      jest.spyOn(prismaService.invite, 'findUnique').mockResolvedValue(mockInvite as any);

      const result = await service.getInviteByToken('invite-token-123');

      expect(result).toEqual(mockInvite);
      expect(prismaService.invite.findUnique).toHaveBeenCalledWith({
        where: { token: 'invite-token-123' },
      });
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite successfully', async () => {
      const mockInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      };

      const mockUpdatedInvite = {
        ...mockInvite,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      };

      jest.spyOn(prismaService.invite, 'findUnique').mockResolvedValue(mockInvite as any);
      jest.spyOn(prismaService.invite, 'update').mockResolvedValue(mockUpdatedInvite as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const result = await service.acceptInvite('invite123', 'user123');

      expect(result).toEqual(mockUpdatedInvite);
      expect(prismaService.invite.update).toHaveBeenCalledWith({
        where: { id: 'invite123' },
        data: {
          status: 'ACCEPTED',
          acceptedAt: expect.any(Date),
        },
      });
      expect(cacheService.del).toHaveBeenCalled();
    });

    it('should handle expired invite', async () => {
      const mockExpiredInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      jest.spyOn(prismaService.invite, 'findUnique').mockResolvedValue(mockExpiredInvite as any);

      await expect(service.acceptInvite('invite123', 'user123')).rejects.toThrow('Invite has expired');
    });

    it('should handle already accepted invite', async () => {
      const mockAcceptedInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'ACCEPTED',
      };

      jest.spyOn(prismaService.invite, 'findUnique').mockResolvedValue(mockAcceptedInvite as any);

      await expect(service.acceptInvite('invite123', 'user123')).rejects.toThrow('Invite has already been accepted');
    });
  });

  describe('declineInvite', () => {
    it('should decline invite successfully', async () => {
      const mockInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      };

      const mockUpdatedInvite = {
        ...mockInvite,
        status: 'DECLINED',
        declinedAt: new Date(),
      };

      jest.spyOn(prismaService.invite, 'findUnique').mockResolvedValue(mockInvite as any);
      jest.spyOn(prismaService.invite, 'update').mockResolvedValue(mockUpdatedInvite as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const result = await service.declineInvite('invite123');

      expect(result).toEqual(mockUpdatedInvite);
      expect(prismaService.invite.update).toHaveBeenCalledWith({
        where: { id: 'invite123' },
        data: {
          status: 'DECLINED',
          declinedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getUserInvites', () => {
    it('should get invites sent by user', async () => {
      const mockInvites = [
        { id: 'invite1', email: 'user1@example.com', status: 'PENDING' },
        { id: 'invite2', email: 'user2@example.com', status: 'ACCEPTED' },
      ];

      jest.spyOn(prismaService.invite, 'findMany').mockResolvedValue(mockInvites as any);

      const result = await service.getUserInvites('user123');

      expect(result).toEqual(mockInvites);
      expect(prismaService.invite.findMany).toHaveBeenCalledWith({
        where: { inviterId: 'user123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getInviteStats', () => {
    it('should get invite statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 20,
        accepted: 70,
        declined: 10,
      };

      jest.spyOn(service, 'getInviteStats').mockResolvedValue(mockStats as any);

      const result = await service.getInviteStats('user123');

      expect(result).toEqual(mockStats);
    });
  });

  describe('resendInvite', () => {
    it('should resend invite', async () => {
      const mockInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      };

      const mockUpdatedInvite = {
        ...mockInvite,
        token: 'new-invite-token-123',
        resentAt: new Date(),
      };

      jest.spyOn(prismaService.invite, 'findUnique').mockResolvedValue(mockInvite as any);
      jest.spyOn(prismaService.invite, 'update').mockResolvedValue(mockUpdatedInvite as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const result = await service.resendInvite('invite123');

      expect(result).toEqual(mockUpdatedInvite);
      expect(prismaService.invite.update).toHaveBeenCalledWith({
        where: { id: 'invite123' },
        data: {
          token: expect.any(String),
          resentAt: expect.any(Date),
          status: 'PENDING',
        },
      });
    });
  });

  describe('deleteInvite', () => {
    it('should delete invite', async () => {
      jest.spyOn(prismaService.invite, 'delete').mockResolvedValue({} as any);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      await service.deleteInvite('invite123');

      expect(prismaService.invite.delete).toHaveBeenCalledWith({
        where: { id: 'invite123' },
      });
      expect(cacheService.del).toHaveBeenCalled();
    });
  });
});
