import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '../schemas/loginSchema'
import { registerSchema, type RegisterFormData } from '../schemas/registerSchema'
import { useLoginMutation } from '../hooks/useLoginMutation'
import { useRegisterMutation } from '../hooks/useRegisterMutation'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'

type AuthMode = 'login' | 'register'

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('login')

  const loginMutation = useLoginMutation()
  const registerMutation = useRegisterMutation()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const currentForm = mode === 'login' ? loginForm : registerForm
  const currentMutation = mode === 'login' ? loginMutation : registerMutation

  const onSubmit = (data: LoginFormData | RegisterFormData) => {
    if (mode === 'login') {
      loginMutation.mutate(data as LoginFormData)
    } else {
      registerMutation.mutate(data as RegisterFormData)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {mode === 'login' ? 'Login' : 'Register'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {mode === 'login'
            ? 'Accede a tus proyectos, tareas y comentarios desde un panel limpio y rápido.'
            : 'Crea tu acceso para empezar a organizar el trabajo del equipo.'}
        </p>
      </div>

      <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-5">
        {mode === 'register' && (
          <Input
            id="name"
            label="Name"
            type="text"
            {...registerForm.register('name')}
            error={registerForm.formState.errors.name?.message}
          />
        )}

        <Input
          label="Email"
          id="email"
          type="email"
          icon={(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25"
              />
            </svg>
          )}
          {...(mode === 'login' ? loginForm.register('email') : registerForm.register('email'))}
          error={(mode === 'login' ? loginForm.formState.errors.email?.message : registerForm.formState.errors.email?.message)}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          {...(mode === 'login' ? loginForm.register('password') : registerForm.register('password'))}
          error={(mode === 'login' ? loginForm.formState.errors.password?.message : registerForm.formState.errors.password?.message)}
        />

        {mode === 'register' && (
          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            {...registerForm.register('confirmPassword')}
            error={registerForm.formState.errors.confirmPassword?.message}
          />
        )}

        <Button
          type="submit"
          disabled={currentMutation.isPending}
          className="w-full rounded-2xl py-3"
        >
          {currentMutation.isPending
            ? 'Loading...'
            : mode === 'login'
            ? 'Login'
            : 'Register'}
        </Button>

        {currentMutation.isError && (
          <p className="text-red-500 text-sm text-center">
            {currentMutation.error?.message || 'An error occurred'}
          </p>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
        <button
          type="button"
          onClick={toggleMode}
          className="ml-1 font-semibold text-sky-600 transition hover:text-sky-700"
        >
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  )
}
