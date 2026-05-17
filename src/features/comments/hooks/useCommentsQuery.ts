import { useQuery } from '@tanstack/react-query'
import { commentsApi } from '../api/commentsApi'
import type { CommentItem } from '../types/comment.types'

export function useCommentsQuery(projectId?: string, taskItemId?: string) {
  return useQuery<CommentItem[]>({
    queryKey: ['comments', projectId, taskItemId],
    queryFn: () => commentsApi.getComments(projectId!, taskItemId!),
    enabled: !!projectId && !!taskItemId,
  })
}
