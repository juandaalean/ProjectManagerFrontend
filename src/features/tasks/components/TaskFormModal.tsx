import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import type { TaskItem, CreateTaskRequest, UpdateTaskRequest } from '../types/task.types'
import { TaskPriorityValues, TaskStateValues } from '../types/task.types'
import type { CreateTaskFormData, UpdateTaskFormData } from '../schemas/taskSchema'
import { createTaskSchema, updateTaskSchema } from '../schemas/taskSchema'
import { useCreateTaskMutation, useUpdateTaskMutation } from '../hooks/useTaskMutations'
import { useAuth } from '../../auth/context/AuthContext'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import { canCreateTask, getMemberRoleForUser } from '../../projects/utils/projectPermissions'

interface TaskFormModalProps {
  task?: TaskItem
  projectId?: string
  initialCompletedAt?: string
  onClose: () => void
}

export function TaskFormModal({
  task,
  projectId,
  initialCompletedAt,
  onClose,
}: TaskFormModalProps) {
  const isEditing = !!task
  const createMutation = useCreateTaskMutation()
  const updateMutation = useUpdateTaskMutation()
  const { user } = useAuth()
  const resolvedProjectId = task?.projectId ?? projectId
  const {
    data: projectMembers = [],
    isLoading: isMembersLoading,
    error: projectMembersError,
  } = useProjectMembersQuery(resolvedProjectId)
  const currentUserMemberRole = getMemberRoleForUser(projectMembers, user?.userId)
  const canCreate = isEditing || canCreateTask({ memberRole: currentUserMemberRole })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<CreateTaskFormData | UpdateTaskFormData>({
    resolver: zodResolver(isEditing ? updateTaskSchema : createTaskSchema),
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? '',
          priority: task.priority,
          state: task.state,
          assignedUserId: task.assignedUserId,
          completedAt: task.completedAt ? task.completedAt.split('T')[0] : '',
        }
      : {
          priority: 'Medium',
          assignedUserId: '',
          completedAt: initialCompletedAt ?? '',
        },
  })
  const editErrors = errors as typeof errors & {
    state?: {
      message?: string
    }
  }

  useEffect(() => {
    if (isEditing || isMembersLoading || projectMembers.length === 0) {
      return
    }

    if (getValues('assignedUserId')) {
      return
    }

    const currentUserMember = user?.userId
      ? projectMembers.find((member) => member.userId === user.userId)
      : undefined

    setValue('assignedUserId', currentUserMember?.userId ?? projectMembers[0].userId, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    })
  }, [getValues, isEditing, isMembersLoading, projectMembers, setValue, user?.userId])

  const assignedUserId = watch('assignedUserId')

  const onSubmit = (data: CreateTaskFormData | UpdateTaskFormData) => {
    if (isEditing && task) {
      const updateData = data as UpdateTaskFormData
      updateMutation.mutate(
        {
          projectId: task.projectId,
          taskItemId: task.id,
          task: {
            ...updateData,
            completedAt: updateData.completedAt
              ? new Date(`${updateData.completedAt}T00:00:00.000Z`).toISOString()
              : undefined,
          } as UpdateTaskRequest,
        },
        {
          onSuccess: () => {
            reset()
            onClose()
          },
        },
      )
    } else {
      if (!resolvedProjectId) {
        return
      }
      if (!data.assignedUserId) {
        return
      }
      const createData = data as CreateTaskFormData
      const completedAt = createData.completedAt
        ? new Date(`${createData.completedAt}T00:00:00.000Z`).toISOString()
        : undefined
      createMutation.mutate(
        {
          projectId: resolvedProjectId,
          task: {
            ...createData,
            completedAt,
          } as CreateTaskRequest,
        },
        {
          onSuccess: () => {
            reset()
            onClose()
          },
        },
      )
    }
  }

  const isSubmitDisabled =
    !resolvedProjectId ||
    isMembersLoading ||
    projectMembers.length === 0 ||
    createMutation.isPending ||
    updateMutation.isPending
  const selectedAssignee = projectMembers.find((member) => member.userId === assignedUserId)

  if (!isEditing && !isMembersLoading && !canCreate) {
    return (
      <div className="modal modal-open">
        <Card className="modal-box w-full max-w-md border border-base-300 bg-base-100 shadow-xl">
          <div className="space-y-3 p-6 text-center">
            <h2 className="text-xl font-bold">No permission</h2>
            <p className="text-sm text-base-content/70">
              Only admins or coordinators can create tasks for this project.
            </p>
            <div className="modal-action justify-center">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="modal modal-open">
      <Card className="modal-box w-full max-w-2xl border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold">{isEditing ? 'Edit Task' : 'Create Task'}</h2>
          <p className="mb-4 text-sm text-base-content/70">
            Fill in the task details and assign the right priority.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Title" {...register('title')} error={errors.title?.message} />
            <div>
              <label className="label">
                <span className="label-text font-semibold">Description</span>
              </label>
              <textarea
                {...register('description')}
                className="textarea textarea-bordered w-full"
                rows={3}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-error">{errors.description.message}</p>
              )}
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold">Priority</span>
              </label>
              <select {...register('priority')} className="select select-bordered w-full">
                {TaskPriorityValues.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-error">{errors.priority.message}</p>
              )}
            </div>
            <div>
              <label className="label">
                <span className="label-text font-semibold">Assign to</span>
              </label>
              <select
                {...register('assignedUserId')}
                className="select select-bordered w-full"
                disabled={isMembersLoading || projectMembers.length === 0}
              >
                <option value="">Select a project member</option>
                {projectMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userName} ({member.userEmail})
                  </option>
                ))}
              </select>
              {errors.assignedUserId && (
                <p className="mt-1 text-sm text-error">{errors.assignedUserId.message}</p>
              )}
              {selectedAssignee ? (
                <p className="mt-1 text-xs text-base-content/60">
                  Current assignee: {selectedAssignee.userName}
                </p>
              ) : null}
            </div>
            <Input
              label="Completed At"
              type="date"
              {...register('completedAt')}
              error={errors.completedAt?.message}
            />
            {isEditing && (
              <div>
                <label className="label">
                  <span className="label-text font-semibold">State</span>
                </label>
                <select {...register('state')} className="select select-bordered w-full">
                  {TaskStateValues.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {editErrors.state && (
                  <p className="mt-1 text-sm text-error">{editErrors.state.message}</p>
                )}
              </div>
            )}
            {projectMembersError && (
              <p className="text-sm text-error">{projectMembersError.message}</p>
            )}
            {isMembersLoading && (
              <p className="text-sm text-base-content/60">Loading project members...</p>
            )}
            <div className="modal-action">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitDisabled}>
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
