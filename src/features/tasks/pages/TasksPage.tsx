import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { useProjectsQuery } from '../../projects/hooks/useProjectsQuery'
import { TaskList } from '../components/TaskList'
import { TaskFormModal } from '../components/TaskFormModal'
import { TasksFilterBar } from '../components/TasksFilterBar'
import { useTasksQuery } from '../hooks/useTasksQuery'
import { useTasksByProjectsQuery } from '../hooks/useTasksQuery'
import type { ListTaskItemsQuery } from '../types/task.types'
import { useAuth } from '../../auth/context/AuthContext'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import { canCreateTask, getMemberRoleForUser } from '../../projects/utils/projectPermissions'

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const showCreateModal = searchParams.get('create') === '1'
  const isGlobalTasksView = !projectId
  const { user } = useAuth()
  const [filters, setFilters] = useState<ListTaskItemsQuery>({})

  const { data: projectTasks, isLoading, error } = useTasksQuery(projectId, filters)
  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjectsQuery(isGlobalTasksView)
  const projectIds = useMemo(() => projects?.map((project) => project.projectId) ?? [], [projects])
  const {
    data: tasksByProjects,
    isLoading: groupedTasksLoading,
    error: groupedTasksError,
  } = useTasksByProjectsQuery(projectIds, filters)

  const projectById = useMemo(
    () => new Map((projects ?? []).map((project) => [project.projectId, project])),
    [projects],
  )

  const { data: projectMembers = [] } = useProjectMembersQuery(projectId)
  const canCreate = canCreateTask({
    memberRole: getMemberRoleForUser(projectMembers, user?.userId),
  })

  if (isGlobalTasksView) {
    if (projectsLoading || groupedTasksLoading) {
      return <div className="text-center py-8">Loading tasks...</div>
    }

    if (projectsError) {
      return <ErrorState message={projectsError.message} />
    }

    if (groupedTasksError) {
      return <ErrorState message={groupedTasksError.message} />
    }

    if (!projects || projects.length === 0) {
      return (
        <EmptyState
          title="No projects yet"
          description="Create a project first to start seeing tasks here"
          action={<Button onClick={() => navigate('/projects')}>Go to Projects</Button>}
        />
      )
    }

    const visibleGroups = (tasksByProjects ?? []).filter((group) => group.tasks.length > 0)

    if (visibleGroups.length === 0) {
      return (
        <EmptyState
          title="No tasks yet"
          description="Your projects do not have tasks assigned yet"
          action={<Button onClick={() => navigate('/projects')}>Go to Projects</Button>}
        />
      )
    }

    return (
      <div className="space-y-6">
        <div className="rounded-box bg-base-100 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="badge badge-primary text-primary-content mb-3">Tasks</div>
              <h1 className="text-3xl font-bold tracking-tight">All tasks</h1>
              <p className="max-w-2xl text-base-content/70">
                Review the tasks available across all projects you can access.
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/projects')}>
              Go to Projects
            </Button>
          </div>
          <div className="mt-6">
            <TasksFilterBar filters={filters} onChange={setFilters} />
          </div>
        </div>

        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const project = projectById.get(group.projectId)
            const projectName = group.projectName ?? project?.name ?? group.projectId

            return (
              <Card key={group.projectId} className="border border-base-300 bg-base-100">
                <div className="card-body gap-4 p-6">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="badge badge-secondary text-secondary-content mb-2">
                        Project
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">{projectName}</h2>
                    </div>
                    <div className="badge badge-accent text-accent-content">
                      {group.tasks.length} tasks
                    </div>
                  </div>
                  <TaskList tasks={group.tasks} projectId={group.projectId} />
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading tasks...</div>
  }

  if (error) {
    return <ErrorState message={error.message} />
  }

  return (
    <div className="space-y-6">
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="badge badge-primary text-primary-content mb-3">Tasks</div>
            <h1 className="text-3xl font-bold tracking-tight">Task board</h1>
            <p className="max-w-2xl text-base-content/70">
              Track work items by priority and state in a cleaner dashboard surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${projectId}?view=calendar`)}
            >
              View Calendar
            </Button>
            {canCreate && (
              <Button onClick={() => navigate(`/projects/${projectId}/tasks?create=1`)}>
                Create Task
              </Button>
            )}
          </div>
        </div>
        <TasksFilterBar projectId={projectId} filters={filters} onChange={setFilters} />
      </div>
      <TaskList tasks={projectTasks || []} projectId={projectId} />
      {showCreateModal && canCreate && (
        <TaskFormModal
          projectId={projectId}
          onClose={() => navigate(`/projects/${projectId}/tasks`, { replace: true })}
        />
      )}
    </div>
  )
}
