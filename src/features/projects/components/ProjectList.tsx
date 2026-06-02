import { useNavigate } from 'react-router-dom'
import { useProjectsQuery } from '../hooks/useProjectsQuery'
import { useAuth } from '../../auth/context/AuthContext'
import { useProjectMembersQuery } from '../hooks/useProjectMembersQuery'
import { useDeleteProjectMutation, useUpdateProjectMutation } from '../hooks/useProjectMutations'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorState } from '../../../shared/ui/ErrorState'
import type { Project, ProjectStatus, ListProjectsQuery } from '../types/project.types'
import { canManageProject, getMemberRoleForUser } from '../utils/projectPermissions'
import { EllipsisVertical } from 'lucide-react'
import {
  getProjectStatus,
  getProjectStatusBadgeClassName,
  getProjectStatusLabel,
} from '../utils/projectStatus'

interface ProjectListProps {
  onEdit?: (project: Project) => void
  onCreate?: () => void
  filters?: ListProjectsQuery
}

function ProjectCardBadges({ project }: { project: Project }) {
  const { user } = useAuth()
  const { data: members } = useProjectMembersQuery(project.projectId)

  const canManage = canManageProject({
    currentUserId: user?.userId,
    ownerId: project.ownerId,
    memberRole: getMemberRoleForUser(members, user?.userId),
  })
  const projectStatus = getProjectStatus(project)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canManage && <div className="badge badge-ghost">Owner</div>}
      <div className={`badge ${getProjectStatusBadgeClassName(projectStatus)}`}>
        {getProjectStatusLabel(projectStatus)}
      </div>
    </div>
  )
}

function ProjectCardActions({
  project,
  onEdit,
  onDelete,
}: {
  project: Project
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
}) {
  const { user } = useAuth()
  const { data: members } = useProjectMembersQuery(project.projectId)
  const updateMutation = useUpdateProjectMutation()

  const canManage = canManageProject({
    currentUserId: user?.userId,
    ownerId: project.ownerId,
    memberRole: getMemberRoleForUser(members, user?.userId),
  })
  const projectStatus = getProjectStatus(project)

  const updateStatus = (status: ProjectStatus) => {
    updateMutation.mutate({
      id: project.projectId,
      project: { status },
    })
  }

  return (
    <div className="absolute right-0 top-0">
      {canManage && (
        <div className="dropdown dropdown-left dropdown-bottom">
          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Project actions"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <EllipsisVertical className="h-5 w-5" />
          </button>

          <ul
            className="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box bg-base-100 p-2 shadow"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            {projectStatus !== 'Finished' && projectStatus !== 'Archived' && (
              <li>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    updateStatus('Finished')
                  }}
                  disabled={updateMutation.isPending}
                >
                  Finish
                </button>
              </li>
            )}
            {projectStatus !== 'Archived' && (
              <li>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    updateStatus('Archived')
                  }}
                  disabled={updateMutation.isPending}
                >
                  Archive
                </button>
              </li>
            )}
            {projectStatus === 'Archived' && (
              <li>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    updateStatus('Active')
                  }}
                  disabled={updateMutation.isPending}
                >
                  Restore
                </button>
              </li>
            )}
            {onEdit && (
              <li>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(project)
                  }}
                >
                  Edit
                </button>
              </li>
            )}
            {onDelete && (
              <li>
                <button
                  type="button"
                  className="text-error"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(project.projectId)
                  }}
                >
                  Delete
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ProjectList({ onEdit, onCreate, filters }: ProjectListProps) {
  const { data: projects, isLoading, error } = useProjectsQuery(true, filters)
  const deleteMutation = useDeleteProjectMutation()
  const navigate = useNavigate()

  if (isLoading) {
    return <div className="text-center py-8">Loading projects...</div>
  }

  if (error) {
    return <ErrorState message="Failed to load projects" />
  }

  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create your first project to get started"
        action={onCreate ? <Button onClick={onCreate}>Create Project</Button> : undefined}
      />
    )
  }

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate(projectId)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Card
          key={project.projectId}
          className="border border-base-300 bg-base-100 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          role="link"
          tabIndex={0}
          onClick={() => navigate(`/projects/${project.projectId}`)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate(`/projects/${project.projectId}`)
            }
          }}
        >
          <div className="card-body gap-4 p-5">
            <div className="relative flex-1 pr-10">
              <div className="min-w-0">
                <h3 className="card-title text-lg">{project.name}</h3>
                {project.description && (
                  <p className="mt-2 text-sm text-base-content/70">{project.description}</p>
                )}
              </div>
              <ProjectCardActions project={project} onEdit={onEdit} onDelete={handleDelete} />
            </div>

            <div className="mt-auto space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-box bg-base-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-base-content/60">Start</p>
                  <p className="mt-1 font-medium">
                    {new Date(project.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-box bg-base-200 p-3">
                  <p className="text-xs uppercase tracking-wide text-base-content/60">End</p>
                  <p className="mt-1 font-medium">
                    {new Date(project.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <ProjectCardBadges project={project} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
