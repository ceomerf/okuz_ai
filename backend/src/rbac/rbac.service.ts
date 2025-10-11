import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoles() {
    const roles = await (this.prisma as any).role.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, data: roles };
  }

  async createRole(name: string, description?: string) {
    if (!name?.trim()) throw new BadRequestException('Rol adı zorunludur');
    const role = await (this.prisma as any).role.create({
      data: { name, description },
    });
    return { success: true, data: role };
  }

  async getPermissions() {
    const permissions = await (this.prisma as any).permission.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, data: permissions };
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    const role = await (this.prisma as any).role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol bulunamadı');
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      throw new BadRequestException('En az bir permissionId girilmelidir');
    }

    // Mevcut bağları getir
    const existing = await (this.prisma as any).rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((e: any) => e.permissionId));

    // Eklemesi gerekenler
    const toCreate = permissionIds.filter((id) => !existingIds.has(id));
    await (this.prisma as any).$transaction(
      toCreate.map((pid) =>
        (this.prisma as any).rolePermission.create({ data: { roleId, permissionId: pid } }),
      ),
    );

    return { success: true };
  }

  async updateUserRoles(userId: string, roleIds: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (!Array.isArray(roleIds)) throw new BadRequestException('roleIds geçersiz');

    // Tüm mevcut userRole kayıtlarını sil ve yeniden oluştur
    await (this.prisma as any).userRoleMap.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await (this.prisma as any).$transaction(
        roleIds.map((rid) => (this.prisma as any).userRoleMap.create({ data: { userId, roleId: rid } })),
      );
      // Ana rolü ilk role göre güncelle
      // Ana rolü ilk role göre güncelle (yoksa ADMIN kalmasın)
      await this.prisma.user.update({ where: { id: userId }, data: { role: (roleIds[0] as any) || 'STUDENT' } });
    }

    return { success: true };
  }

  async simulatePermission(userId: string, permission: string) {
    const userRoles = await (this.prisma as any).userRoleMap.findMany({ where: { userId } });
    const roleIds = userRoles.map((ur: any) => ur.roleId);
    if (roleIds.length === 0) return { success: true, hasPermission: false };

    const matches = await (this.prisma as any).rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
        permission: { name: permission },
      },
      include: { permission: true },
    });

    const hasPermission = matches.some((m: any) => m.permission?.name === permission);
    return { success: true, hasPermission };
  }

  async getUserRoles(userId: string) {
    const userRoles = await (this.prisma as any).userRoleMap.findMany({ where: { userId }, include: { role: true } });
    return { success: true, data: userRoles.map((ur: any) => ur.role) };
  }

  async simulate(body: { userId?: string; permission?: string; roleIds?: string[] }) {
    if (body.roleIds && body.roleIds.length > 0 && body.permission) {
      const matches = await (this.prisma as any).rolePermission.findMany({
        where: { roleId: { in: body.roleIds } },
        include: { permission: true },
      });
      const hasPermission = matches.some((m: any) => m.permission?.name === body.permission);
      return { success: true, hasPermission };
    }
    if (body.userId && body.permission) {
      return this.simulatePermission(body.userId, body.permission);
    }
    return { success: true, hasPermission: false };
  }

  async grantTemporaryAccess(userId: string, roleId: string, durationInHours: number) {
    if (!durationInHours || durationInHours <= 0) {
      throw new BadRequestException('Süre saat olarak pozitif olmalıdır');
    }
    const expiresAt = new Date(Date.now() + durationInHours * 60 * 60 * 1000);

    await (this.prisma as any).temporaryUserRole.create({
      data: { userId, roleId, expiresAt },
    });

    return { success: true, expiresAt };
  }
}


