import { describe, expect, it } from 'vitest'
import { commentSchema } from '../features/comments/schemas/commentSchema'

describe('comments', () => {
  describe('commentSchema', () => {
    it('validates valid comment data', () => {
      const validData = {
        content: 'This task is in progress.',
      }

      const result = commentSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('requires content', () => {
      const invalidData = {
        content: '   ',
      }

      const result = commentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('content')
    })
  })
})