import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasksApi';
import type { TaskItem } from '../types/task.types';

export function useTasksQuery(projectId?: string) {
  return useQuery<TaskItem[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.getTasks(projectId!),
    enabled: !!projectId,
  });
}

export function useTaskQuery(projectId: string, taskItemId: string) {
  return useQuery<TaskItem>({
    queryKey: ['tasks', projectId, taskItemId],
    queryFn: () => tasksApi.getTask(projectId, taskItemId),
    enabled: !!projectId && !!taskItemId,
  });
}
