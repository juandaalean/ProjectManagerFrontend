import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useProjectQuery } from '../hooks/useProjectsQuery'
import { Card } from '../../../shared/ui/Card'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { Button } from '../../../shared/ui/Button'
import { useTasksQuery } from '../../tasks/hooks/useTasksQuery'
import { ProjectTaskCalendar } from '../components/ProjectTaskCalendar'
import { ProjectMembersSection } from '../components/ProjectMembersSection'
import { useAuth } from '../../auth/context/AuthContext'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: project, isLoading, error } = useProjectQuery(projectId!)
  const { data: tasks = [] } = useTasksQuery(projectId)
  const { user } = useAuth()
  const isOwner = !!project && !!user && project.ownerId === user.userId
  const viewMode = searchParams.get('view') === 'overview' ? 'overview' : 'calendar'

  const viewButtons = [
    { id: 'calendar' as const, label: 'Calendar' },
    { id: 'overview' as const, label: 'Overview' },
  ]

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
              {isOwner && <div className="badge badge-accent text-accent-content mb-3">Owner</div>}
            </div>
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
            <Button onClick={() => navigate(`/projects/${project.projectId}/tasks?create=1`)}>
              Add Task
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {viewButtons.map((button) => (
            <Button
              key={button.id}
              variant={viewMode === button.id ? 'primary' : 'secondary'}
              onClick={() => {
                if (button.id === 'overview') {
                  setSearchParams({ view: 'overview' })
                  return
                }

                setSearchParams({})
              }}
            >
              {button.label}
            </Button>
          ))}
        </div>
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
            </div>
          </Card>

          <ProjectMembersSection projectId={project.projectId} />
        </div>
      ) : (
        <ProjectTaskCalendar projectId={project.projectId} tasks={tasks} />
      )}
    </div>
  )
}
