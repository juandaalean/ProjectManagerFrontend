import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/projects', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200 shadow-lg backdrop-blur">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <AuthForm />
      </div>
    </div>
  )
}
