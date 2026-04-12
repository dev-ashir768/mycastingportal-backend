import { Request, Response } from 'express';
import { roleService } from './role.service';
import { ApiResponse } from '../../../utils/ApiResponse';
import { asyncHandler } from '../../../utils/asyncHandler';
import { CreateRoleDto, UpdateRoleDto, RoleListQueryDto } from './role.types';

// POST /api/v1/admin/roles
export const createRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const role = await roleService.create(req.admin!.id, req.body as CreateRoleDto);
  ApiResponse.created(res, 'Role created successfully', { role });
});

// GET /api/v1/admin/roles
export const listRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as RoleListQueryDto;
  const { data, total, page, limit } = await roleService.findAll(query);
  ApiResponse.paginated(res, 'Roles retrieved', data, page, limit, total);
});

// GET /api/v1/admin/roles/:id
export const getRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const role = await roleService.findById(req.params.id);
  ApiResponse.ok(res, 'Role retrieved', { role });
});

// PATCH /api/v1/admin/roles/:id
export const updateRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const role = await roleService.update(req.params.id, req.admin!.id, req.body as UpdateRoleDto);
  ApiResponse.ok(res, 'Role updated successfully', { role });
});

// DELETE /api/v1/admin/roles/:id
export const deleteRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await roleService.softDelete(req.params.id, req.admin!.id);
  ApiResponse.ok(res, 'Role deleted successfully');
});

// PATCH /api/v1/admin/roles/:id/toggle-status
export const toggleRoleStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const role = await roleService.toggleStatus(req.params.id, req.admin!.id);
  ApiResponse.ok(res, `Role ${role.isActive ? 'activated' : 'deactivated'} successfully`, { role });
});
