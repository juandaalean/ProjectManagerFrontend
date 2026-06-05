import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { useProjectsQuery, useProjectQuery } from '../../projects/hooks/useProjectsQuery'
import { projectsApi } from '../../projects/api/projectsApi'
import { TaskList } from '../components/TaskList'
import { TaskFormModal } from '../components/TaskFormModal'
import { TasksFilterBar } from '../components/TasksFilterBar'
import { useTasksQuery } from '../hooks/useTasksQuery'
import { useTasksByProjectsQuery } from '../hooks/useTasksQuery'
import type { ListTaskItemsQuery } from '../types/task.types'
import { useAuth } from '../../auth/context/AuthContext'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import {
  canCreateTask,
  getMemberRoleForUser,
  isProjectManagerRole,
} from '../../projects/utils/projectPermissions'

import { Calendar } from 'lucide-react'

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

  const memberQueries = useQueries({
    queries: (projectIds ?? []).map((id) => ({
      queryKey: ['project-members', id],
      queryFn: () => projectsApi.getProjectMembers(id),
      enabled: isGlobalTasksView && projectIds.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  })

  const userRoleByProjectId = useMemo(() => {
    const map = new Map<string, number | undefined>()
    projectIds.forEach((id, index) => {
      const members = memberQueries[index]?.data
      map.set(id, getMemberRoleForUser(members, user?.userId))
    })
    return map
  }, [projectIds, memberQueries, user?.userId])

  const filteredGroups = useMemo(() => {
    if (!tasksByProjects) return []

    return tasksByProjects
      .map((group) => {
        const role = userRoleByProjectId.get(group.projectId)
        const isManager = isProjectManagerRole(role)

        if (isManager) return group

        return {
          ...group,
          tasks: group.tasks.filter(
            (task) => !task.assignedUserId || task.assignedUserId === user?.userId,
          ),
        }
      })
      .filter((group) => group.tasks.length > 0)
  }, [tasksByProjects, userRoleByProjectId, user?.userId])

  const { data: project } = useProjectQuery(projectId ?? '')
  const { data: projectMembers = [] } = useProjectMembersQuery(projectId)
  const canCreate = canCreateTask({
    memberRole: getMemberRoleForUser(projectMembers, user?.userId),
    projectStatus: project?.status,
  })

  if (isGlobalTasksView) {
    if (projectsError) {
      return <ErrorState message={projectsError.message} />
    }

    if (groupedTasksError) {
      return <ErrorState message={groupedTasksError.message} />
    }

    if (!projectsLoading && (!projects || projects.length === 0)) {
      return (
        <EmptyState
          title="No projects yet"
          description="Create a project first to start seeing tasks here"
          action={<Button onClick={() => navigate('/projects')}>Go to Projects</Button>}
        />
      )
    }

    const visibleGroups = filteredGroups
    const hasActiveFilters = !!(filters.searchTerm || filters.taskState || filters.taskPriority)
    const showInitialLoading =
      (projectsLoading && !projects) || (groupedTasksLoading && !tasksByProjects)

    return (
      <div className="space-y-6">
        <div className="rounded-box bg-base-100 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="badge badge-primary text-primary-content mb-3">Tasks</div>
              <h1 className="text-3xl font-bold tracking-tight">All tasks</h1>
              <p className="max-w-2xl text-base-content/70">
                Review the tasks available across all projects you can access, if you are admin or
                coordinator you can see all tasks, if you are a contributor you will see only the
                tasks assigned to you or unassigned.
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

        {showInitialLoading ? (
          <div className="text-center py-8">Loading tasks...</div>
        ) : visibleGroups.length === 0 ? (
          <div className="rounded-box border border-base-300 bg-base-100 p-8 text-center">
            <p className="text-base-content/70">
              {hasActiveFilters
                ? `No tasks found with the current filters.`
                : 'Your projects do not have tasks assigned yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((group) => {
              const project = projectById.get(group.projectId)
              const projectName = group.projectName ?? project?.name ?? group.projectId
              const role = userRoleByProjectId.get(group.projectId)
              const isOwner = user?.userId === project?.ownerId

              return (
                <Card key={group.projectId} className="border border-base-300 bg-base-100">
                  <div className="card-body gap-4 p-6">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className="badge badge-secondary text-secondary-content">
                            Project
                          </div>
                          {isProjectManagerRole(role) && isOwner && (
                            <div className="badge badge-accent text-accent-content">Owner</div>
                          )}
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
        )}
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error.message} />
  }

  const showProjectLoading = isLoading && !projectTasks

  return (
    <div className="space-y-6">
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="badge badge-primary text-primary-content mb-3">Tasks</div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Task board</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${projectId}?view=calendar`)}
              title="View project calendar"
            >
              <Calendar className="h-5 w-5" />
            </Button>
            {canCreate && (
              <Button onClick={() => navigate(`/projects/${projectId}/tasks?create=1`)}>
                Add Task
              </Button>
            )}
          </div>
        </div>
        <TasksFilterBar projectId={projectId} filters={filters} onChange={setFilters} />
      </div>
      {showProjectLoading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : (
        <TaskList tasks={projectTasks || []} projectId={projectId} />
      )}
      {showCreateModal && canCreate && (
        <TaskFormModal
          projectId={projectId}
          onClose={() => navigate(`/projects/${projectId}/tasks`, { replace: true })}
        />
      )}
    </div>
  )
}
