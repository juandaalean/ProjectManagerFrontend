import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../../shared/ui/Card'
import { Button } from '../../../shared/ui/Button'
import type { TaskItem } from '../types/task.types'
import { useDeleteTaskMutation, useUpdateTaskMutation } from '../hooks/useTaskMutations'
import { TaskFormModal } from './TaskFormModal'
import { useProjectQuery } from '../../projects/hooks/useProjectsQuery'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import { getTaskPriorityBadgeClassName, getTaskStateBadgeClassName } from '../utils/taskBadge'
import { useAuth } from '../../auth/context/AuthContext'
import { EllipsisVertical, CalendarRange, CheckCircle2, RotateCcw, Ban } from 'lucide-react'
import {
  canManageProject,
  canToggleTaskState,
  getMemberRoleForUser,
} from '../../projects/utils/projectPermissions'
import { TaskStatusDot } from './TaskStatusDot'

interface TaskListProps {
  tasks: TaskItem[]
  projectId?: string
}

export function TaskList({ tasks, projectId }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const navigate = useNavigate()
  const deleteMutation = useDeleteTaskMutation()
  const updateMutation = useUpdateTaskMutation()
  const resolvedProjectId = projectId || tasks[0]?.projectId
  const { data: project } = useProjectQuery(resolvedProjectId || '')
  const { data: projectMembers = [] } = useProjectMembersQuery(resolvedProjectId)
  const { user } = useAuth()

  const canManage = canManageProject({
    currentUserId: user?.userId,
    ownerId: project?.ownerId,
    memberRole: getMemberRoleForUser(projectMembers, user?.userId),
  })

  const memberById = useMemo(
    () => new Map(projectMembers.map((member) => [member.userId, member])),
    [projectMembers],
  )

  const handleDelete = (task: TaskItem) => {
    const taskProjectId = task.projectId || projectId

    if (!taskProjectId || !canManage) {
      return
    }
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate({ projectId: taskProjectId, taskItemId: task.id })
    }
  }

  const handleToggleState = (task: TaskItem) => {
    const taskProjectId = task.projectId || projectId
    const canToggleThisTask = canToggleTaskState({
      currentUserId: user?.userId,
      assignedUserId: task.assignedUserId,
      ownerId: project?.ownerId,
      memberRole: getMemberRoleForUser(projectMembers, user?.userId),
    })

    if (!taskProjectId || !canToggleThisTask) {
      return
    }
    const newState = task.state === 'Active' ? 'Finished' : 'Active'
    updateMutation.mutate({
      projectId: taskProjectId,
      taskItemId: task.id,
      task: { state: newState },
    })
  }

  const handleCancelTask = (task: TaskItem) => {
    const taskProjectId = task.projectId || projectId
    if (!taskProjectId || !canManage || task.state === 'Canceled') return
    updateMutation.mutate({
      projectId: taskProjectId,
      taskItemId: task.id,
      task: { state: 'Canceled', clearCompletedAt: true },
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-box border border-base-300 bg-base-100 p-8 text-center">
        <p className="text-base-content/70">No tasks found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className="border border-base-300 bg-base-100 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          role="link"
          tabIndex={0}
          onClick={() => navigate(`/projects/${task.projectId}/tasks/${task.id}`)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate(`/projects/${task.projectId}/tasks/${task.id}`)
            }
          }}
        >
          <div className="card-body gap-4 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="card-title text-lg">{task.title}</h3>
                  <TaskStatusDot
                    label={`State: ${task.state}`}
                    className={getTaskStateBadgeClassName(task.state)}
                  />
                  <TaskStatusDot
                    label={`Priority: ${task.priority}`}
                    className={getTaskPriorityBadgeClassName(task.priority)}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-base-content/70">
                  <span className="font-medium text-base-content">Assigned to:</span>
                  <span className="badge badge-secondary text-secondary-content">
                    {memberById.get(task.assignedUserId)?.userName ?? task.assignedUserId}
                  </span>
                </div>
                {task.description && (
                  <p className="mt-2 text-sm text-base-content/70">{task.description}</p>
                )}
                {(task.startAt || task.completedAt) && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/60">
                    <span className="inline-flex items-center gap-1.5 font-medium text-base-content/70">
                      <CalendarRange className="h-3.5 w-3.5" />
                      Schedule:
                    </span>
                    {task.startAt && (
                      <span>
                        Start:{' '}
                        <span className="font-medium text-base-content">
                          {new Date(task.startAt).toLocaleDateString()}
                        </span>
                      </span>
                    )}
                    {task.startAt && task.completedAt && (
                      <span aria-hidden="true" className="text-base-content/30">
                        ·
                      </span>
                    )}
                    {task.completedAt && (
                      <span>
                        End:{' '}
                        <span className="font-medium text-base-content">
                          {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {canToggleTaskState({
                  currentUserId: user?.userId,
                  assignedUserId: task.assignedUserId,
                  ownerId: project?.ownerId,
                  memberRole: getMemberRoleForUser(projectMembers, user?.userId),
                }) && (
                  <Button
                    variant="primary"
                    size="sm"
                    aria-label={task.state === 'Active' ? 'Mark as finished' : 'Mark as active'}
                    title={task.state === 'Active' ? 'Mark as finished' : 'Mark as active'}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleToggleState(task)
                    }}
                  >
                    {task.state === 'Active' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {canManage && task.state !== 'Canceled' && (
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label="Cancel task"
                    title="Cancel task"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleCancelTask(task)
                    }}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
                {canManage && (
                  <div className="dropdown dropdown-end">
                    <button
                      type="button"
                      className="btn btn-ghost btn-circle btn-sm"
                      aria-label="Task actions"
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <EllipsisVertical className="h-5 w-5" />
                    </button>

                    <ul
                      className="menu dropdown-content menu-sm z-[1] mt-3 w-44 rounded-box bg-base-100 p-2 shadow"
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <li>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditingTask(task)
                          }}
                        >
                          Edit
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="text-error"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDelete(task)
                          }}
                        >
                          Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
      {editingTask && (
        <TaskFormModal
          task={editingTask}
          projectId={editingTask.projectId || projectId}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}
