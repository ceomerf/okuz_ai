import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return { message: 'Students service implementation' };
  }

  async findOne(id: string) {
    return { message: 'Find student implementation' };
  }

  async create(createData: any) {
    return { message: 'Create student implementation' };
  }

  async update(id: string, updateData: any) {
    return { message: 'Update student implementation' };
  }

  async remove(id: string) {
    return { message: 'Remove student implementation' };
  }
}
