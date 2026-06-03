import { httpClient } from '../../../shared/api/httpClient'
import type {
  TaskItem,
  ProjectTaskItemsGroup,
  CreateTaskRequest,
  AssignTaskItemRequest,
  UpdateTaskRequest,
  ListTaskItemsQuery,
} from '../types/task.types'

type ApiTask = {
  taskId: string
  title: string
  description: string | null
  taskState: number
  taskPriority: number
  projectId: string
  assignedUserId: string
  createdAt?: string
  completedAt?: string | null
}

type ApiProjectTaskItemsGroup = {
  projectId: string
  projectName?: string
  taskItems?: ApiTask[]
  tasks?: ApiTask[]
}

const taskStateMap = ['Active', 'Finished', 'Canceled'] as const
const taskPriorityMap = ['Low', 'Medium', 'High', 'Critical'] as const

const mapTask = (task: ApiTask): TaskItem => ({
  id: task.taskId,
  title: task.title,
  description: task.description,
  state: taskStateMap[task.taskState] ?? 'Active',
  priority: taskPriorityMap[task.taskPriority] ?? 'Low',
  projectId: task.projectId,
  assignedUserId: task.assignedUserId,
  createdAt: task.createdAt ?? '',
  completedAt: task.completedAt ?? null,
})

const mapProjectTaskItemsGroup = (group: ApiProjectTaskItemsGroup): ProjectTaskItemsGroup => ({
  projectId: group.projectId,
  projectName: group.projectName,
  tasks: (group.taskItems ?? group.tasks ?? []).map(mapTask),
})

const mapCreateTaskRequest = (task: CreateTaskRequest) => ({
  assignedUserId: task.assignedUserId,
  title: task.title,
  description: task.description,
  taskPriority: taskPriorityMap.indexOf(task.priority),
  taskState:
    task.state !== undefined ? taskStateMap.indexOf(task.state) : taskStateMap.indexOf('Active'),
  completedAt: task.completedAt ?? null,
})

const mapUpdateTaskRequest = (task: UpdateTaskRequest) => ({
  ...(task.title !== undefined && { title: task.title }),
  ...(task.description !== undefined && { description: task.description }),
  ...(task.state !== undefined && { taskState: taskStateMap.indexOf(task.state) }),
  ...(task.priority !== undefined && { taskPriority: taskPriorityMap.indexOf(task.priority) }),
  ...(task.createdAt !== undefined && { createdAt: task.createdAt }),
  ...(task.completedAt !== undefined && { completedAt: task.completedAt }),
  ...(task.clearCompletedAt !== undefined && { clearCompletedAt: task.clearCompletedAt }),
})

const mapAssignTaskItemRequest = (payload: AssignTaskItemRequest) => ({
  assignedUserId: payload.assignedUserId,
})

export const tasksApi = {
  getTasks: async (projectId: string, query?: ListTaskItemsQuery): Promise<TaskItem[]> => {
    const params = new URLSearchParams()
    if (query?.searchTerm) params.append('searchTerm', query.searchTerm)
    if (query?.taskState) params.append('taskState', query.taskState)
    if (query?.taskPriority) params.append('taskPriority', query.taskPriority)
    if (query?.assignedUser) params.append('assignedUser', query.assignedUser)
    if (query?.sprintId) params.append('sprintId', query.sprintId)
    const qs = params.toString()
    const response = await httpClient.get<ApiTask[]>(
      `/projects/${projectId}/tasks${qs ? '?' + qs : ''}`,
    )
    return response.data.map(mapTask)
  },

  getTasksByProjects: async (
    projectIds: string[],
    query?: ListTaskItemsQuery,
  ): Promise<ProjectTaskItemsGroup[]> => {
    const params = new URLSearchParams()

    projectIds.forEach((projectId) => {
      params.append('projectIds', projectId)
    })

    if (query?.searchTerm) params.append('searchTerm', query.searchTerm)
    if (query?.taskState) params.append('taskState', query.taskState)
    if (query?.taskPriority) params.append('taskPriority', query.taskPriority)
    if (query?.assignedUser) params.append('assignedUser', query.assignedUser)
    if (query?.sprintId) params.append('sprintId', query.sprintId)

    const response = await httpClient.get<ApiProjectTaskItemsGroup[]>(
      `/task-items/by-projects?${params.toString()}`,
    )

    return response.data.map(mapProjectTaskItemsGroup)
  },

  getTask: async (projectId: string, taskItemId: string): Promise<TaskItem> => {
    const response = await httpClient.get<ApiTask>(`/projects/${projectId}/tasks/${taskItemId}`)
    return mapTask(response.data)
  },

  createTask: async (projectId: string, task: CreateTaskRequest): Promise<TaskItem> => {
    const response = await httpClient.post<ApiTask>(
      `/projects/${projectId}/tasks`,
      mapCreateTaskRequest(task),
    )
    return mapTask(response.data)
  },

  updateTask: async (
    projectId: string,
    taskItemId: string,
    task: UpdateTaskRequest,
  ): Promise<TaskItem> => {
    const response = await httpClient.put<ApiTask>(
      `/projects/${projectId}/tasks/${taskItemId}`,
      mapUpdateTaskRequest(task),
    )
    return mapTask(response.data)
  },

  assignTaskAssignee: async (
    projectId: string,
    taskItemId: string,
    payload: AssignTaskItemRequest,
  ): Promise<TaskItem> => {
    const response = await httpClient.put<ApiTask>(
      `/projects/${projectId}/tasks/${taskItemId}/assignee`,
      mapAssignTaskItemRequest(payload),
    )
    return mapTask(response.data)
  },

  deleteTask: async (projectId: string, taskItemId: string): Promise<void> => {
    await httpClient.delete(`/projects/${projectId}/tasks/${taskItemId}`)
  },
}
