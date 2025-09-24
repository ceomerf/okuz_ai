import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll() {
    return { message: 'Students endpoint working', data: [] };
  }

  @Post()
  create(@Body() createStudentDto: any) {
    return { message: 'Student created', data: createStudentDto };
  }
}
