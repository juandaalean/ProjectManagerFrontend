import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sprintsApi } from '../api/sprintsApi'
import type { CreateSprintRequest, Sprint, UpdateSprintRequest } from '../types/sprint.types'

export function useCreateSprintMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<Sprint, Error, CreateSprintRequest>({
    mutationFn: (request) => sprintsApi.createSprint(projectId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
    },
  })
}

export function useUpdateSprintMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<Sprint, Error, { sprintId: string; request: UpdateSprintRequest }>({
    mutationFn: ({ sprintId, request }) => sprintsApi.updateSprint(projectId, sprintId, request),
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
      queryClient.invalidateQueries({
        queryKey: ['sprint-with-tasks', projectId, sprint.sprintId],
      })
    },
  })
}

export function useDeleteSprintMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (sprintId) => sprintsApi.deleteSprint(projectId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] })
    },
  })
}

export function useAssignTaskToSprintMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { taskItemId: string; sprintId: string }>({
    mutationFn: (params) => {
      const { taskItemId, sprintId } = params
      return sprintsApi.assignTaskToSprint(projectId, sprintId, taskItemId)
    },
    onSuccess: (_data, { sprintId }) => {
      queryClient.refetchQueries({ queryKey: ['sprint-with-tasks', projectId, sprintId] })
      queryClient.refetchQueries({ queryKey: ['tasks', projectId] })
    },
  })
}

export function useRemoveTaskFromSprintMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { taskItemId: string; sprintId: string }>({
    mutationFn: (params) => {
      const { taskItemId, sprintId } = params
      return sprintsApi.removeTaskFromSprint(projectId, sprintId, taskItemId)
    },
    onSuccess: (_data, { sprintId }) => {
      queryClient.refetchQueries({ queryKey: ['sprint-with-tasks', projectId, sprintId] })
      queryClient.refetchQueries({ queryKey: ['tasks', projectId] })
    },
  })
}
