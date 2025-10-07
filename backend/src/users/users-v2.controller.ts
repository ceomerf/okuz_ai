import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiVersion } from '@nestjs/swagger';
import { VersioningService } from '../common/versioning/versioning.service';

@ApiTags('Users v2')
@Controller({
  path: 'users',
  version: '2',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersV2Controller {
  constructor(
    private readonly usersService: UsersService,
    private readonly versioningService: VersioningService,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all users with enhanced filtering and pagination',
    description: 'Enhanced version with advanced filtering, sorting, and pagination capabilities'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number, default is 1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page, default is 10, max is 100' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or email' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field (name, email, createdAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc, desc)' })
  @ApiResponse({ status: 200, description: 'List of users with enhanced metadata' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    limit = Math.max(1, Math.min(limit, 100));
    
    const filters = {
      search,
      role,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };

    const result = await this.usersService.getAllUsersEnhanced({ 
      page, 
      limit, 
      ...filters 
    });

    return {
      ...result,
      version: 'v2',
      filters,
      metadata: {
        totalPages: Math.ceil(result.total / limit),
        hasNextPage: page < Math.ceil(result.total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get user by ID with enhanced details',
    description: 'Enhanced version with additional user statistics and activity data'
  })
  @ApiResponse({ status: 200, description: 'User details with enhanced information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.getUserByIdEnhanced(id);
    return {
      ...user,
      version: 'v2',
      lastAccessed: new Date().toISOString(),
    };
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create user with enhanced validation',
    description: 'Enhanced version with additional validation and automatic profile setup'
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createUser(@Body() createUserDto: any) {
    const user = await this.usersService.createUserEnhanced(createUserDto);
    return {
      ...user,
      version: 'v2',
      createdAt: new Date().toISOString(),
    };
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update user with enhanced validation',
    description: 'Enhanced version with field-level validation and audit logging'
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') id: string, @Body() updateUserDto: any) {
    const user = await this.usersService.updateUserEnhanced(id, updateUserDto);
    return {
      ...user,
      version: 'v2',
      updatedAt: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete user with enhanced cleanup',
    description: 'Enhanced version with data cleanup and audit trail'
  })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    const result = await this.usersService.deleteUserEnhanced(id);
    return {
      ...result,
      version: 'v2',
      deletedAt: new Date().toISOString(),
    };
  }

  @Get(':id/analytics')
  @ApiOperation({ 
    summary: 'Get user analytics',
    description: 'New endpoint for user analytics and statistics'
  })
  @ApiResponse({ status: 200, description: 'User analytics data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserAnalytics(@Param('id') id: string) {
    const analytics = await this.usersService.getUserAnalytics(id);
    return {
      ...analytics,
      version: 'v2',
      generatedAt: new Date().toISOString(),
    };
  }

  @Get(':id/activity')
  @ApiOperation({ 
    summary: 'Get user activity log',
    description: 'New endpoint for user activity tracking'
  })
  @ApiResponse({ status: 200, description: 'User activity data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserActivity(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const activity = await this.usersService.getUserActivity(id, { page, limit });
    return {
      ...activity,
      version: 'v2',
      requestedAt: new Date().toISOString(),
    };
  }
}
