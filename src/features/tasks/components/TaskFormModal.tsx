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
  const editErrors = errors as typeof errors & {
    state?: {
      message?: string;
    }
  };

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
    <div className="modal modal-open">
      <Card className="modal-box w-full max-w-2xl border border-base-300 bg-base-100 p-0 shadow-xl">
        <div className="p-6">
        <h2 className="text-xl font-bold">
          {isEditing ? 'Edit Task' : 'Create Task'}
        </h2>
        <p className="mb-4 text-sm text-base-content/70">
          Fill in the task details and assign the right priority.
        </p>
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
            <label className="label">
              <span className="label-text font-semibold">Description</span>
            </label>
            <textarea
              {...register('description')}
              className="textarea textarea-bordered w-full"
              rows={3}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-error">{errors.description.message}</p>
            )}
          </div>
          <div>
            <label className="label">
              <span className="label-text font-semibold">Priority</span>
            </label>
            <select
              {...register('priority')}
              className="select select-bordered w-full"
            >
              {TaskPriorityValues.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            {errors.priority && (
              <p className="mt-1 text-sm text-error">{errors.priority.message}</p>
            )}
          </div>
          {isEditing && (
            <div>
              <label className="label">
                <span className="label-text font-semibold">State</span>
              </label>
              <select
                {...register('state')}
                className="select select-bordered w-full"
              >
                {TaskStateValues.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {editErrors.state && (
                <p className="mt-1 text-sm text-error">{editErrors.state.message}</p>
              )}
            </div>
          )}
          <div className="modal-action">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
        </div>
      </Card>
    </div>
  );
}
