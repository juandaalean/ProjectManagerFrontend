import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import type { TaskItem, CreateTaskRequest, UpdateTaskRequest } from '../types/task.types'
import { TaskPriorityValues, TaskStateValues } from '../types/task.types'
import type { CreateTaskFormData, UpdateTaskFormData } from '../schemas/taskSchema'
import { useCreateTaskMutation, useUpdateTaskMutation } from '../hooks/useTaskMutations'
import { useAuth } from '../../auth/context/AuthContext'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import { canCreateTask, getMemberRoleForUser } from '../../projects/utils/projectPermissions'
import { useProjectQuery } from '../../projects/hooks/useProjectsQuery'
import { createTaskSchemaForProject, updateTaskSchemaForProject } from '../schemas/taskSchema'

interface TaskFormModalProps {
  task?: TaskItem
  projectId?: string
  initialCompletedAt?: string
  initialStartAt?: string
  onClose: () => void
}

export function TaskFormModal({
  task,
  projectId,
  initialCompletedAt,
  initialStartAt,
  onClose,
}: TaskFormModalProps) {
  const isEditing = !!task
  const createMutation = useCreateTaskMutation()
  const updateMutation = useUpdateTaskMutation()
  const { user } = useAuth()
  const resolvedProjectId = task?.projectId ?? projectId
  const { data: project, isLoading: isProjectLoading } = useProjectQuery(resolvedProjectId ?? '')
  const {
    data: projectMembers = [],
    isLoading: isMembersLoading,
    error: projectMembersError,
  } = useProjectMembersQuery(resolvedProjectId)
  const currentUserMemberRole = getMemberRoleForUser(projectMembers, user?.userId)
  const canCreate = isEditing || canCreateTask({ memberRole: currentUserMemberRole, projectStatus: project?.status })
  const taskSchema = useMemo(
    () =>
      isEditing
        ? updateTaskSchemaForProject({
            startDate: project?.startDate,
            endDate: project?.endDate,
          })
        : createTaskSchemaForProject({
            startDate: project?.startDate,
            endDate: project?.endDate,
          }),
    [isEditing, project?.endDate, project?.startDate],
  )
  const projectStartDate = project?.startDate?.split('T')[0]
  const projectEndDate = project?.endDate?.split('T')[0]

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<CreateTaskFormData | UpdateTaskFormData>({
    resolver: zodResolver(taskSchema as never),
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? '',
          priority: task.priority,
          state: task.state,
          assignedUserId: task.assignedUserId,
          startAt: task.startAt ? task.startAt.split('T')[0] : '',
          completedAt: task.completedAt ? task.completedAt.split('T')[0] : '',
        }
      : {
          priority: 'Medium',
          assignedUserId: '',
          startAt: initialStartAt ?? '',
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
      const { startAt, completedAt, sprintId, clearStartAt, clearCompletedAt, clearSprint } =
        updateData
      const nextStartAt = clearStartAt
        ? null
        : startAt
          ? new Date(`${startAt}T00:00:00.000Z`).toISOString()
          : undefined
      const nextCompletedAt = clearCompletedAt
        ? null
        : completedAt
          ? new Date(`${completedAt}T00:00:00.000Z`).toISOString()
          : undefined
      const nextSprintId = clearSprint ? null : sprintId && sprintId.length > 0 ? sprintId : undefined

      updateMutation.mutate(
        {
          projectId: task.projectId,
          taskItemId: task.id,
          task: {
            ...updateData,
            startAt: nextStartAt,
            completedAt: nextCompletedAt,
            sprintId: nextSprintId,
            clearStartAt: clearStartAt || undefined,
            clearCompletedAt: clearCompletedAt || undefined,
            clearSprint: clearSprint || undefined,
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
      const startAtIso = createData.startAt
        ? new Date(`${createData.startAt}T00:00:00.000Z`).toISOString()
        : undefined
      const completedAt = createData.completedAt
        ? new Date(`${createData.completedAt}T00:00:00.000Z`).toISOString()
        : undefined
      const sprintId =
        createData.sprintId && createData.sprintId.length > 0 ? createData.sprintId : undefined
      createMutation.mutate(
        {
          projectId: resolvedProjectId,
          task: {
            ...createData,
            startAt: startAtIso,
            completedAt,
            sprintId,
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
    isProjectLoading ||
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
              label="Start At"
              type="date"
              min={projectStartDate}
              max={projectEndDate}
              {...register('startAt')}
              error={errors.startAt?.message}
            />
            <Input
              label="Completed At"
              type="date"
              min={projectStartDate}
              max={projectEndDate}
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
            {isProjectLoading && (
              <p className="text-sm text-base-content/60">Loading project dates...</p>
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
