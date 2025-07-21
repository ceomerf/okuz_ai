import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ParentsService } from './parents.service';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Get()
  findAll() {
    return { message: 'Parents endpoint working', data: [] };
  }

  @Post()
  create(@Body() createParentDto: any) {
    return { message: 'Parent created', data: createParentDto };
  }
}
