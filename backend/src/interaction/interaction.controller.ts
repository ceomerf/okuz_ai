import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('interaction')
@UseGuards(JwtAuthGuard)
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) {}

  @Post('chat')
  async handleChat(@Request() req: any, @Body() body: { message: string; context?: string }) {
    return this.interactionService.handleChat(req.user.id, body.message, body.context);
  }

  @Post('feedback')
  async processFeedback(@Request() req: any, @Body() body: { type: string; content: string; rating?: number }) {
    return this.interactionService.processFeedback(req.user.id, body.type, body.content, body.rating);
  }

  @Post('support')
  async handleSupport(@Request() req: any, @Body() body: { issue: string; priority: string }) {
    return this.interactionService.handleSupport(req.user.id, body.issue, body.priority);
  }
}
