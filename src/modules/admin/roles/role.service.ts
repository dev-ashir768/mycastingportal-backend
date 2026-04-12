import { prisma } from '../../../config/database';
import { ApiError } from '../../../utils/ApiError';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleListQueryDto,
  RoleResponse,
  RoleDetailResponse,
} from './role.types';

class RoleService {
  private async formatRole(role: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string | null;
    _count?: { users: number };
  }): Promise<RoleDetailResponse> {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      userCount: role._count?.users ?? 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      createdBy: role.createdBy,
      updatedBy: role.updatedBy,
    };
  }

  async create(adminId: string, dto: CreateRoleDto): Promise<RoleDetailResponse> {
    const existing = await prisma.role.findFirst({
      where: { name: { equals: dto.name }, deletedAt: null },
    });
    if (existing) throw ApiError.conflict(`Role "${dto.name}" already exists`);

    const role = await prisma.role.create({
      data: {
        name: dto.name.trim(),
        description: dto.description.trim(),
        isActive: dto.isActive ?? true,
        createdBy: adminId,
      },
      include: { _count: { select: { users: true } } },
    });

    return this.formatRole(role);
  }

  async findAll(
    query: RoleListQueryDto,
  ): Promise<{ data: RoleResponse[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    const [roles, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { users: true } } },
      }),
      prisma.role.count({ where }),
    ]);

    const data = await Promise.all(roles.map((r) => this.formatRole(r)));
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<RoleDetailResponse> {
    const role = await prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw ApiError.notFound('Role not found');
    return this.formatRole(role);
  }

  async update(id: string, adminId: string, dto: UpdateRoleDto): Promise<RoleDetailResponse> {
    const role = await prisma.role.findFirst({ where: { id, deletedAt: null } });
    if (!role) throw ApiError.notFound('Role not found');

    if (dto.name && dto.name !== role.name) {
      const nameConflict = await prisma.role.findFirst({
        where: { name: { equals: dto.name }, deletedAt: null, id: { not: id } },
      });
      if (nameConflict) throw ApiError.conflict(`Role "${dto.name}" already exists`);
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description && { description: dto.description.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedBy: adminId,
      },
      include: { _count: { select: { users: true } } },
    });

    return this.formatRole(updated);
  }

  async softDelete(id: string, adminId: string): Promise<void> {
    const role = await prisma.role.findFirst({ where: { id, deletedAt: null } });
    if (!role) throw ApiError.notFound('Role not found');

    const userCount = await prisma.user.count({
      where: { roleId: id, deletedAt: null },
    });
    if (userCount > 0) {
      throw ApiError.conflict(
        `Cannot delete role "${role.name}" — it has ${userCount} active user(s) assigned. Reassign them first.`,
      );
    }

    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, deletedBy: adminId },
    });
  }

  async toggleStatus(id: string, adminId: string): Promise<RoleDetailResponse> {
    const role = await prisma.role.findFirst({ where: { id, deletedAt: null } });
    if (!role) throw ApiError.notFound('Role not found');

    const updated = await prisma.role.update({
      where: { id },
      data: { isActive: !role.isActive, updatedBy: adminId },
      include: { _count: { select: { users: true } } },
    });

    return this.formatRole(updated);
  }

  // ── Public listing (for user signup form — active roles only) ────────────────
  async findActiveRoles(): Promise<Pick<RoleResponse, 'id' | 'name' | 'description'>[]> {
    const roles = await prisma.role.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    return roles;
  }
}

export const roleService = new RoleService();
