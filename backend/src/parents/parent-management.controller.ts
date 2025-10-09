import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ParentManagementService } from './parent-management.service';

@Controller('parents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ParentManagementController {
  constructor(private readonly parentService: ParentManagementService) {}

  @Get()
  async getParents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('subscription') subscription?: string,
    @Query('hasChildren') hasChildren?: boolean,
  ) {
    return this.parentService.getParents({
      page,
      limit,
      search,
      isActive,
      subscription,
      hasChildren,
    });
  }

  @Get('stats')
  async getParentStats() {
    return this.parentService.getParentStats();
  }

  @Get(':id')
  async getParentById(@Param('id') id: string) {
    return this.parentService.getParentById(id);
  }

  @Get(':id/reports')
  async getParentReports(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.parentService.getParentReports(id, { page, limit });
  }

  @Get(':id/activities')
  async getParentActivities(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.parentService.getParentActivities(id, { page, limit });
  }

  @Post()
  async createParent(@Body() createData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    children?: string[];
  }) {
    return this.parentService.createParent(createData);
  }

  @Put(':id')
  async updateParent(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      isActive?: boolean;
    },
  ) {
    return this.parentService.updateParent(id, updateData);
  }

  @Delete(':id')
  async deleteParent(@Param('id') id: string) {
    return this.parentService.deleteParent(id);
  }

  @Post(':id/children')
  async assignChild(
    @Param('id') id: string,
    @Body() assignmentData: { childId: string },
  ) {
    return this.parentService.assignChild(id, assignmentData.childId);
  }

  @Delete(':id/children/:childId')
  async unassignChild(
    @Param('id') id: string,
    @Param('childId') childId: string,
  ) {
    return this.parentService.unassignChild(id, childId);
  }

  @Post(':id/reports')
  async generateReport(
    @Param('id') id: string,
    @Body() reportData: {
      studentId: string;
      weekStart: string;
    },
  ) {
    return this.parentService.generateReport(id, reportData.studentId, reportData.weekStart);
  }

  @Post('bulk-update')
  async bulkUpdateParents(
    @Body() bulkData: {
      parentIds: string[];
      updateData: {
        isActive?: boolean;
        subscription?: string;
      };
    },
  ) {
    return this.parentService.bulkUpdateParents(bulkData.parentIds, bulkData.updateData);
  }

  @Get('export')
  async exportParents(
    @Query('format') format: string,
    @Query() filters: any,
  ) {
    return this.parentService.exportParents(format, filters);
  }
}
