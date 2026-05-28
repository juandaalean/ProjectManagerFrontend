import { z } from 'zod'

export const projectRoleOptions = [
  { value: 0, label: 'Admin' },
  { value: 1, label: 'Coordinator' },
  { value: 2, label: 'User' },
] as const

export const projectMemberSchema = z.object({
  userEmail: z
    .string()
    .email('Enter a valid email address')
    .max(150, 'Email must be less than 150 characters'),
  role: z.coerce
    .number()
    .int('Role is required')
    .refine((value) => [0, 1, 2].includes(value), {
      message: 'Select a valid role',
    }),
})

export const projectMemberRoleSchema = z.object({
  role: z.coerce
    .number()
    .int('Role is required')
    .refine((value) => [0, 1, 2].includes(value), {
      message: 'Select a valid role',
    }),
})

export type ProjectMemberFormData = z.infer<typeof projectMemberSchema>
export type ProjectMemberRoleFormData = z.infer<typeof projectMemberRoleSchema>
