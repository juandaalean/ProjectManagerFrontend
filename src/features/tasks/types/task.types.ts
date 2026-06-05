export type TaskState = 'Active' | 'Finished' | 'Canceled'

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export const TaskStateValues: readonly TaskState[] = ['Active', 'Finished', 'Canceled']

export const TaskPriorityValues: readonly TaskPriority[] = ['Low', 'Medium', 'High', 'Critical']

export type TaskItem = {
  id: string
  title: string
  description: string | null
  state: TaskState
  priority: TaskPriority
  projectId: string
  assignedUserId: string
  createdAt: string
  startAt: string | null
  completedAt: string | null
  sprintId: string | null
}

export type ProjectTaskItemsGroup = {
  projectId: string
  projectName?: string
  tasks: TaskItem[]
}

export type CreateTaskRequest = {
  assignedUserId: string
  title: string
  description?: string
  priority: TaskPriority
  state?: TaskState
  startAt?: string | null
  completedAt?: string | null
  sprintId?: string | null
}

export type AssignTaskItemRequest = {
  assignedUserId: string
}

export type UpdateTaskRequest = {
  assignedUserId?: string
  title?: string
  description?: string
  state?: TaskState
  priority?: TaskPriority
  createdAt?: string
  startAt?: string | null
  completedAt?: string | null
  sprintId?: string | null
  clearStartAt?: boolean
  clearCompletedAt?: boolean
  clearSprint?: boolean
}

export type ListTaskItemsQuery = {
  searchTerm?: string
  taskState?: TaskState
  taskPriority?: TaskPriority
  assignedUser?: string
  sprintId?: string
}
