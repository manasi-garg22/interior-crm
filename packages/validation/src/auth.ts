import { z } from 'zod'
import { roleSchema } from './enums'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
})
export type LoginValues = z.infer<typeof loginSchema>

/**
 * Password policy. Length does far more work than character-class rules, so
 * the floor is 12 characters rather than a thicket of symbol requirements.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(200, 'That password is too long')

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address').toLowerCase(),
})

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(120),
  email: z.email('Enter a valid email address').toLowerCase(),
  phone: z.string().trim().max(30).optional(),
  role: roleSchema,
  password: passwordSchema,
  managerId: z.string().cuid().optional(),
})

export const updateUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
  managerId: z.string().cuid().nullable().optional(),
})
