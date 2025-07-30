import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PlanningService } from './planning.service';

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get()
  findAll() {
    return { message: 'Planning endpoint working', data: [] };
  }

  @Post()
  create(@Body() createPlanDto: any) {
    return { message: 'Plan created', data: createPlanDto };
  }
}
