import { z } from 'zod'

export const llmTaskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical'])

export const supportedLanguageSchema = z.enum(['es', 'en'])

export const llmTaskMilestoneSchema = z.object({
  label: z.string().min(1).max(120),
  date: z.string().min(1).max(40),
})

export const llmTaskDraftSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(8000).optional(),
  priority: llmTaskPrioritySchema.optional(),
  dueDate: z.string().optional(),
  assigneeHint: z.string().max(180).optional(),
  milestones: z.array(llmTaskMilestoneSchema).max(10).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const llmTaskExtractionSchema = z.object({
  tasks: z.array(llmTaskDraftSchema).min(1).max(40),
})

export type LlmTaskExtraction = z.infer<typeof llmTaskExtractionSchema>

export const llmItemKindSchema = z.enum([
  'requirement',
  'spec',
  'decision',
  'date',
  'start_date',
  'assignee',
  'context',
  'block_start',
  'priority',
])

export const llmExtractedItemSchema = z.object({
  kind: llmItemKindSchema,
  text: z.string().min(1).max(500),
  assigneeHint: z.string().max(180).optional(),
  date: z.string().max(40).optional(),
  startDate: z.string().max(40).optional(),
  priority: llmTaskPrioritySchema.optional(),
  taskTitle: z.string().max(180).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const llmItemExtractionSchema = z.object({
  items: z.array(llmExtractedItemSchema).min(0).max(200),
  taskTitle: z.string().max(180).optional(),
  taskAssigneeHint: z.string().max(180).optional(),
  taskStartDate: z.string().max(40).optional(),
  taskDueDate: z.string().max(40).optional(),
  taskPriority: llmTaskPrioritySchema.optional(),
  language: supportedLanguageSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export type LlmItemExtraction = z.infer<typeof llmItemExtractionSchema>
export type LlmExtractedItem = z.infer<typeof llmExtractedItemSchema>
export type LlmItemKind = z.infer<typeof llmItemKindSchema>
export type SupportedLanguage = z.infer<typeof supportedLanguageSchema>
