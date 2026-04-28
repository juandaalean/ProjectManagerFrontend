import { describe, expect, it } from 'vitest'
import { projectSchema } from '../features/projects/schemas/projectSchema'

describe('projects', () => {
  describe('projectSchema', () => {
    it('validates valid project data', () => {
      const validData = {
        name: 'Test Project',
        description: 'A test project',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const result = projectSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const invalidData = {
        description: 'A test project',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }

      const result = projectSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('name')
    })

    it('validates end date after start date', () => {
      const invalidData = {
        name: 'Test Project',
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      }

      const result = projectSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('endDate')
    })
  })
})
