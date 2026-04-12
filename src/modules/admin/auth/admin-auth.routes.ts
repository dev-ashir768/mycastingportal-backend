import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  adminLogoutAll,
  adminRefreshTokens,
  adminGetMe,
  adminChangePassword,
} from './admin-auth.controller';
import { authenticateAdmin } from '../../../middleware/admin-auth.middleware';
import { validate } from '../../../middleware/validate.middleware';
import { authRateLimiter } from '../../../middleware/rateLimiter.middleware';
import {
  adminLoginSchema,
  adminRefreshTokenSchema,
  adminChangePasswordSchema,
} from './admin-auth.validation';

const router = Router();

// Public
router.post('/login', authRateLimiter, validate(adminLoginSchema), adminLogin);
router.post('/refresh', validate(adminRefreshTokenSchema), adminRefreshTokens);

// Protected (admin only)
router.use(authenticateAdmin);
router.get('/me', adminGetMe);
router.post('/logout', adminLogout);
router.post('/logout-all', adminLogoutAll);
router.patch('/change-password', validate(adminChangePasswordSchema), adminChangePassword);

export default router;
