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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card key={project.projectId} className="p-4">
          <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
          {project.description && (
            <p className="text-gray-600 mb-3">{project.description}</p>
          )}
          <div className="text-sm text-gray-500 mb-4">
            <p>Start: {new Date(project.startDate).toLocaleDateString()}</p>
            <p>End: {new Date(project.endDate).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
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
        </Card>
      ))}
    </div>
  )
}
