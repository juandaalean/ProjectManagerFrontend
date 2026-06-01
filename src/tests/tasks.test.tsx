import { describe, it, expect } from 'vitest'
import {
  createTaskSchema,
  createTaskSchemaForProject,
  updateTaskSchema,
  updateTaskSchemaForProject,
} from '../features/tasks/schemas/taskSchema'

describe('tasks', () => {
  describe('createTaskSchema', () => {
    it('validates valid task data', () => {
      const validData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'Medium' as const,
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = createTaskSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('requires title', () => {
      const invalidData = {
        description: 'Test description',
        priority: 'Medium' as const,
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = createTaskSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('title')
    })

    it('allows an empty completion date without project bounds', () => {
      const result = createTaskSchema.safeParse({
        title: 'Test Task',
        description: 'Test description',
        priority: 'Medium' as const,
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
        completedAt: '',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('createTaskSchemaForProject', () => {
    it('rejects completion dates outside the project range', () => {
      const schema = createTaskSchemaForProject({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      const result = schema.safeParse({
        title: 'Test Task',
        description: 'Test description',
        priority: 'Medium' as const,
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
        completedAt: '2025-01-01',
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('completedAt')
    })

    it('accepts completion dates inside the project range', () => {
      const schema = createTaskSchemaForProject({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      const result = schema.safeParse({
        title: 'Test Task',
        description: 'Test description',
        priority: 'Medium' as const,
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
        completedAt: '2024-06-01',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('updateTaskSchema', () => {
    it('allows assigning a task to another project member', () => {
      const validData = {
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = updateTaskSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })
  })

  describe('updateTaskSchemaForProject', () => {
    it('rejects invalid completion dates when updating a task', () => {
      const schema = updateTaskSchemaForProject({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })

      const result = schema.safeParse({
        completedAt: '2025-01-01',
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('completedAt')
    })
  })
})
