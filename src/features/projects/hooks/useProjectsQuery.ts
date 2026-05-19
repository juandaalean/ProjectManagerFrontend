import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '../api/projectsApi'

export function useProjectsQuery(enabled = true) {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
    enabled,
  })
}

export function useProjectQuery(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.getProject(projectId),
    enabled: !!projectId,
  })
}
