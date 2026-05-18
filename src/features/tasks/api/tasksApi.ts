import { httpClient } from '../../../shared/api/httpClient';
import type { TaskItem, CreateTaskRequest, UpdateTaskRequest } from '../types/task.types';

type ApiTask = {
  taskId: string;
  title: string;
  description: string | null;
  taskState: number;
  taskPriority: number;
  projectId: string;
  assignedUserId: string;
  createdAt?: string;
  completedAt?: string | null;
};

const taskStateMap = ['Active', 'Finished', 'Canceled'] as const;
const taskPriorityMap = ['Low', 'Medium', 'High', 'Critical'] as const;

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
});

const mapCreateTaskRequest = (task: CreateTaskRequest) => ({
  assignedUserId: task.assignedUserId,
  title: task.title,
  description: task.description,
  taskPriority: taskPriorityMap.indexOf(task.priority),
  taskState: task.state !== undefined ? taskStateMap.indexOf(task.state) : taskStateMap.indexOf('Active'),
  completedAt: task.completedAt ?? null,
});

const mapUpdateTaskRequest = (task: UpdateTaskRequest) => ({
  ...(task.assignedUserId !== undefined && { assignedUserId: task.assignedUserId }),
  ...(task.title !== undefined && { title: task.title }),
  ...(task.description !== undefined && { description: task.description }),
  ...(task.state !== undefined && { taskState: taskStateMap.indexOf(task.state) }),
  ...(task.priority !== undefined && { taskPriority: taskPriorityMap.indexOf(task.priority) }),
  ...(task.createdAt !== undefined && { createdAt: task.createdAt }),
  ...(task.completedAt !== undefined && { completedAt: task.completedAt }),
});

export const tasksApi = {
  getTasks: async (projectId: string): Promise<TaskItem[]> => {
  const response = await httpClient.get<ApiTask[]>(`/projects/${projectId}/tasks`);
  return response.data.map(mapTask);
},

getTask: async (projectId: string, taskItemId: string): Promise<TaskItem> => {
  const response = await httpClient.get<ApiTask>(
    `/projects/${projectId}/tasks/${taskItemId}`
  );
  return mapTask(response.data);
},

  createTask: async (projectId: string, task: CreateTaskRequest): Promise<TaskItem> => {
    const response = await httpClient.post<ApiTask>(
      `/projects/${projectId}/tasks`,
      mapCreateTaskRequest(task)
    );
    return mapTask(response.data);
  },

  updateTask: async (
    projectId: string,
    taskItemId: string,
    task: UpdateTaskRequest
  ): Promise<TaskItem> => {
    const response = await httpClient.put<ApiTask>(
      `/projects/${projectId}/tasks/${taskItemId}`,
      mapUpdateTaskRequest(task)
    );
    return mapTask(response.data);
  },

  deleteTask: async (projectId: string, taskItemId: string): Promise<void> => {
    await httpClient.delete(`/projects/${projectId}/tasks/${taskItemId}`);
  },
};
