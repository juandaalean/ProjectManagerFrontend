import { z } from 'zod'

export const commentSchema = z.object({
	content: z
		.string()
		.trim()
		.min(1, 'Comment is required')
		.max(1000, 'Comment must be less than 1000 characters'),
})

export type CommentFormData = z.infer<typeof commentSchema>
