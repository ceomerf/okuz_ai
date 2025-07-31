import { Injectable } from '@nestjs/common';
import { PrismaService } from "../common/prisma/prisma.service"';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return { message: 'Users service implementation' };
  }

  async findOne(id: string) {
    return { message: 'Find user implementation' };
  }

  async update(id: string, updateData: any) {
    return { message: 'Update user implementation' };
  }

  async remove(id: string) {
    return { message: 'Remove user implementation' };
  }
}
