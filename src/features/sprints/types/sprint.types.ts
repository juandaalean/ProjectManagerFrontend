import type { TaskItem } from '../../tasks/types/task.types'

export type SprintState = 'Planned' | 'Active' | 'Completed' | 'Canceled'

export const SprintStateValues: readonly SprintState[] = [
  'Planned',
  'Active',
  'Completed',
  'Canceled',
]

export type Sprint = {
  sprintId: string
  projectId: string
  name: string
  goal: string | null
  startDate: string
  endDate: string
  state: SprintState
}

export type SprintWithTasks = {
  sprint: Sprint | null
  tasks: TaskItem[]
}

export type CreateSprintRequest = {
  name: string
  goal?: string | null
  startDate: string
  endDate: string
}

export type UpdateSprintRequest = {
  name?: string
  goal?: string | null
  startDate?: string
  endDate?: string
  state?: SprintState
}

export type ListSprintsQuery = {
  searchTerm?: string
  startDateFrom?: string
  startDateTo?: string
  state?: SprintState
}
