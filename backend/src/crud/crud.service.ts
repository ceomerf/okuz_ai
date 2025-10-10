import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { SchemasService } from '../schemas/schemas.service';

@Injectable()
export class CrudService {
  constructor(
    private prisma: PrismaService,
    private schemasService: SchemasService,
  ) {}

  async getEntityData(entityName: string, page: number = 1, limit: number = 10, search?: string) {
    // Önce schema'yı al
    const schemaResponse = await this.schemasService.getSchemaByEntityName(entityName);
    const schema = schemaResponse.data;

    // Prisma model adını belirle (entityName'i capitalize et)
    const modelName = this.capitalizeFirstLetter(entityName);
    
    // Prisma client'ından model'e erişim
    const model = (this.prisma as any)[modelName];
    
    if (!model) {
      throw new NotFoundException(`Model '${modelName}' not found`);
    }

    // Arama filtresi
    const whereClause = search ? this.buildSearchClause(schema.schema, search) : {};

    // Toplam kayıt sayısı
    const total = await model.count({ where: whereClause });

    // Sayfalama ile veri çekme
    const skip = (page - 1) * limit;
    const data = await model.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: {
        items: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getEntityById(entityName: string, id: string) {
    const modelName = this.capitalizeFirstLetter(entityName);
    const model = (this.prisma as any)[modelName];
    
    if (!model) {
      throw new NotFoundException(`Model '${modelName}' not found`);
    }

    const data = await model.findUnique({
      where: { id },
    });

    if (!data) {
      throw new NotFoundException(`Record with id '${id}' not found`);
    }

    return {
      success: true,
      data,
    };
  }

  async createEntity(entityName: string, data: any) {
    const modelName = this.capitalizeFirstLetter(entityName);
    const model = (this.prisma as any)[modelName];
    
    if (!model) {
      throw new NotFoundException(`Model '${modelName}' not found`);
    }

    // Veri validasyonu
    await this.validateEntityData(entityName, data);

    const created = await model.create({
      data,
    });

    return {
      success: true,
      data: created,
    };
  }

  async updateEntity(entityName: string, id: string, data: any) {
    const modelName = this.capitalizeFirstLetter(entityName);
    const model = (this.prisma as any)[modelName];
    
    if (!model) {
      throw new NotFoundException(`Model '${modelName}' not found`);
    }

    // Veri validasyonu
    await this.validateEntityData(entityName, data);

    const updated = await model.update({
      where: { id },
      data,
    });

    return {
      success: true,
      data: updated,
    };
  }

  async deleteEntity(entityName: string, id: string) {
    const modelName = this.capitalizeFirstLetter(entityName);
    const model = (this.prisma as any)[modelName];
    
    if (!model) {
      throw new NotFoundException(`Model '${modelName}' not found`);
    }

    await model.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Record with id '${id}' has been deleted`,
    };
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  private buildSearchClause(schema: any, search: string): any {
    const searchFields = schema.fields?.filter((field: any) => 
      field.showInTable && (field.type === 'string' || field.type === 'text')
    ) || [];

    if (searchFields.length === 0) {
      return {};
    }

    return {
      OR: searchFields.map((field: any) => ({
        [field.name]: {
          contains: search,
          mode: 'insensitive',
        },
      })),
    };
  }

  private async validateEntityData(entityName: string, data: any): Promise<void> {
    const schemaResponse = await this.schemasService.getSchemaByEntityName(entityName);
    const schema = schemaResponse.data.schema;

    // Required field kontrolü
    const requiredFields = schema.fields?.filter((field: any) => field.required) || [];
    
    for (const field of requiredFields) {
      if (!data[field.name] || (typeof data[field.name] === 'string' && data[field.name].trim() === '')) {
        throw new BadRequestException(`${field.label} alanı gereklidir`);
      }
    }

    // Type validation
    for (const field of schema.fields || []) {
      if (data[field.name] !== undefined) {
        await this.validateFieldType(field, data[field.name]);
      }
    }
  }

  private async validateFieldType(field: any, value: any): Promise<void> {
    switch (field.type) {
      case 'string':
      case 'text':
        if (typeof value !== 'string') {
          throw new BadRequestException(`${field.label} alanı string olmalıdır`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' && !Number.isInteger(Number(value))) {
          throw new BadRequestException(`${field.label} alanı sayı olmalıdır`);
        }
        break;
      case 'date':
        if (value && isNaN(Date.parse(value))) {
          throw new BadRequestException(`${field.label} alanı geçerli bir tarih olmalıdır`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`${field.label} alanı boolean olmalıdır`);
        }
        break;
    }
  }
}
