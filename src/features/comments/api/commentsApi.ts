import { httpClient } from '../../../shared/api/httpClient'
import type {
	CommentItem,
	CreateCommentRequest,
	UpdateCommentRequest,
} from '../types/comment.types'

type ApiComment = {
	commentId: string
	taskId: string
	userId: string
	userName: string
	content: string
	createAt: string
}

const mapComment = (comment: ApiComment): CommentItem => ({
	id: comment.commentId,
	taskId: comment.taskId,
	userId: comment.userId,
	userName: comment.userName,
	content: comment.content,
	createdAt: comment.createAt,
})

const mapCommentRequest = (comment: CreateCommentRequest | UpdateCommentRequest) => ({
	content: comment.content.trim(),
})

export const commentsApi = {
	getComments: async (projectId: string, taskItemId: string): Promise<CommentItem[]> => {
		const response = await httpClient.get<ApiComment[]>(
			`/projects/${projectId}/tasks/${taskItemId}/comments`
		)

		return response.data.map(mapComment)
	},

	createComment: async (
		projectId: string,
		taskItemId: string,
		comment: CreateCommentRequest
	): Promise<CommentItem> => {
		const response = await httpClient.post<ApiComment>(
			`/projects/${projectId}/tasks/${taskItemId}/comments`,
			mapCommentRequest(comment)
		)

		return mapComment(response.data)
	},

	updateComment: async (
		projectId: string,
		taskItemId: string,
		commentId: string,
		comment: UpdateCommentRequest
	): Promise<CommentItem> => {
		const response = await httpClient.put<ApiComment>(
			`/projects/${projectId}/tasks/${taskItemId}/comments/${commentId}`,
			mapCommentRequest(comment)
		)

		return mapComment(response.data)
	},

	deleteComment: async (projectId: string, taskItemId: string, commentId: string): Promise<void> => {
		await httpClient.delete(`/projects/${projectId}/tasks/${taskItemId}/comments/${commentId}`)
	},
}
