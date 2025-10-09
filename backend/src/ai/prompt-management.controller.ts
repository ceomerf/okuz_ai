import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PromptManagementService } from './prompt-management.service';

@Controller('ai/prompts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class PromptManagementController {
  constructor(private readonly promptManagementService: PromptManagementService) {}

  @Get()
  async getPrompts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.promptManagementService.getPrompts({
      page,
      limit,
      category,
      isActive,
      search,
    });
  }

  @Get(':id')
  async getPromptById(@Param('id') id: string) {
    return this.promptManagementService.getPromptById(id);
  }

  @Post()
  async createPrompt(@Body() createData: {
    name: string;
    type: string;
    template: string;
    variables: string[];
    description?: string;
    tags?: string[];
    isActive?: boolean;
  }) {
    return this.promptManagementService.createPrompt(createData);
  }

  @Put(':id')
  async updatePrompt(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      type?: string;
      template?: string;
      variables?: string[];
      description?: string;
      tags?: string[];
      isActive?: boolean;
    },
  ) {
    return this.promptManagementService.updatePrompt(id, updateData);
  }

  @Delete(':id')
  async deletePrompt(@Param('id') id: string) {
    return this.promptManagementService.deletePrompt(id);
  }

  @Get(':id/versions')
  async getPromptVersions(@Param('id') id: string) {
    return this.promptManagementService.getPromptVersions(id);
  }

  @Post(':id/versions')
  async createPromptVersion(
    @Param('id') id: string,
    @Body() versionData: {
      version: string;
      template: string;
      description?: string;
    },
  ) {
    return this.promptManagementService.createPromptVersion(id, versionData);
  }

  @Put(':id/activate')
  async activatePrompt(@Param('id') id: string) {
    return this.promptManagementService.updatePrompt(id, { isActive: true });
  }

  @Put(':id/deactivate')
  async deactivatePrompt(@Param('id') id: string) {
    return this.promptManagementService.updatePrompt(id, { isActive: false });
  }

  @Get(':id/usage')
  async getPromptUsage(@Param('id') id: string) {
    return this.promptManagementService.getPromptUsage(id);
  }

  @Get(':id/performance')
  async getPromptPerformance(@Param('id') id: string) {
    return this.promptManagementService.getPromptPerformance(id);
  }

  @Post(':id/duplicate')
  async duplicatePrompt(@Param('id') id: string) {
    return this.promptManagementService.duplicatePrompt(id);
  }
}