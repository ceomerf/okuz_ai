import { Controller, Post, Body, UseGuards, Request, Get, Param, Put, Delete } from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('interaction')
@UseGuards(JwtAuthGuard)
export class InteractionController {
  constructor(private readonly interactionService: InteractionService) {}

  @Post()
  async createInteraction(@Request() req: any, @Body() interactionData: any) {
    return this.interactionService.createInteraction(interactionData);
  }

  @Get(':id')
  async getInteraction(@Param('id') id: string) {
    return this.interactionService.getInteraction(id);
  }

  @Get('user/:userId')
  async getUserInteractions(@Param('userId') userId: string) {
    return this.interactionService.getUserInteractions(userId);
  }

  @Get('type/:type')
  async getInteractionsByType(@Param('type') type: string) {
    return this.interactionService.getInteractionsByType(type);
  }

  @Put(':id')
  async updateInteraction(@Param('id') id: string, @Body() updateData: any) {
    return this.interactionService.updateInteraction(id, updateData);
  }

  @Delete(':id')
  async deleteInteraction(@Param('id') id: string) {
    return this.interactionService.deleteInteraction(id);
  }

  @Get('stats/:userId')
  async getInteractionStats(@Param('userId') userId: string) {
    return this.interactionService.getInteractionStats(userId);
  }

  @Get('behavior/:userId')
  async getUserBehaviorPattern(@Param('userId') userId: string) {
    return this.interactionService.getUserBehaviorPattern(userId);
  }

  @Get('journey/:userId')
  async trackUserJourney(@Param('userId') userId: string) {
    return this.interactionService.trackUserJourney(userId);
  }

  @Get('heatmap/:page')
  async getHeatmapData(@Param('page') page: string) {
    return this.interactionService.getHeatmapData(page);
  }

  @Get('engagement/:userId')
  async getUserEngagement(@Param('userId') userId: string) {
    return this.interactionService.getUserEngagement(userId);
  }

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
