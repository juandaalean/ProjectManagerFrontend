import { z } from 'zod'

type TaskDateBounds = {
  startDate?: string | null
  endDate?: string | null
}

const baseCreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  assignedUserId: z.string().uuid('Invalid assigned user ID'),
  completedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
})

const baseUpdateTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be less than 100 characters')
      .optional(),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    state: z.enum(['Active', 'Finished', 'Canceled']).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    assignedUserId: z.string().uuid('Invalid assigned user ID').optional(),
    completedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided for update')

const normalizeDateOnly = (value: string) => value.split('T')[0]

function addTaskDateBounds<T extends { completedAt?: string | null | undefined }>(
  schema: z.ZodType<T>,
  bounds: TaskDateBounds = {},
) {
  return schema.superRefine((data, context) => {
    if (!data.completedAt || !bounds.startDate || !bounds.endDate) {
      return
    }

    const taskDate = normalizeDateOnly(data.completedAt)
    const projectStartDate = normalizeDateOnly(bounds.startDate)
    const projectEndDate = normalizeDateOnly(bounds.endDate)

    if (taskDate < projectStartDate || taskDate > projectEndDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['completedAt'],
        message: 'Task date must stay within the project date range',
      })
    }
  })
}

export const createTaskSchema = baseCreateTaskSchema

export const updateTaskSchema = baseUpdateTaskSchema

export function createTaskSchemaForProject(bounds?: TaskDateBounds) {
  return addTaskDateBounds(baseCreateTaskSchema, bounds)
}

export function updateTaskSchemaForProject(bounds?: TaskDateBounds) {
  return addTaskDateBounds(baseUpdateTaskSchema, bounds)
}

export type CreateTaskFormData = z.infer<typeof createTaskSchema>
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>
