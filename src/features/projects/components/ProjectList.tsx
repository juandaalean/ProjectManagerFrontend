import { useNavigate } from 'react-router-dom'
import { useProjectsQuery } from '../hooks/useProjectsQuery'
import { useDeleteProjectMutation } from '../hooks/useProjectMutations'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { EmptyState } from '../../../shared/ui/EmptyState'
import { ErrorState } from '../../../shared/ui/ErrorState'
import type { Project } from '../types/project.types'

interface ProjectListProps {
  onEdit?: (project: Project) => void
  onCreate?: () => void
}

export function ProjectList({ onEdit, onCreate }: ProjectListProps) {
  const { data: projects, isLoading, error } = useProjectsQuery()
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
        action={
          onCreate ? (
            <Button onClick={onCreate}>Create Project</Button>
          ) : undefined
        }
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
        <Card key={project.projectId} className="border border-base-300 bg-base-100">
          <div className="card-body gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="card-title text-lg">{project.name}</h3>
                {project.description && (
                  <p className="mt-2 text-sm text-base-content/70">{project.description}</p>
                )}
              </div>
              <div className="badge badge-ghost">Project</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-box bg-base-200 p-3">
                <p className="text-xs uppercase tracking-wide text-base-content/60">Start</p>
                <p className="mt-1 font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              <div className="rounded-box bg-base-200 p-3">
                <p className="text-xs uppercase tracking-wide text-base-content/60">End</p>
                <p className="mt-1 font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="card-actions justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/projects/${project.projectId}/tasks`)}
              >
                View Tasks
              </Button>
              {onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(project)}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(project.projectId)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
