import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateInviteDto {
  inviterId: string;
  email: string;
  role: string;
  expiresAt?: Date;
}

export interface AcceptInviteDto {
  userId: string;
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async createInvite(inviteData: CreateInviteDto) {
    try {
      const token = uuidv4();
      const expiresAt = inviteData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invite = await (this.prisma as any).invite.create({
        data: {
          id: uuidv4(),
          inviterId: inviteData.inviterId,
          email: inviteData.email,
          role: inviteData.role,
          type: 'student', // Default type
          token,
          status: 'PENDING',
          expiresAt,
          createdAt: new Date(),
        },
      });

      // Cache the invite
      await this.cacheService?.set(`invite:${invite.id}`, invite, 7 * 24 * 60 * 60); // 7 days

      return invite;
    } catch (error) {
      throw new BadRequestException('Failed to create invite');
    }
  }

  async getInvite(id: string) {
    try {
      // Try cache first
      const cached = await this.cacheService?.get(`invite:${id}`);
      if (cached) {
        return cached;
      }

      // Get from database
      const invite = await (this.prisma as any).invite.findUnique({
        where: { id },
      });

      if (!invite) {
        throw new NotFoundException('Invite not found');
      }

      // Cache the result
      await this.cacheService?.set(`invite:${id}`, invite, 7 * 24 * 60 * 60);

      return invite;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get invite');
    }
  }

  async getInviteByToken(token: string) {
    try {
      const invite = await (this.prisma as any).invite.findUnique({
        where: { token },
      });

      if (!invite) {
        throw new NotFoundException('Invite not found');
      }

      return invite;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get invite by token');
    }
  }

  async acceptInvite(inviteId: string, userId: string) {
    try {
      const invite = await (this.prisma as any).invite.findUnique({
        where: { id: inviteId },
      });

      if (!invite) {
        throw new NotFoundException('Invite not found');
      }

      if (invite.status !== 'PENDING') {
        throw new BadRequestException('Invite has already been accepted');
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        throw new BadRequestException('Invite has expired');
      }

      const updatedInvite = await (this.prisma as any).invite.update({
        where: { id: inviteId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      // Remove from cache
      await this.cacheService?.del(`invite:${inviteId}`);

      return updatedInvite;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to accept invite');
    }
  }

  async declineInvite(inviteId: string) {
    try {
      const updatedInvite = await (this.prisma as any).invite.update({
        where: { id: inviteId },
        data: {
          status: 'DECLINED',
          declinedAt: new Date(),
        },
      });

      // Remove from cache
      await this.cacheService?.del(`invite:${inviteId}`);

      return updatedInvite;
    } catch (error) {
      throw new BadRequestException('Failed to decline invite');
    }
  }

  async getUserInvites(userId: string) {
    try {
      const invites = await (this.prisma as any).invite.findMany({
        where: { inviterId: userId },
        orderBy: { createdAt: 'desc' },
      });

      return invites;
    } catch (error) {
      throw new BadRequestException('Failed to get user invites');
    }
  }

  async resendInvite(inviteId: string) {
    try {
      const newToken = uuidv4();
      const updatedInvite = await (this.prisma as any).invite.update({
        where: { id: inviteId },
        data: {
          token: newToken,
          resentAt: new Date(),
          status: 'PENDING',
        },
      });

      return updatedInvite;
    } catch (error) {
      throw new BadRequestException('Failed to resend invite');
    }
  }

  async deleteInvite(inviteId: string) {
    try {
      await (this.prisma as any).invite.delete({
        where: { id: inviteId },
      });

      // Remove from cache
      await this.cacheService?.del(`invite:${inviteId}`);
      
      return { message: 'Invite deleted successfully', id: inviteId };
    } catch (error) {
      throw new BadRequestException('Failed to delete invite');
    }
  }

  async findInvite(token: string) {
    return this.getInviteByToken(token);
  }

  async getInvites(userId: string) {
    return this.getUserInvites(userId);
  }

  async getInviteStats(userId: string) {
    try {
      const stats = await (this.prisma as any).invite.groupBy({
        by: ['status'],
        where: { inviterId: userId },
        _count: true,
      });

      return stats.reduce((acc: any, stat: any) => {
        acc[stat.status.toLowerCase()] = stat._count;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      throw new BadRequestException('Failed to get invite stats');
    }
  }
}
