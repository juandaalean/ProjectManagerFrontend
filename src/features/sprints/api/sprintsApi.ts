import { httpClient } from '../../../shared/api/httpClient'
import type { TaskItem } from '../../tasks/types/task.types'
import type {
  CreateSprintRequest,
  ListSprintsQuery,
  Sprint,
  SprintState,
  SprintWithTasks,
  UpdateSprintRequest,
} from '../types/sprint.types'

const sprintStateMap: readonly SprintState[] = ['Planned', 'Active', 'Completed', 'Canceled']

type ApiSprint = Omit<Sprint, 'state'> & {
  state?: number | SprintState | null
  sprintState?: number | SprintState | null
  status?: number | SprintState | null
}

type ApiTaskItem = {
  taskId: string
  title: string
  description: string | null
  taskState?: number
  state?: number
  taskPriority?: number
  priority?: number
  projectId: string
  assignedUserId: string
  createdAt?: string
  completedAt?: string | null
}

type ApiSprintTasksResponse = ApiTaskItem[] | { tasks?: ApiTaskItem[]; taskItems?: ApiTaskItem[] }

const resolveSprintState = (raw: unknown): SprintState => {
  if (typeof raw === 'number' && raw in sprintStateMap) {
    return sprintStateMap[raw]
  }
  if (typeof raw === 'string' && (sprintStateMap as readonly string[]).includes(raw)) {
    return raw as SprintState
  }
  return 'Planned'
}

const mapSprint = (sprint: ApiSprint | Sprint): Sprint => {
  if ('state' in sprint && typeof (sprint as Sprint).state === 'string') {
    return sprint as Sprint
  }

  const apiSprint = sprint as ApiSprint
  const state = resolveSprintState(
    apiSprint.state ?? apiSprint.sprintState ?? apiSprint.status ?? null,
  )

  return {
    sprintId: apiSprint.sprintId,
    projectId: apiSprint.projectId,
    name: apiSprint.name,
    goal: apiSprint.goal ?? null,
    startDate: apiSprint.startDate,
    endDate: apiSprint.endDate,
    state,
  }
}

const mapTask = (task: ApiTaskItem): TaskItem => {
  const stateIndex = typeof task.taskState === 'number' ? task.taskState : (task.state ?? 0)
  const priorityIndex =
    typeof task.taskPriority === 'number' ? task.taskPriority : (task.priority ?? 0)

  const stateMap = ['Active', 'Finished', 'Canceled'] as const
  const priorityMap = ['Low', 'Medium', 'High', 'Critical'] as const

  return {
    id: task.taskId,
    title: task.title,
    description: task.description,
    state: stateMap[stateIndex] ?? 'Active',
    priority: priorityMap[priorityIndex] ?? 'Low',
    projectId: task.projectId,
    assignedUserId: task.assignedUserId,
    createdAt: task.createdAt ?? '',
    completedAt: task.completedAt ?? null,
  }
}

const mapSprintTasks = (payload: ApiSprintTasksResponse) => {
  const tasks = Array.isArray(payload) ? payload : (payload.tasks ?? payload.taskItems ?? [])
  return tasks.map(mapTask)
}

const mapCreatePayload = (request: CreateSprintRequest) => ({
  name: request.name.trim(),
  goal: request.goal?.trim() || null,
  startDate: new Date(`${request.startDate}T00:00:00.000Z`).toISOString(),
  endDate: new Date(`${request.endDate}T00:00:00.000Z`).toISOString(),
})

const mapUpdatePayload = (request: UpdateSprintRequest) => {
  const payload: Record<string, unknown> = {}

  if (request.name !== undefined) {
    payload.name = request.name.trim()
  }
  if (request.goal !== undefined) {
    payload.goal = request.goal?.trim() || null
  }
  if (request.startDate !== undefined) {
    payload.startDate = new Date(`${request.startDate}T00:00:00.000Z`).toISOString()
  }
  if (request.endDate !== undefined) {
    payload.endDate = new Date(`${request.endDate}T00:00:00.000Z`).toISOString()
  }
  if (request.state !== undefined) {
    payload.state = sprintStateMap.indexOf(request.state)
  }

  return payload
}

export const sprintsApi = {
  async listSprints(projectId: string, query?: ListSprintsQuery): Promise<Sprint[]> {
    const params = new URLSearchParams()

    if (query?.searchTerm) {
      params.set('SearchTerm', query.searchTerm)
    }
    if (query?.startDateFrom) {
      params.set('StartDateFrom', new Date(`${query.startDateFrom}T00:00:00.000Z`).toISOString())
    }
    if (query?.startDateTo) {
      params.set('StartDateTo', new Date(`${query.startDateTo}T00:00:00.000Z`).toISOString())
    }
    if (query?.state) {
      params.set('State', String(sprintStateMap.indexOf(query.state)))
    }

    const qs = params.toString()
    const url = qs ? `/projects/${projectId}/sprints?${qs}` : `/projects/${projectId}/sprints`

    const response = await httpClient.get<ApiSprint[]>(url)
    return response.data.map(mapSprint)
  },

  async getSprint(projectId: string, sprintId: string): Promise<Sprint> {
    const response = await httpClient.get<ApiSprint>(`/projects/${projectId}/sprints/${sprintId}`)
    return mapSprint(response.data)
  },

  async getSprintTasks(projectId: string, sprintId: string): Promise<TaskItem[]> {
    const response = await httpClient.get<ApiSprintTasksResponse>(
      `/projects/${projectId}/sprints/${sprintId}/tasks`,
    )
    return mapSprintTasks(response.data)
  },

  async getSprintWithTasks(projectId: string, sprintId: string): Promise<SprintWithTasks> {
    const [sprint, tasks] = await Promise.all([
      sprintsApi.getSprint(projectId, sprintId),
      sprintsApi.getSprintTasks(projectId, sprintId),
    ])

    return { sprint, tasks }
  },

  async createSprint(projectId: string, request: CreateSprintRequest): Promise<Sprint> {
    const response = await httpClient.post<ApiSprint>(
      `/projects/${projectId}/sprints`,
      mapCreatePayload(request),
    )
    return mapSprint(response.data)
  },

  async updateSprint(
    projectId: string,
    sprintId: string,
    request: UpdateSprintRequest,
  ): Promise<Sprint> {
    const response = await httpClient.put<ApiSprint>(
      `/projects/${projectId}/sprints/${sprintId}`,
      mapUpdatePayload(request),
    )
    return mapSprint(response.data)
  },

  async deleteSprint(projectId: string, sprintId: string): Promise<void> {
    await httpClient.delete(`/projects/${projectId}/sprints/${sprintId}`)
  },

  async assignTaskToSprint(projectId: string, sprintId: string, taskItemId: string): Promise<void> {
    await httpClient.put(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskItemId}`)
  },

  async removeTaskFromSprint(
    projectId: string,
    sprintId: string,
    taskItemId: string,
  ): Promise<void> {
    await httpClient.delete(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskItemId}`)
  },
}
