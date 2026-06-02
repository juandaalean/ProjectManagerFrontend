import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import {
  createSprintSchemaForProject,
  updateSprintSchemaForProject,
  type CreateSprintFormData,
  type UpdateSprintFormData,
} from '../schemas/sprintSchema'
import {
  useCreateSprintMutation,
  useUpdateSprintMutation,
} from '../hooks/useSprintMutations'
import type { Sprint, UpdateSprintRequest } from '../types/sprint.types'
import { SprintStateValues } from '../types/sprint.types'

interface SprintFormModalProps {
  projectId: string
  projectStartDate?: string
  projectEndDate?: string
  sprint?: Sprint
  onClose: () => void
}

const toDateOnly = (value?: string | null) => (value ? value.split('T')[0] : '')

export function SprintFormModal({
  projectId,
  projectStartDate,
  projectEndDate,
  sprint,
  onClose,
}: SprintFormModalProps) {
  const isEditing = !!sprint
  const createMutation = useCreateSprintMutation(projectId)
  const updateMutation = useUpdateSprintMutation(projectId)
  const mutation = isEditing ? updateMutation : createMutation

  const schema = useMemo(
    () =>
      isEditing
        ? updateSprintSchemaForProject({
            startDate: projectStartDate,
            endDate: projectEndDate,
          })
        : createSprintSchemaForProject({
            startDate: projectStartDate,
            endDate: projectEndDate,
          }),
    [isEditing, projectStartDate, projectEndDate],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateSprintFormData | UpdateSprintFormData>({
    resolver: zodResolver(schema as never),
    defaultValues: isEditing && sprint
      ? {
          name: sprint.name,
          goal: sprint.goal ?? '',
          startDate: toDateOnly(sprint.startDate),
          endDate: toDateOnly(sprint.endDate),
          state: sprint.state,
        }
      : {
          name: '',
          goal: '',
          startDate: toDateOnly(projectStartDate),
          endDate: toDateOnly(projectEndDate),
        },
  })

  useEffect(() => {
    if (isEditing && sprint) {
      reset({
        name: sprint.name,
        goal: sprint.goal ?? '',
        startDate: toDateOnly(sprint.startDate),
        endDate: toDateOnly(sprint.endDate),
        state: sprint.state,
      })
    }
  }, [isEditing, reset, sprint])

  const onSubmit = (data: CreateSprintFormData | UpdateSprintFormData) => {
    if (isEditing && sprint) {
      const updateData = data as UpdateSprintFormData
      const payload: UpdateSprintRequest = {}

      if (updateData.name !== undefined) {
        payload.name = updateData.name
      }
      if (updateData.goal !== undefined) {
        payload.goal = updateData.goal?.trim() ? updateData.goal : null
      }
      if (updateData.startDate !== undefined && updateData.startDate !== '') {
        payload.startDate = updateData.startDate
      }
      if (updateData.endDate !== undefined && updateData.endDate !== '') {
        payload.endDate = updateData.endDate
      }
      if (updateData.state !== undefined) {
        payload.state = updateData.state
      }

      updateMutation.mutate(
        { sprintId: sprint.sprintId, request: payload },
        {
          onSuccess: () => {
            reset()
            onClose()
          },
        },
      )
      return
    }

    const createData = data as CreateSprintFormData
    createMutation.mutate(
      {
        name: createData.name,
        goal: createData.goal?.trim() ? createData.goal : null,
        startDate: createData.startDate,
        endDate: createData.endDate,
      },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      },
    )
  }

  const projectStartDateOnly = toDateOnly(projectStartDate)
  const projectEndDateOnly = toDateOnly(projectEndDate)

  return (
    <div className="modal modal-open">
      <Card className="modal-box w-full max-w-xl border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold">
            {isEditing ? 'Edit Sprint' : 'Create Sprint'}
          </h2>
          <p className="mb-4 text-sm text-base-content/70">
            {isEditing
              ? 'Update the sprint details and state for this project.'
              : 'Define a sprint with a clear goal and date range for this project.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Name"
              {...register('name')}
              error={(errors as { name?: { message?: string } }).name?.message}
            />

            <div>
              <label className="label">
                <span className="label-text font-semibold">Goal</span>
              </label>
              <textarea
                {...register('goal')}
                className="textarea textarea-bordered w-full"
                rows={2}
                placeholder="What is the goal of this sprint?"
              />
              {(errors as { goal?: { message?: string } }).goal && (
                <p className="mt-1 text-sm text-error">
                  {(errors as { goal?: { message?: string } }).goal?.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Start Date"
                type="date"
                min={projectStartDateOnly || undefined}
                max={projectEndDateOnly || undefined}
                {...register('startDate')}
                error={(errors as { startDate?: { message?: string } }).startDate?.message}
              />
              <Input
                label="End Date"
                type="date"
                min={projectStartDateOnly || undefined}
                max={projectEndDateOnly || undefined}
                {...register('endDate')}
                error={(errors as { endDate?: { message?: string } }).endDate?.message}
              />
            </div>

            {isEditing && (
              <div>
                <label className="label">
                  <span className="label-text font-semibold">State</span>
                </label>
                <select
                  {...register('state')}
                  className="select select-bordered w-full"
                >
                  {SprintStateValues.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {(errors as { state?: { message?: string } }).state && (
                  <p className="mt-1 text-sm text-error">
                    {(errors as { state?: { message?: string } }).state?.message}
                  </p>
                )}
              </div>
            )}

            {mutation.isError && (
              <p className="text-sm text-error">
                {mutation.error?.message || 'An error occurred'}
              </p>
            )}

            <div className="modal-action">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? 'Saving...'
                  : isEditing
                    ? 'Update sprint'
                    : 'Create sprint'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
