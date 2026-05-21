import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasksApi'
import type { CreateTaskRequest, UpdateTaskRequest, TaskItem } from '../types/task.types'

export function useCreateTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation<TaskItem, Error, { projectId: string; task: CreateTaskRequest }>({
    mutationFn: ({ projectId, task }) => tasksApi.createTask(projectId, task),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', newTask.projectId] })
    },
  })
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    TaskItem,
    Error,
    { projectId: string; taskItemId: string; task: UpdateTaskRequest }
  >({
    mutationFn: async ({ projectId, taskItemId, task }) => {
      const { assignedUserId, ...updateTask } = task

      let updatedTask: TaskItem | null = null

      if (Object.keys(updateTask).length > 0) {
        updatedTask = await tasksApi.updateTask(projectId, taskItemId, updateTask)
      }

      if (assignedUserId !== undefined) {
        updatedTask = await tasksApi.assignTaskAssignee(projectId, taskItemId, { assignedUserId })
      }

      if (!updatedTask) {
        throw new Error('At least one task field must be provided for update')
      }

      return updatedTask
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.projectId, updatedTask.id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.projectId] })
    },
  })
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { projectId: string; taskItemId: string }>({
    mutationFn: ({ projectId, taskItemId }) => tasksApi.deleteTask(projectId, taskItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
