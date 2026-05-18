export type TaskState = 'Active' | 'Finished' | 'Canceled';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export const TaskStateValues: readonly TaskState[] = ['Active', 'Finished', 'Canceled'];

export const TaskPriorityValues: readonly TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  state: TaskState;
  priority: TaskPriority;
  projectId: string;
  assignedUserId: string;
  createdAt: string;
  completedAt: string | null;
};

export type CreateTaskRequest = {
  assignedUserId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  state?: TaskState;
  completedAt?: string | null;
};

export type UpdateTaskRequest = {
  assignedUserId?: string;
  title?: string;
  description?: string;
  state?: TaskState;
  priority?: TaskPriority;
  createdAt?: string;
  completedAt?: string | null;
};
