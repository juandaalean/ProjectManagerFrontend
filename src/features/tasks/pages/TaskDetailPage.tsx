import { useParams } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { useTaskQuery } from '../hooks/useTasksQuery';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { CommentsList } from '../../comments/components/CommentsList';
import { useMemo } from 'react';
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery';
import { getTaskPriorityBadgeClassName, getTaskStateBadgeClassName } from '../utils/taskBadge';

export function TaskDetailPage() {
  const { projectId, taskItemId } = useParams<{ projectId: string; taskItemId: string }>();
  const { data: task, isLoading, error } = useTaskQuery(projectId!, taskItemId!);
  const { data: projectMembers = [] } = useProjectMembersQuery(projectId!);

  const assigneeName = useMemo(() => {
    if (!task) {
      return '';
    }

    return projectMembers.find((member) => member.userId === task.assignedUserId)?.userName ?? task.assignedUserId;
  }, [projectMembers, task]);

  if (isLoading) {
    return <div className="text-center py-8">Loading task...</div>;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!task) {
    return <div className="text-center py-8">Task not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-box bg-base-100 p-6 shadow-sm">
        <div>
          <div className="badge badge-secondary badge-outline mb-3">Task detail</div>
          <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
        </div>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>
      <Card className="border border-base-300 bg-base-100">
        <div className="card-body space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="text-base-content/70">{task.description || 'No description provided.'}</p>
          </div>
          <div className="flex gap-4">
            <span className={getTaskPriorityBadgeClassName(task.priority)}>Priority: {task.priority}</span>
            <span className={getTaskStateBadgeClassName(task.state)}>State: {task.state}</span>
          </div>
          <div className="text-sm text-base-content/70">
            Assigned to: <span className="font-semibold text-base-content">{assigneeName}</span>
          </div>
          <div className="text-sm text-base-content/60">
            Created: {new Date(task.createdAt).toLocaleDateString()}
            {task.completedAt && (
              <> | Completed: {new Date(task.completedAt).toLocaleDateString()}</>
            )}
          </div>
        </div>
      </Card>
      <CommentsList projectId={projectId!} taskItemId={taskItemId!} />
    </div>
  );
}