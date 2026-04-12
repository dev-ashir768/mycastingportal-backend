// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateRoleDto {
  name: string;
  description: string;
  isActive?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface RoleListQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface RoleResponse {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDetailResponse extends RoleResponse {
  createdBy: string;
  updatedBy: string | null;
}
