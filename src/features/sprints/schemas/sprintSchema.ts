import { z } from 'zod'

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

type SprintDateBounds = {
  startDate?: string | null
  endDate?: string | null
}

const baseCreateSprintSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be less than 120 characters'),
  goal: z
    .string()
    .max(500, 'Goal must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  startDate: z
    .string()
    .regex(dateOnlyRegex, 'Start date is required')
    .min(1, 'Start date is required'),
  endDate: z
    .string()
    .regex(dateOnlyRegex, 'End date is required')
    .min(1, 'End date is required'),
})

const baseUpdateSprintSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(120, 'Name must be less than 120 characters')
      .optional(),
    goal: z
      .string()
      .max(500, 'Goal must be less than 500 characters')
      .optional()
      .nullable()
      .or(z.literal('')),
    startDate: z
      .string()
      .regex(dateOnlyRegex, 'Invalid start date')
      .optional()
      .or(z.literal('')),
    endDate: z
      .string()
      .regex(dateOnlyRegex, 'Invalid end date')
      .optional()
      .or(z.literal('')),
    state: z.enum(['Planned', 'Active', 'Completed', 'Canceled']).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.goal !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.state !== undefined,
    { message: 'At least one field must be provided for update' },
  )

const normalizeDateOnly = (value: string) => value.split('T')[0]

function addSprintDateBounds<T extends { startDate?: string | null; endDate?: string | null }>(
  schema: z.ZodType<T>,
  bounds: SprintDateBounds = {},
) {
  return schema.superRefine((data, context) => {
    if (data.startDate && data.endDate) {
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'End date must be after start date',
        })
      }
    }

    if (data.startDate && bounds.startDate) {
      const startDate = normalizeDateOnly(data.startDate)
      const projectStartDate = normalizeDateOnly(bounds.startDate)
      if (startDate < projectStartDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'Sprint start must be on or after the project start date',
        })
      }
    }

    if (data.endDate && bounds.endDate) {
      const endDate = normalizeDateOnly(data.endDate)
      const projectEndDate = normalizeDateOnly(bounds.endDate)
      if (endDate > projectEndDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Sprint end must be on or before the project end date',
        })
      }
    }
  })
}

export const createSprintSchema = baseCreateSprintSchema

export const updateSprintSchema = baseUpdateSprintSchema

export function createSprintSchemaForProject(bounds?: SprintDateBounds) {
  return addSprintDateBounds(baseCreateSprintSchema, bounds)
}

export function updateSprintSchemaForProject(bounds?: SprintDateBounds) {
  return addSprintDateBounds(baseUpdateSprintSchema, bounds)
}

export type CreateSprintFormData = z.infer<typeof createSprintSchema>
export type UpdateSprintFormData = z.infer<typeof updateSprintSchema>
