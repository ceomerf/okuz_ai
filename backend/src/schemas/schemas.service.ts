import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SchemasService {
  constructor(private prisma: PrismaService) {}

  async getAllSchemas() {
    const schemas = await (this.prisma as any).entitySchema.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        entityName: true,
        displayName: true,
        description: true,
        apiEndpoint: true,
        icon: true,
        color: true,
        sortOrder: true,
      },
    });

    return {
      success: true,
      data: schemas,
    };
  }

  async getSchemaByEntityName(entityName: string) {
    const schema = await (this.prisma as any).entitySchema.findUnique({
      where: { 
        entityName,
        isActive: true,
      },
    });

    if (!schema) {
      throw new NotFoundException(`Schema for entity '${entityName}' not found`);
    }

    return {
      success: true,
      data: {
        id: schema.id,
        entityName: schema.entityName,
        displayName: schema.displayName,
        description: schema.description,
        apiEndpoint: schema.apiEndpoint,
        icon: schema.icon,
        color: schema.color,
        schema: schema.schema,
        sortOrder: schema.sortOrder,
      },
    };
  }

  async createSchema(schemaData: any) {
    const schema = await (this.prisma as any).entitySchema.create({
      data: schemaData,
    });

    return {
      success: true,
      data: schema,
    };
  }

  async updateSchema(entityName: string, schemaData: any) {
    const schema = await (this.prisma as any).entitySchema.update({
      where: { entityName },
      data: schemaData,
    });

    return {
      success: true,
      data: schema,
    };
  }

  async deleteSchema(entityName: string) {
    await (this.prisma as any).entitySchema.update({
      where: { entityName },
      data: { isActive: false },
    });

    return {
      success: true,
      message: `Schema for entity '${entityName}' has been deactivated`,
    };
  }
}
