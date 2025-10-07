import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ParentsService } from './parents.service';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post()
  async createParent(@Body() data: any) {
    return this.parentsService.createParent(data);
  }

  @Get(':id')
  async getParent(@Param('id') id: string) {
    return this.parentsService.getParent(id);
  }

  @Get(':id/children')
  async getChildren(@Param('id') id: string) {
    return this.parentsService.getChildren(id);
  }

  @Get(':id/children/:childId/progress')
  async getChildProgress(@Param('id') id: string, @Param('childId') childId: string) {
    return this.parentsService.getChildProgress(childId);
  }

  @Put(':id')
  async updateParent(@Param('id') id: string, @Body() data: any) {
    return this.parentsService.updateParent(id, data);
  }

  @Delete(':id')
  async deleteParent(@Param('id') id: string) {
    return this.parentsService.deleteParent(id);
  }

  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string) {
    return this.parentsService.getParentDashboard(id);
  }
}
