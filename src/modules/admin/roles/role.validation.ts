import Joi from 'joi';

export const createRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Role name must be at least 2 characters',
    'string.max': 'Role name must not exceed 50 characters',
  }),
  description: Joi.string().trim().min(5).max(500).required().messages({
    'string.min': 'Description must be at least 5 characters',
  }),
  isActive: Joi.boolean().default(true),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  description: Joi.string().trim().min(5).max(500).optional(),
  isActive: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' });

export const roleListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().optional(),
  isActive: Joi.boolean().optional(),
});
