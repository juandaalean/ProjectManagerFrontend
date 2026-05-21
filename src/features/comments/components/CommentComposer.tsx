import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { useCreateCommentMutation, useUpdateCommentMutation } from '../hooks/useCommentMutations'
import { commentSchema, type CommentFormData } from '../schemas/commentSchema'
import type { CommentItem } from '../types/comment.types'

interface CommentComposerProps {
  projectId: string
  taskItemId: string
  comment?: CommentItem | null
  onCancel?: () => void
  onCompleted?: () => void
}

export function CommentComposer({
  projectId,
  taskItemId,
  comment,
  onCancel,
  onCompleted,
}: CommentComposerProps) {
  const isEditing = !!comment
  const createMutation = useCreateCommentMutation()
  const updateMutation = useUpdateCommentMutation()

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: comment?.content ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      content: comment?.content ?? '',
    })
  }, [comment, form])

  const onSubmit = (data: CommentFormData) => {
    if (isEditing && comment) {
      updateMutation.mutate(
        {
          projectId,
          taskItemId,
          commentId: comment.id,
          comment: { content: data.content },
        },
        {
          onSuccess: () => {
            form.reset({ content: '' })
            onCompleted?.()
          },
        },
      )
      return
    }

    createMutation.mutate(
      {
        projectId,
        taskItemId,
        comment: { content: data.content },
      },
      {
        onSuccess: () => {
          form.reset({ content: '' })
          onCompleted?.()
        },
      },
    )
  }

  const mutation = isEditing ? updateMutation : createMutation

  return (
    <Card className="border border-base-300 bg-base-100">
      <div className="card-body gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold">{isEditing ? 'Edit comment' : 'Add a comment'}</h3>
          <p className="text-sm text-base-content/60">
            {isEditing ? 'Update the text of your comment.' : 'Share progress, blockers, or notes.'}
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <textarea
              {...form.register('content')}
              className="textarea textarea-bordered min-h-32 w-full"
              placeholder="Write your comment here..."
              rows={4}
            />
            {form.formState.errors.content && (
              <p className="mt-1 text-sm text-error">{form.formState.errors.content.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-sm text-error">{mutation.error.message || 'An error occurred'}</p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {isEditing && onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEditing ? 'Update comment' : 'Post comment'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}
