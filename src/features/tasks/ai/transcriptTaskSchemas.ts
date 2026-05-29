import { z } from 'zod'

export const llmTaskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical'])

export const llmTaskDraftSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(1200).optional(),
  priority: llmTaskPrioritySchema.optional(),
  dueDate: z.string().optional(),
  assigneeHint: z.string().max(180).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const llmTaskExtractionSchema = z.object({
  tasks: z.array(llmTaskDraftSchema).min(1).max(40),
})

export type LlmTaskExtraction = z.infer<typeof llmTaskExtractionSchema>
