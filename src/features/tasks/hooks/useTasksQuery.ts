import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '../api/tasksApi'
import type { ProjectTaskItemsGroup, TaskItem } from '../types/task.types'

export function useTasksQuery(projectId?: string) {
  return useQuery<TaskItem[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.getTasks(projectId!),
    enabled: !!projectId,
  })
}

export function useTasksByProjectsQuery(projectIds?: string[]) {
  return useQuery<ProjectTaskItemsGroup[]>({
    queryKey: ['tasks', 'by-projects', ...(projectIds ?? [])],
    queryFn: () => tasksApi.getTasksByProjects(projectIds ?? []),
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
