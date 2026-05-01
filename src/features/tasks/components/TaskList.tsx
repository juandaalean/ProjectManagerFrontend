import { useState } from 'react';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import type { TaskItem, TaskState, TaskPriority } from '../types/task.types';
import { useDeleteTaskMutation, useUpdateTaskMutation } from '../hooks/useTaskMutations';
import { TaskFormModal } from './TaskFormModal';

interface TaskListProps {
  tasks: TaskItem[];
  projectId?: string;
}

export function TaskList({ tasks, projectId }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const deleteMutation = useDeleteTaskMutation();
  const updateMutation = useUpdateTaskMutation();

  const handleDelete = (id: string) => {
    if (!projectId) {
      return;
    }
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate({ projectId, taskItemId: id });
    }
  };

  const handleToggleState = (task: TaskItem) => {
    if (!projectId) {
      return;
    }
    const newState = task.state === 'Active' ? 'Finished' : 'Active';
    updateMutation.mutate({ projectId, taskItemId: task.id, task: { state: newState } });
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-orange-600';
      case 'Critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStateColor = (state: TaskState) => {
    switch (state) {
      case 'Active': return 'text-blue-600';
      case 'Finished': return 'text-green-600';
      case 'Canceled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tasks found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{task.title}</h3>
              {task.description && (
                <p className="text-gray-600 mt-1">{task.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-sm">
                <span className={getPriorityColor(task.priority)}>
                  Priority: {task.priority}
                </span>
                <span className={getStateColor(task.state)}>
                  State: {task.state}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggleState(task)}
              >
                {task.state === 'Active' ? 'Mark Finished' : 'Mark Active'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingTask(task)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(task.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
      {editingTask && (
        <TaskFormModal
          task={editingTask}
          projectId={projectId}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
