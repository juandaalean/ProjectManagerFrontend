import { useNavigate, useParams } from 'react-router-dom'
import { useProjectQuery } from '../hooks/useProjectsQuery'
import { Card } from '../../../shared/ui/Card'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { Button } from '../../../shared/ui/Button'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading, error } = useProjectQuery(projectId!)

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
            <div className="badge badge-primary badge-outline mb-3">Project detail</div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="mt-2 max-w-2xl text-base-content/70">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${project.projectId}/tasks`)}
            >
              View Tasks
            </Button>
            <Button
              onClick={() => navigate(`/projects/${project.projectId}/tasks?create=1`)}
            >
              Add Task
            </Button>
          </div>
        </div>
      </div>

      <Card className="border border-base-300 bg-base-100">
        <div className="card-body grid gap-4 md:grid-cols-2 p-6">
          <div className="rounded-box bg-base-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Start Date</h3>
            <p className="mt-2 text-base">{new Date(project.startDate).toLocaleDateString()}</p>
          </div>
          <div className="rounded-box bg-base-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide">End Date</h3>
            <p className="mt-2 text-base">{new Date(project.endDate).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
