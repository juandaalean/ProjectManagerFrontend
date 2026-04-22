import { Routes, Route } from 'react-router-dom'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { ProjectsPage } from '../features/projects/pages/ProjectsPage'
import { ProjectDetailPage } from '../features/projects/pages/ProjectDetailPage'
import { AuthLayout } from '../layouts/AuthLayout'
import { AppLayout } from '../layouts/AppLayout'
import { PrivateRoute } from './PrivateRoute'

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />

      {/* Protected routes */}
      <Route path="/" element={
        <PrivateRoute>
          <AppLayout>
            <ProjectsPage />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/projects" element={
        <PrivateRoute>
          <AppLayout>
            <ProjectsPage />
          </AppLayout>
        </PrivateRoute>
      } />
      <Route path="/projects/:id" element={
        <PrivateRoute>
          <AppLayout>
            <ProjectDetailPage />
          </AppLayout>
        </PrivateRoute>
      } />

      {/* Redirect unknown routes to home */}
      <Route path="*" element={<PrivateRoute><AppLayout><ProjectsPage /></AppLayout></PrivateRoute>} />
    </Routes>
  )
}
