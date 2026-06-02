import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '../api/tasksApi'
import type { ListTaskItemsQuery, ProjectTaskItemsGroup, TaskItem } from '../types/task.types'

export function useTasksQuery(projectId?: string, query?: ListTaskItemsQuery) {
  return useQuery<TaskItem[]>({
    queryKey: ['tasks', projectId, query ?? {}],
    queryFn: () => tasksApi.getTasks(projectId!, query),
    enabled: !!projectId,
  })
}

export function useTasksByProjectsQuery(projectIds?: string[], query?: ListTaskItemsQuery) {
  return useQuery<ProjectTaskItemsGroup[]>({
    queryKey: ['tasks', 'by-projects', ...(projectIds ?? []), query ?? {}],
    queryFn: () => tasksApi.getTasksByProjects(projectIds ?? [], query),
    enabled: !!projectIds && projectIds.length > 0,
  })
}

export function useTaskQuery(projectId: string, taskItemId: string) {
  return useQuery<TaskItem>({
    queryKey: ['tasks', projectId, taskItemId],
    queryFn: () => tasksApi.getTask(projectId, taskItemId),
    enabled: !!projectId && !!taskItemId,
  })
}
