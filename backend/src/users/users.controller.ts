import { Controller, Post, Body, UseGuards, Request, Get, Put, Delete, Param, Query, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const l = Math.min(parseInt(limit || '20', 10), 100);
    const o = Math.max(parseInt(offset || '0', 10), 0);
    if (Number.isNaN(l) || Number.isNaN(o)) {
      throw new BadRequestException('Invalid pagination params');
    }
    return this.usersService.getAllUsers({ limit: l, offset: o, select: { id: true, email: true, name: true, role: true, createdAt: true } });
  }

  @Post()
  async createUser(@Body() data: any) {
    return this.usersService.createUser(data);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    return this.usersService.getUserByEmail(email);
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateUser(id, data);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    const result = await this.usersService.deleteUser(id);
    return { message: 'User deleted successfully', id };
  }

  @Get('all')
  async getAllUsers(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const l = Math.min(parseInt(limit || '50', 10), 100);
    const o = Math.max(parseInt(offset || '0', 10), 0);
    if (Number.isNaN(l) || Number.isNaN(o)) {
      throw new BadRequestException('Invalid pagination params');
    }
    return this.usersService.getAllUsers({ limit: l, offset: o, select: { id: true, email: true, name: true, role: true, createdAt: true } });
  }

  @Post('student-profile')
  async createStudentProfile(@Body() data: any) {
    return this.usersService.createStudentProfile(data);
  }

  @Post('parent-profile')
  async createParentProfile(@Body() data: any) {
    return this.usersService.createParentProfile(data);
  }

  @Get('profile/:userId')
  async getUserProfile(@Param('userId') userId: string) {
    return this.usersService.getUserProfile(userId);
  }

  @Put('profile/:userId')
  async updateUserProfile(@Param('userId') userId: string, @Body() data: any) {
    return this.usersService.updateUserProfile(userId, data);
  }

  @Get('stats')
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @Post('complete-onboarding')
  @UseGuards(JwtAuthGuard)
  async completeOnboarding(@Body() onboardingData: any, @Request() req: any) {
    console.log('🎯 Complete onboarding request:', onboardingData);
    console.log('🎯 User ID from token:', req.user?.id);
    
    return this.usersService.completeOnboarding(req.user.id, onboardingData);
  }
}
