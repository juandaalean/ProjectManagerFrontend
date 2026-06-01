import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '../api/projectsApi'
import type { ListProjectsQuery } from '../types/project.types'

export function useProjectsQuery(enabled = true, query?: ListProjectsQuery) {
  return useQuery({
    queryKey: ['projects', query ?? {}],
    queryFn: () => projectsApi.getProjects(query),
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
