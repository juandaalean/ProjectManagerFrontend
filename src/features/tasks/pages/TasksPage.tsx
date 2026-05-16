import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { TaskList } from '../components/TaskList';
import { TaskFormModal } from '../components/TaskFormModal';
import { useTasksQuery } from '../hooks/useTasksQuery';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { EmptyState } from '../../../shared/ui/EmptyState';

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: tasks, isLoading, error } = useTasksQuery(projectId);
  const showCreateModal = searchParams.get('create') === '1';

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose a project to view or create tasks"
        action={
          <Button onClick={() => navigate('/projects')}>Go to Projects</Button>
        }
      />
    );
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  return (
    <div className="space-y-6">
      <div className="hero rounded-box bg-base-100 shadow-sm">
        <div className="hero-content flex-col items-start gap-4 p-6 lg:flex-row lg:justify-between">
          <div>
            <div className="badge badge-secondary badge-outline mb-3">Tasks</div>
            <h1 className="text-3xl font-bold tracking-tight">Task board</h1>
            <p className="max-w-2xl text-base-content/70">
              Track work items by priority and state in a cleaner dashboard surface.
            </p>
          </div>
          <Button onClick={() => navigate(`/projects/${projectId}/tasks?create=1`)}>
            Create Task
          </Button>
        </div>
      </div>
      <TaskList tasks={tasks || []} projectId={projectId} />
      {showCreateModal && (
        <TaskFormModal
          projectId={projectId}
          onClose={() => navigate(`/projects/${projectId}/tasks`, { replace: true })}
        />
      )}
    </div>
  );
}