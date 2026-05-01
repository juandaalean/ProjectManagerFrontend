import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import type { TaskItem, CreateTaskRequest, UpdateTaskRequest } from '../types/task.types';
import { TaskPriorityValues, TaskStateValues } from '../types/task.types';
import type { CreateTaskFormData, UpdateTaskFormData } from '../schemas/taskSchema';
import { createTaskSchema, updateTaskSchema } from '../schemas/taskSchema';
import { useCreateTaskMutation, useUpdateTaskMutation } from '../hooks/useTaskMutations';
import { useAuth } from '../../auth/context/AuthContext';

interface TaskFormModalProps {
  task?: TaskItem;
  projectId?: string;
  onClose: () => void;
}

export function TaskFormModal({ task, projectId, onClose }: TaskFormModalProps) {
  const isEditing = !!task;
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTaskFormData | UpdateTaskFormData>({
    resolver: zodResolver(isEditing ? updateTaskSchema : createTaskSchema),
    defaultValues: task ? {
      title: task.title,
      description: task.description,
      priority: task.priority,
      state: task.state,
    } : {
      priority: 'Medium',
      assignedUserId: user?.userId || '',
    },
  });

  const onSubmit = (data: CreateTaskFormData | UpdateTaskFormData) => {
    if (isEditing && task) {
      updateMutation.mutate(
        { projectId: task.projectId, taskItemId: task.id, task: data as UpdateTaskRequest },
        {
          onSuccess: () => {
            reset();
            onClose();
          },
        }
      );
    } else {
      if (!projectId) {
        return;
      }
      if (!user?.userId) {
        return;
      }
      const createData = data as CreateTaskFormData;
      createMutation.mutate(
        { projectId, task: { ...createData, assignedUserId: user.userId } as CreateTaskRequest },
        {
          onSuccess: () => {
            reset();
            onClose();
          },
        }
      );
    }
  };

  const isSubmitDisabled = (!isEditing && (!projectId || !user?.userId)) || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit Task' : 'Create Task'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <input type="hidden" {...register('assignedUserId')} />
          )}
          <Input
            label="Title"
            {...register('title')}
            error={errors.title?.message}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              {...register('priority')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TaskPriorityValues.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            {errors.priority && (
              <p className="text-red-500 text-sm mt-1">{errors.priority.message}</p>
            )}
          </div>
          {isEditing && (
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <select
                {...register('state')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TaskStateValues.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {(errors as any).state && (
                <p className="text-red-500 text-sm mt-1">{(errors as any).state.message}</p>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
