import { Router } from 'express';
import {
  createRole,
  listRoles,
  getRole,
  updateRole,
  deleteRole,
  toggleRoleStatus,
} from './role.controller';
import { authenticateAdmin } from '../../../middleware/admin-auth.middleware';
import { validate } from '../../../middleware/validate.middleware';
import {
  createRoleSchema,
  updateRoleSchema,
  roleListQuerySchema,
} from './role.validation';

const router = Router();

// All role management routes require admin authentication
router.get('/', validate(roleListQuerySchema, 'query'), listRoles);

router.use(authenticateAdmin);
router.post('/', validate(createRoleSchema), createRole);
router.get('/:id', getRole);
router.patch('/:id', validate(updateRoleSchema), updateRole);
router.delete('/:id', deleteRole);
router.patch('/:id/toggle-status', toggleRoleStatus);

export default router;
