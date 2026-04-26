import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '../api/projectsApi'

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  })
}

export function useProjectQuery(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
  })
}
