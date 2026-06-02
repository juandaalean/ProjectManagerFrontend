import { useQuery } from '@tanstack/react-query'
import { sprintsApi } from '../api/sprintsApi'
import type { ListSprintsQuery, Sprint, SprintWithTasks } from '../types/sprint.types'

export function useSprintsQuery(
  projectId?: string,
  query?: ListSprintsQuery,
) {
  return useQuery<Sprint[]>({
    queryKey: ['sprints', projectId, query ?? {}],
    queryFn: () => sprintsApi.listSprints(projectId!, query),
    enabled: !!projectId,
  })
}

export function useSprintWithTasksQuery(projectId?: string, sprintId?: string) {
  return useQuery<SprintWithTasks>({
    queryKey: ['sprint-with-tasks', projectId, sprintId],
    queryFn: () => sprintsApi.getSprintWithTasks(projectId!, sprintId!),
    enabled: !!projectId && !!sprintId,
  })
}
