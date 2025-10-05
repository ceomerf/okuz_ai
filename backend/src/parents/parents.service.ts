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

  // Eksik methodları ekleyelim
  async createParent(data: any) {
    try {
      const parent = await this.prisma.parent.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          userId: data.userId
        }
      });
      return { message: 'Parent created successfully', parent };
    } catch (error) {
      throw new Error('Failed to create parent');
    }
  }

  async getParent(id: string) {
    try {
      const parent = await this.prisma.parent.findUnique({
        where: { id }
      });
      return { message: 'Parent found', parent };
    } catch (error) {
      throw new Error('Failed to get parent');
    }
  }

  async getChildren(parentId: string) {
    try {
      const children = await this.prisma.student.findMany({
        where: { parentId }
      });
      return { message: 'Children found', children };
    } catch (error) {
      throw new Error('Failed to get children');
    }
  }

  async getChildProgress(childId: string) {
    try {
      const progress = await this.prisma.student.findUnique({
        where: { id: childId },
        include: {
          plans: true,
          sessions: true
        }
      });
      return { 
        message: 'Child progress found', 
        progress
      };
    } catch (error) {
      throw new Error('Failed to get child progress');
    }
  }

  async updateParent(id: string, data: any) {
    try {
      const parent = await this.prisma.parent.update({
        where: { id },
        data
      });
      return { message: 'Parent updated successfully', parent };
    } catch (error) {
      throw new Error('Failed to update parent');
    }
  }

  async deleteParent(id: string) {
    try {
      await this.prisma.parent.delete({
        where: { id }
      });
      return { message: 'Parent deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete parent');
    }
  }

  async getParentDashboard(parentId: string) {
    try {
      const children = await this.getChildren(parentId);
      
      const dashboard = {
        totalChildren: 0,
        activePlans: 0,
        completedSessions: 0,
        upcomingSessions: 0
      };
      return { 
        message: 'Dashboard data found', 
        dashboard,
        children: children.children || [],
        progress: dashboard
      };
    } catch (error) {
      throw new Error('Failed to get parent dashboard');
    }
  }
}
