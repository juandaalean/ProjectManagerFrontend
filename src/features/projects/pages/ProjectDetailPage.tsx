import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useProjectQuery } from '../hooks/useProjectsQuery'
import { Card } from '../../../shared/ui/Card'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { Button } from '../../../shared/ui/Button'
import { useTasksQuery } from '../../tasks/hooks/useTasksQuery'
import { ProjectTaskCalendar } from '../components/ProjectTaskCalendar'
import { ProjectMembersSection } from '../components/ProjectMembersSection'
import { useAuth } from '../../auth/context/AuthContext'
import { useProjectMembersQuery } from '../hooks/useProjectMembersQuery'
import { useUpdateProjectMutation } from '../hooks/useProjectMutations'
import { canCreateTask, canManageProject, getMemberRoleForUser } from '../utils/projectPermissions'
import { TranscriptTaskAutomationPanel } from '../components/TranscriptTaskAutomationPanel'
import { SprintsSection } from '../../sprints/components/SprintsSection'
import { TasksFilterBar } from '../../tasks/components/TasksFilterBar'
import { TaskList } from '../../tasks/components/TaskList'
import type { ListTaskItemsQuery } from '../../tasks/types/task.types'
import type { ProjectStatus } from '../types/project.types'
import {
  getProjectStatus,
  getProjectStatusBadgeClassName,
  getProjectStatusLabel,
  isProjectArchived,
} from '../utils/projectStatus'

import { ArchiveRestore, SquareCheckBig, RotateCcw } from 'lucide-react'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: project, isLoading, error } = useProjectQuery(projectId!)
  const [filters, setFilters] = useState<ListTaskItemsQuery>({})
  const { data: tasks = [] } = useTasksQuery(projectId, filters)
  const { data: members } = useProjectMembersQuery(projectId)
  const updateProjectMutation = useUpdateProjectMutation()
  const { user } = useAuth()
  const canManage =
    !!project &&
    canManageProject({
      currentUserId: user?.userId,
      ownerId: project.ownerId,
      memberRole: getMemberRoleForUser(members, user?.userId),
    })
  const canCreate = canCreateTask({ memberRole: getMemberRoleForUser(members, user?.userId), projectStatus: project?.status })
  const canManageSprints = canManage && project?.status === 'Active'
  const viewMode =
    searchParams.get('view') === 'calendar'
      ? 'calendar'
      : searchParams.get('view') === 'sprints'
        ? 'sprints'
        : searchParams.get('view') === 'ai'
          ? 'ai'
          : searchParams.get('view') === 'tasks'
            ? 'tasks'
            : 'overview'
  const projectStatus = project ? getProjectStatus(project) : 'Active'

  const updateProjectStatus = (status: ProjectStatus) => {
    if (!projectId) {
      return
    }

    updateProjectMutation.mutate({
      id: projectId,
      project: { status },
    })
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading project...</div>
  }

  if (error || !project) {
    return <ErrorState message="Failed to load project" />
  }

  return (
    <div className="space-y-6">
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="badge badge-primary text-primary-content mb-3">Project detail</div>
              {canManage && (
                <div className="badge badge-accent text-accent-content mb-3">Manager</div>
              )}
              <div className={`badge mb-3 ${getProjectStatusBadgeClassName(projectStatus)}`}>
                {getProjectStatusLabel(projectStatus)}
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="mt-2 max-w-2xl text-base-content/70">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {canManage && !isProjectArchived(project) && projectStatus !== 'Finished' && (
              <Button
                variant="secondary"
                title="Finish project"
                onClick={() => updateProjectStatus('Finished')}
                disabled={updateProjectMutation.isPending}
              >
                <SquareCheckBig className="h-5 w-5" />
                {/* Mark Finished */}
              </Button>
            )}
            {canManage && !isProjectArchived(project) && (
              <Button
                variant="secondary"
                title="Archive project"
                onClick={() => updateProjectStatus('Archived')}
                disabled={updateProjectMutation.isPending}
              >
                <ArchiveRestore className="h-5 w-5" />
                {/* Archive */}
              </Button>
            )}
            {canManage && isProjectArchived(project) && (
              <Button
                variant="secondary"
                title="Restore project"
                onClick={() => updateProjectStatus('Active')}
                disabled={updateProjectMutation.isPending}
              >
                <RotateCcw className="h-5 w-5" />
                {/* Restore */}
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => navigate(`/projects/${project.projectId}/tasks?create=1`)}>
                Add Task
              </Button>
            )}
          </div>
        </div>

        {viewMode !== 'overview' && viewMode !== 'sprints' && (
          <div className="mt-6">
            <TasksFilterBar projectId={project.projectId} filters={filters} onChange={setFilters} />
          </div>
        )}

        <TranscriptTaskAutomationPanel
          projectId={project.projectId}
          projectName={project.name}
          ownerId={project.ownerId}
          projectStartDate={project.startDate}
          projectEndDate={project.endDate}
          members={members ?? []}
          enabled={canCreate}
          autoOpen={viewMode === 'ai'}
          hideTriggerButton
          onClose={() => {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('view', 'tasks')
            setSearchParams(newParams)
          }}
        />
      </div>

      {viewMode === 'overview' ? (
        <div className="space-y-6">
          <Card className="border border-base-300 bg-base-100">
            <div className="card-body grid gap-4 p-6 md:grid-cols-2">
              <div className="rounded-box bg-base-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide">Start Date</h3>
                <p className="mt-2 text-base">{new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              <div className="rounded-box bg-base-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide">End Date</h3>
                <p className="mt-2 text-base">{new Date(project.endDate).toLocaleDateString()}</p>
              </div>
              <div className="rounded-box bg-base-200 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide">Tasks in project</h3>
                <p className="mt-2 text-base">{tasks.length} tasks loaded for this project.</p>
              </div>
              <div className="rounded-box bg-base-200 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide">Project status</h3>
                <p className="mt-2 text-base">{getProjectStatusLabel(projectStatus)}</p>
              </div>
            </div>
          </Card>

          <ProjectMembersSection projectId={project.projectId} canManageMembers={canManage} />
        </div>
      ) : viewMode === 'ai' || viewMode === 'tasks' ? (
        <TaskList tasks={tasks} projectId={project.projectId} />
      ) : viewMode === 'sprints' ? (
        <SprintsSection
          projectId={project.projectId}
          projectStartDate={project.startDate}
          projectEndDate={project.endDate}
          canManage={canManageSprints}
        />
      ) : (
        <ProjectTaskCalendar projectId={project.projectId} tasks={tasks} />
      )}
    </div>
  )
}
