import { useEffect, useState } from 'react';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const { data: tasks, isLoading, error } = useTasksQuery(projectId);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Task
        </Button>
      </div>
      <TaskList tasks={tasks || []} projectId={projectId} />
      {showCreateModal && (
        <TaskFormModal
          projectId={projectId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}