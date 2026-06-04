import { z } from 'zod'

type TaskDateBounds = {
  startDate?: string | null
  endDate?: string | null
}

const optionalDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(''))

const baseCreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(8000, 'Description must be less than 8000 characters').optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  assignedUserId: z.string().uuid('Invalid assigned user ID'),
  startAt: optionalDateString,
  completedAt: optionalDateString,
  sprintId: z.string().uuid('Invalid sprint ID').optional().or(z.literal('')),
})

const baseUpdateTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be less than 100 characters')
      .optional(),
    description: z.string().max(8000, 'Description must be less than 8000 characters').optional(),
    state: z.enum(['Active', 'Finished', 'Canceled']).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    assignedUserId: z.string().uuid('Invalid assigned user ID').optional(),
    startAt: optionalDateString,
    completedAt: optionalDateString,
    sprintId: z.string().uuid('Invalid sprint ID').optional().or(z.literal('')),
    clearStartAt: z.boolean().optional(),
    clearCompletedAt: z.boolean().optional(),
    clearSprint: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided for update')

const normalizeDateOnly = (value: string) => value.split('T')[0]

function addTaskDateBounds<
  T extends { startAt?: string | null | undefined; completedAt?: string | null | undefined },
>(schema: z.ZodType<T>, bounds: TaskDateBounds = {}) {
  return schema.superRefine((data, context) => {
    if (!bounds.startDate || !bounds.endDate) {
      return
    }

    const projectStartDate = normalizeDateOnly(bounds.startDate)
    const projectEndDate = normalizeDateOnly(bounds.endDate)

    const validateDateField = (
      value: string | null | undefined,
      path: ('startAt' | 'completedAt')[],
    ) => {
      if (!value) {
        return
      }

      const taskDate = normalizeDateOnly(value)
      if (taskDate < projectStartDate || taskDate > projectEndDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: 'Task date must stay within the project date range',
        })
      }
    }

    validateDateField(data.startAt, ['startAt'])
    validateDateField(data.completedAt, ['completedAt'])

    if (data.startAt && data.completedAt) {
      const start = normalizeDateOnly(data.startAt)
      const end = normalizeDateOnly(data.completedAt)
      if (start > end) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startAt'],
          message: 'Start date cannot be after the completion date',
        })
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['completedAt'],
          message: 'Completion date cannot be before the start date',
        })
      }
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
