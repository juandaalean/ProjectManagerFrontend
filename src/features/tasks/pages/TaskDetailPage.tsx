import { useParams } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { useTaskQuery } from '../hooks/useTasksQuery';
import { ErrorState } from '../../../shared/ui/ErrorState';
import type { TaskState, TaskPriority } from '../types/task.types';

export function TaskDetailPage() {
  const { projectId, taskItemId } = useParams<{ projectId: string; taskItemId: string }>();
  const { data: task, isLoading, error } = useTaskQuery(projectId!, taskItemId!);

  if (isLoading) {
    return <div className="text-center py-8">Loading task...</div>;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!task) {
    return <div className="text-center py-8">Task not found.</div>;
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="text-gray-600">{task.description || 'No description provided.'}</p>
          </div>
          <div className="flex gap-4">
            <span className={getPriorityColor(task.priority)}>
              Priority: {task.priority}
            </span>
            <span className={getStateColor(task.state)}>
              State: {task.state}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Created: {new Date(task.createdAt).toLocaleDateString()}
            {task.updatedAt !== task.createdAt && (
              <> | Updated: {new Date(task.updatedAt).toLocaleDateString()}</>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}