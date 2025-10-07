import { Test, TestingModule } from '@nestjs/testing';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';

describe('InvitesController', () => {
  let controller: InvitesController;
  let invitesService: InvitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [
        {
          provide: InvitesService,
          useValue: {
            createInvite: jest.fn(),
            getInvite: jest.fn(),
            getInviteByToken: jest.fn(),
            acceptInvite: jest.fn(),
            declineInvite: jest.fn(),
            getUserInvites: jest.fn(),
            getInviteStats: jest.fn(),
            resendInvite: jest.fn(),
            deleteInvite: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvitesController>(InvitesController);
    invitesService = module.get<InvitesService>(InvitesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInvite', () => {
    it('should create a new invite', async () => {
      const mockInviteData = {
        inviterId: 'user123',
        email: 'test@example.com',
        role: 'STUDENT',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const mockCreatedInvite = {
        id: 'invite123',
        ...mockInviteData,
        token: 'invite-token-123',
        status: 'PENDING',
        createdAt: new Date(),
      };

      jest.spyOn(invitesService, 'createInvite').mockResolvedValue(mockCreatedInvite as any);

      const mockRequest = { user: { id: 'user123' } };
      const result = await controller.createInvite(mockRequest, mockInviteData);

      expect(result).toEqual(mockCreatedInvite);
      expect(invitesService.createInvite).toHaveBeenCalledWith(mockInviteData);
    });
  });

  describe('getInvite', () => {
    it('should get invite by id', async () => {
      const mockInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
      };

      jest.spyOn(invitesService, 'getInvite').mockResolvedValue(mockInvite as any);

      const result = await controller.getInvite('invite123');

      expect(result).toEqual(mockInvite);
      expect(invitesService.getInvite).toHaveBeenCalledWith('invite123');
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

      jest.spyOn(invitesService, 'getInviteByToken').mockResolvedValue(mockInvite as any);

      const result = await controller.getInviteByToken('invite-token-123');

      expect(result).toEqual(mockInvite);
      expect(invitesService.getInviteByToken).toHaveBeenCalledWith('invite-token-123');
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite', async () => {
      const mockAcceptedInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      };

      jest.spyOn(invitesService, 'acceptInvite').mockResolvedValue(mockAcceptedInvite as any);

      const result = await controller.acceptInvite('invite123', { user: { id: 'user123' } });

      expect(result).toEqual(mockAcceptedInvite);
      expect(invitesService.acceptInvite).toHaveBeenCalledWith('invite123', 'user123');
    });
  });

  describe('declineInvite', () => {
    it('should decline invite', async () => {
      const mockDeclinedInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'DECLINED',
        declinedAt: new Date(),
      };

      jest.spyOn(invitesService, 'declineInvite').mockResolvedValue(mockDeclinedInvite as any);

      const result = await controller.declineInvite('invite123');

      expect(result).toEqual(mockDeclinedInvite);
      expect(invitesService.declineInvite).toHaveBeenCalledWith('invite123');
    });
  });

  describe('getUserInvites', () => {
    it('should get user invites', async () => {
      const mockInvites = [
        { id: 'invite1', email: 'user1@example.com', status: 'PENDING' },
        { id: 'invite2', email: 'user2@example.com', status: 'ACCEPTED' },
      ];

      jest.spyOn(invitesService, 'getUserInvites').mockResolvedValue(mockInvites as any);

      const result = await controller.getUserInvites('user123');

      expect(result).toEqual(mockInvites);
      expect(invitesService.getUserInvites).toHaveBeenCalledWith('user123');
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

      jest.spyOn(invitesService, 'getInviteStats').mockResolvedValue(mockStats as any);

      const result = await controller.getInviteStats('user123');

      expect(result).toEqual(mockStats);
      expect(invitesService.getInviteStats).toHaveBeenCalledWith('user123');
    });
  });

  describe('resendInvite', () => {
    it('should resend invite', async () => {
      const mockResentInvite = {
        id: 'invite123',
        email: 'test@example.com',
        role: 'STUDENT',
        status: 'PENDING',
        token: 'new-invite-token-123',
        resentAt: new Date(),
      };

      jest.spyOn(invitesService, 'resendInvite').mockResolvedValue(mockResentInvite as any);

      const result = await controller.resendInvite('invite123');

      expect(result).toEqual(mockResentInvite);
      expect(invitesService.resendInvite).toHaveBeenCalledWith('invite123');
    });
  });

  describe('deleteInvite', () => {
    it('should delete invite', async () => {
      jest.spyOn(invitesService, 'deleteInvite').mockResolvedValue({ message: 'Invite deleted', id: 'invite123' });

      await controller.deleteInvite('invite123');

      expect(invitesService.deleteInvite).toHaveBeenCalledWith('invite123');
    });
  });
});
