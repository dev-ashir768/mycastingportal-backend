import Joi from 'joi';

const strictPasswordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'string.min': 'Password must be at least 8 characters long',
  });

export const adminLoginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().required(),
});

export const adminRefreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

export const adminChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: strictPasswordSchema,
});
