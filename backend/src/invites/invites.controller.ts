import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  async createInvite(@Request() req: any, @Body() inviteData: any) {
    return this.invitesService.createInvite(inviteData);
  }

  @Get('token/:token')
  async findInvite(@Param('token') token: string) {
    return this.invitesService.findInvite(token);
  }

  @Post('accept/:id')
  async acceptInvite(@Param('id') id: string, @Request() req: any) {
    return this.invitesService.acceptInvite(id, req.user.id);
  }

  @Get('user/:userId')
  async getInvites(@Param('userId') userId: string) {
    return this.invitesService.getInvites(userId);
  }

  @Get(':id')
  async getInvite(@Param('id') id: string) {
    return this.invitesService.getInvite(id);
  }

  @Get('by-token/:token')
  async getInviteByToken(@Param('token') token: string) {
    return this.invitesService.getInviteByToken(token);
  }

  @Put('decline/:id')
  async declineInvite(@Param('id') id: string) {
    return this.invitesService.declineInvite(id);
  }

  @Get('user/:userId/invites')
  async getUserInvites(@Param('userId') userId: string) {
    return this.invitesService.getUserInvites(userId);
  }

  @Get('stats/:userId')
  async getInviteStats(@Param('userId') userId: string) {
    return this.invitesService.getInviteStats(userId);
  }

  @Post('resend/:id')
  async resendInvite(@Param('id') id: string) {
    return this.invitesService.resendInvite(id);
  }

  @Delete(':id')
  async deleteInvite(@Param('id') id: string) {
    return this.invitesService.deleteInvite(id);
  }
}
