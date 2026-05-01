import { httpClient } from '../../../shared/api/httpClient';
import type { TaskItem, CreateTaskRequest, UpdateTaskRequest } from '../types/task.types';

type ApiTask = {
  taskId: string;
  title: string;
  description: string;
  taskState: number;
  taskPriority: number;
  projectId: string;
  assignedUserId: string;
  createdAt?: string;
  updatedAt?: string;
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
  createdAt: task.createdAt ?? '',
  updatedAt: task.updatedAt ?? '',
});

const mapCreateTaskRequest = (task: CreateTaskRequest) => ({
  title: task.title,
  description: task.description,
  taskPriority: taskPriorityMap.indexOf(task.priority),
  assignedUserId: task.assignedUserId,
});

const mapUpdateTaskRequest = (task: UpdateTaskRequest) => ({
  ...(task.title !== undefined && { title: task.title }),
  ...(task.description !== undefined && { description: task.description }),
  ...(task.state !== undefined && { taskState: taskStateMap.indexOf(task.state) }),
  ...(task.priority !== undefined && { taskPriority: taskPriorityMap.indexOf(task.priority) }),
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
    const response = await httpClient.post<TaskItem>(
      `/projects/${projectId}/tasks`,
      mapCreateTaskRequest(task)
    );
    return response.data;
  },

  updateTask: async (
    projectId: string,
    taskItemId: string,
    task: UpdateTaskRequest
  ): Promise<TaskItem> => {
    const response = await httpClient.put<TaskItem>(
      `/projects/${projectId}/tasks/${taskItemId}`,
      mapUpdateTaskRequest(task)
    );
    return response.data;
  },

  deleteTask: async (projectId: string, taskItemId: string): Promise<void> => {
    await httpClient.delete(`/projects/${projectId}/tasks/${taskItemId}`);
  },
};
