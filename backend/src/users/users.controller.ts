import { Controller, Post, Body, UseGuards, Request, Get, Put, Delete, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers() {
    return this.usersService.getAllUsers();
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
  async getAllUsers() {
    return this.usersService.getAllUsers();
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
