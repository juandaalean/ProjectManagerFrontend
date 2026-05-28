import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { useTaskQuery } from '../hooks/useTasksQuery'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { CommentsList } from '../../comments/components/CommentsList'
import { useUpdateTaskMutation } from '../hooks/useTaskMutations'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import { getTaskPriorityBadgeClassName, getTaskStateBadgeClassName } from '../utils/taskBadge'
import { useAuth } from '../../auth/context/AuthContext'
import {
  canToggleTaskState,
  getMemberRoleForUser,
} from '../../projects/utils/projectPermissions'
import { useProjectQuery } from '../../projects/hooks/useProjectsQuery'

export function TaskDetailPage() {
  const { projectId, taskItemId } = useParams<{ projectId: string; taskItemId: string }>()
  const { data: task, isLoading, error } = useTaskQuery(projectId!, taskItemId!)
  const { data: project } = useProjectQuery(projectId!)
  const { data: projectMembers = [] } = useProjectMembersQuery(projectId!)
  const updateMutation = useUpdateTaskMutation()
  const { user } = useAuth()

  const assigneeName = useMemo(() => {
    if (!task) {
      return ''
    }

    return (
      projectMembers.find((member) => member.userId === task.assignedUserId)?.userName ??
      task.assignedUserId
    )
  }, [projectMembers, task])

  const canToggle = !!task && canToggleTaskState({
    currentUserId: user?.userId,
    assignedUserId: task.assignedUserId,
    ownerId: project?.ownerId,
    memberRole: getMemberRoleForUser(projectMembers, user?.userId),
  })

  const countdownInfo = (() => {
    if (!task?.completedAt) {
      return null
    }

    const targetDate = new Date(task.completedAt)
    if (Number.isNaN(targetDate.getTime())) {
      return null
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const targetStart = new Date(targetDate)
    targetStart.setHours(0, 0, 0, 0)

    const diffInDays = Math.ceil((targetStart.getTime() - startOfToday.getTime()) / 86400000)
    const daysLeft = Math.max(diffInDays, 0)

    return {
      daysLeft,
      label: daysLeft === 1 ? '1 day left' : `${daysLeft} days left`,
    }
  })()

  const handleToggleState = () => {
    if (!projectId || !task || !canToggle) {
      return
    }

    const nextState = task.state === 'Active' ? 'Finished' : 'Active'

    updateMutation.mutate({
      projectId,
      taskItemId: task.id,
      task: { state: nextState },
    })
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading task...</div>
  }

  if (error) {
    return <ErrorState message={error.message} />
  }

  if (!task) {
    return <div className="text-center py-8">Task not found.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-box bg-base-100 p-6 shadow-sm">
        <div>
          <div className="badge badge-secondary badge-outline mb-3">Task detail</div>
          <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canToggle && (
            <Button variant="secondary" onClick={handleToggleState} disabled={updateMutation.isPending}>
              {task.state === 'Active' ? 'Mark Finished' : 'Mark Active'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.history.back()}>
            Back
          </Button>
        </div>
      </div>
      <Card className="border border-base-300 bg-base-100">
        <div className="card-body grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="text-base-content/70">{task.description || 'No description provided.'}</p>
            </div>
            <div className="flex gap-4">
              <span className={getTaskPriorityBadgeClassName(task.priority)}>
                Priority: {task.priority}
              </span>
              <span className={getTaskStateBadgeClassName(task.state)}>State: {task.state}</span>
            </div>
            <div className="text-sm text-base-content/70">
              Assigned to: <span className="font-semibold text-base-content">{assigneeName}</span>
            </div>
            <div className="text-sm text-base-content/60">
              Created: {new Date(task.createdAt).toLocaleDateString()}
              {task.completedAt && (
                <> | Deadline: {new Date(task.completedAt).toLocaleDateString()}</>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4 lg:min-w-64 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-base-content/50">
              {task.state === 'Finished' ? 'Task finished' : 'Time left'}
            </p>
            {task.state === 'Finished' ? (
              <div className="mt-3 flex flex-col items-start gap-2">
                <span className="badge badge-success badge-lg text-success-content">Finished</span>
                <p className="text-sm text-base-content/70">
                  This task has already been completed.
                </p>
              </div>
            ) : countdownInfo ? (
              <div className="mt-3 flex flex-col items-start gap-2">
                <span className="countdown font-mono text-6xl leading-none">
                  <span
                    style={{ '--value': countdownInfo.daysLeft, '--digits': 2 } as CSSProperties}
                    aria-live="polite"
                    aria-label={countdownInfo.label}
                  >
                    {String(countdownInfo.daysLeft).padStart(2, '0')}
                  </span>
                </span>
                <p className="text-sm text-base-content/70">{countdownInfo.label}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-base-content/70">No deadline set for this task.</p>
            )}
          </div>
        </div>
      </Card>
      <CommentsList projectId={projectId!} taskItemId={taskItemId!} />
    </div>
  )
}
