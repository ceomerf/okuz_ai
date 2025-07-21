import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return { message: 'Users endpoint working', data: [] };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { message: `User ${id} details`, data: { id } };
  }

  @Post()
  create(@Body() createUserDto: any) {
    return { message: 'User created', data: createUserDto };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return { message: `User ${id} updated`, data: updateUserDto };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { message: `User ${id} deleted` };
  }
}
