export type TaskState = 'Active' | 'Finished' | 'Canceled';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export const TaskStateValues: readonly TaskState[] = ['Active', 'Finished', 'Canceled'];

export const TaskPriorityValues: readonly TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  priority: TaskPriority;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskRequest = {
  title: string;
  description: string;
  priority: TaskPriority;
  assignedUserId: string;
};

export type UpdateTaskRequest = {
  title?: string;
  description?: string;
  state?: TaskState;
  priority?: TaskPriority;
};
