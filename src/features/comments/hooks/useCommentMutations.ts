import { useMutation, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '../api/commentsApi'
import type {
  CommentItem,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '../types/comment.types'

function invalidateComments(queryClient: ReturnType<typeof useQueryClient>, projectId: string, taskItemId: string) {
  queryClient.invalidateQueries({ queryKey: ['comments', projectId, taskItemId] })
}

export function useCreateCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation<CommentItem, Error, { projectId: string; taskItemId: string; comment: CreateCommentRequest }>({
    mutationFn: ({ projectId, taskItemId, comment }) =>
      commentsApi.createComment(projectId, taskItemId, comment),
    onSuccess: (newComment, variables) => {
      invalidateComments(queryClient, variables.projectId, variables.taskItemId)
      queryClient.setQueryData<CommentItem[]>(
        ['comments', variables.projectId, variables.taskItemId],
        (currentComments) =>
          currentComments ? [newComment, ...currentComments.filter((comment) => comment.id !== newComment.id)] : [newComment]
      )
    },
  })
}

export function useUpdateCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    CommentItem,
    Error,
    { projectId: string; taskItemId: string; commentId: string; comment: UpdateCommentRequest }
  >({
    mutationFn: ({ projectId, taskItemId, commentId, comment }) =>
      commentsApi.updateComment(projectId, taskItemId, commentId, comment),
    onSuccess: (updatedComment, variables) => {
      invalidateComments(queryClient, variables.projectId, variables.taskItemId)
      queryClient.setQueryData<CommentItem[]>(
        ['comments', variables.projectId, variables.taskItemId],
        (currentComments) =>
          currentComments?.map((comment) => (comment.id === updatedComment.id ? updatedComment : comment)) ?? []
      )
    },
  })
}

export function useDeleteCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { projectId: string; taskItemId: string; commentId: string }>({
    mutationFn: ({ projectId, taskItemId, commentId }) =>
      commentsApi.deleteComment(projectId, taskItemId, commentId),
    onSuccess: (_, variables) => {
      invalidateComments(queryClient, variables.projectId, variables.taskItemId)
      queryClient.setQueryData<CommentItem[]>(
        ['comments', variables.projectId, variables.taskItemId],
        (currentComments) => currentComments?.filter((comment) => comment.id !== variables.commentId) ?? []
      )
    },
  })
}