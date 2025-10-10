import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class StudentsManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudents(options: {
    page: number;
    limit: number;
    search?: string;
    grade?: number;
    isActive?: boolean;
  }) {
    const { page, limit, search, grade, isActive } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      role: UserRole.STUDENT,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getStudentById(id: string) {
    const student = await this.prisma.user.findUnique({
      where: { 
        id,
        role: UserRole.STUDENT,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async createStudent(studentData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    name: string;
    studentProfile?: {
      field?: string;
      goals?: string[];
      learningStyle?: string;
      strengths?: string[];
      weaknesses?: string[];
      interests?: string[];
    };
  }) {
    const { studentProfile, ...userData } = studentData;

    return this.prisma.user.create({
      data: {
        ...userData,
        role: UserRole.STUDENT,
      },
    });
  }

  async updateStudent(id: string, updateData: {
    firstName?: string;
    lastName?: string;
    name?: string;
    isActive?: boolean;
    studentProfile?: {
      field?: string;
      goals?: string[];
      learningStyle?: string;
      strengths?: string[];
      weaknesses?: string[];
      interests?: string[];
    };
  }) {
    const { studentProfile, ...userData } = updateData;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
      },
    });
  }

  async getStudentStats() {
    const [total, active, inactive] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.user.count({ 
        where: { 
          role: UserRole.STUDENT,
          isActive: true,
        },
      }),
      this.prisma.user.count({ 
        where: { 
          role: UserRole.STUDENT,
          isActive: false,
        },
      }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}
