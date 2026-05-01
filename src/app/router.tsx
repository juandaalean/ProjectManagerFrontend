import { Navigate, Routes, Route } from 'react-router-dom'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { ProjectsPage } from '../features/projects/pages/ProjectsPage'
import { ProjectDetailPage } from '../features/projects/pages/ProjectDetailPage'
import { TasksPage } from '../features/tasks/pages/TasksPage'
import { TaskDetailPage } from '../features/tasks/pages/TaskDetailPage'
import { AuthLayout } from '../layouts/AuthLayout'
import { AppLayout } from '../layouts/AppLayout'
import { PrivateRoute } from './PrivateRoute'

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />

      {/* Protected routes */}
      <Route path="/projects" element={
        <PrivateRoute>
          <AppLayout>
            <ProjectsPage />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/projects/:projectId" element={
        <PrivateRoute>
          <AppLayout>
            <ProjectDetailPage />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/tasks" element={
        <PrivateRoute>
          <AppLayout>
            <TasksPage />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/projects/:projectId/tasks" element={
        <PrivateRoute>
          <AppLayout>
            <TasksPage />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/projects/:projectId/tasks/:taskItemId" element={
        <PrivateRoute>
          <AppLayout>
            <TaskDetailPage />
          </AppLayout>
        </PrivateRoute>
      } />

      {/* Redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
