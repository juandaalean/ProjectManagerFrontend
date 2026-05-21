import { useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { formatDate } from '../../../shared/utils/date'
import { useAuth } from '../../auth/context/AuthContext'
import { useDeleteCommentMutation } from '../hooks/useCommentMutations'
import { useCommentsQuery } from '../hooks/useCommentsQuery'
import type { CommentItem } from '../types/comment.types'
import { CommentComposer } from './CommentComposer'

interface CommentsListProps {
  projectId: string
  taskItemId: string
}

export function CommentsList({ projectId, taskItemId }: CommentsListProps) {
  const { user } = useAuth()
  const { data: comments, isLoading, error } = useCommentsQuery(projectId, taskItemId)
  const deleteMutation = useDeleteCommentMutation()
  const [editingComment, setEditingComment] = useState<CommentItem | null>(null)

  const handleDelete = (comment: CommentItem) => {
    if (!window.confirm('Delete this comment?')) {
      return
    }

    deleteMutation.mutate({
      projectId,
      taskItemId,
      commentId: comment.id,
    })
  }

  if (isLoading) {
    return <div className="py-4 text-sm text-base-content/60">Loading comments...</div>
  }

  if (error) {
    return <ErrorState message={error.message} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Comments</h2>
          <p className="text-sm text-base-content/60">Keep project context attached to the task.</p>
        </div>
        <span className="badge badge-outline">{comments?.length ?? 0}</span>
      </div>

      <CommentComposer
        projectId={projectId}
        taskItemId={taskItemId}
        comment={editingComment}
        onCancel={editingComment ? () => setEditingComment(null) : undefined}
        onCompleted={() => setEditingComment(null)}
      />

      {comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isOwnComment = !!user?.userId && comment.userId === user.userId

            return (
              <Card key={comment.id} className="border border-base-300 bg-base-100">
                <div className="card-body gap-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{comment.userName}</h3>
                        {isOwnComment && <span className="badge badge-primary badge-outline">You</span>}
                      </div>
                      <p className="text-xs uppercase tracking-wide text-base-content/50">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>

                    {isOwnComment && (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditingComment(comment)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(comment)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-base-content/80">{comment.content}</p>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-6 text-center text-sm text-base-content/60">
          No comments yet.
        </div>
      )}
    </div>
  )
}
