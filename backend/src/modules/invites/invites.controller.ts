import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InvitesService } from './invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get()
  findAll() {
    return { message: 'Invites endpoint working', data: [] };
  }

  @Get(':token')
  verifyToken(@Param('token') token: string) {
    return { message: 'Token verification endpoint', data: { token } };
  }

  @Post()
  create(@Body() createInviteDto: any) {
    return { message: 'Invite created', data: createInviteDto };
  }

  @Post('verify')
  verify(@Body() verifyDto: any) {
    return { message: 'Invite verification', data: verifyDto };
  }
}
