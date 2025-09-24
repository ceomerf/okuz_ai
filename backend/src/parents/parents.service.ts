import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return { message: 'Parents service implementation' };
  }

  async findOne(id: string) {
    return { message: 'Find parent implementation' };
  }

  async create(createData: any) {
    return { message: 'Create parent implementation' };
  }

  async update(id: string, updateData: any) {
    return { message: 'Update parent implementation' };
  }

  async remove(id: string) {
    return { message: 'Remove parent implementation' };
  }
}
