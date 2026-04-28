import { useParams } from 'react-router-dom'
import { useProjectQuery } from '../hooks/useProjectsQuery'
import { Card } from '../../../shared/ui/Card'
import { ErrorState } from '../../../shared/ui/ErrorState'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, error } = useProjectQuery(projectId!)

  if (isLoading) {
    return <div className="text-center py-8">Loading project...</div>
  }

  if (error || !project) {
    return <ErrorState message="Failed to load project" />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">{project.name}</h1>
        {project.description && (
          <p className="text-gray-600 mb-4">{project.description}</p>
        )}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold">Start Date</h3>
            <p>{new Date(project.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="font-semibold">End Date</h3>
            <p>{new Date(project.endDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Tasks</h2>
          <p className="text-gray-500">Tasks will be displayed here (Phase C)</p>
        </div>
      </Card>
    </div>
  )
}
