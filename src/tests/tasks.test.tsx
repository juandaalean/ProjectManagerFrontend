import { describe, it, expect } from 'vitest';
import { createTaskSchema } from '../features/tasks/schemas/taskSchema';

describe('tasks', () => {
  describe('createTaskSchema', () => {
    it('validates valid task data', () => {
      const validData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'Medium' as const,
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = createTaskSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('requires title', () => {
      const invalidData = {
        description: 'Test description',
        priority: 'Medium' as const,
        assignedUserId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = createTaskSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('title');
    });
  });
});