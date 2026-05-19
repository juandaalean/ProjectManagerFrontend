import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import type { TaskItem } from '../types/task.types';
import { useDeleteTaskMutation, useUpdateTaskMutation } from '../hooks/useTaskMutations';
import { TaskFormModal } from './TaskFormModal';

interface TaskListProps {
  tasks: TaskItem[];
  projectId?: string;
}

export function TaskList({ tasks, projectId }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const navigate = useNavigate();
  const deleteMutation = useDeleteTaskMutation();
  const updateMutation = useUpdateTaskMutation();

  const handleDelete = (task: TaskItem) => {
    const resolvedProjectId = task.projectId || projectId;

    if (!resolvedProjectId) {
      return;
    }
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate({ projectId: resolvedProjectId, taskItemId: task.id });
    }
  };

  const handleToggleState = (task: TaskItem) => {
    const resolvedProjectId = task.projectId || projectId;

    if (!resolvedProjectId) {
      return;
    }
    const newState = task.state === 'Active' ? 'Finished' : 'Active';
    updateMutation.mutate({ projectId: resolvedProjectId, taskItemId: task.id, task: { state: newState } });
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-box border border-base-300 bg-base-100 p-8 text-center">
        <p className="text-base-content/70">No tasks found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="border border-base-300 bg-base-100">
          <div className="card-body gap-4 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="card-title text-lg">{task.title}</h3>
                  <span className="badge badge-outline">{task.state}</span>
                  <span className="badge badge-outline">{task.priority}</span>
                </div>
                {task.description && (
                  <p className="mt-2 text-sm text-base-content/70">{task.description}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/projects/${task.projectId}/tasks/${task.id}`)}
                >
                  View
                </Button>
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
                  onClick={() => handleDelete(task)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
      {editingTask && (
        <TaskFormModal
          task={editingTask}
          projectId={editingTask.projectId || projectId}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
