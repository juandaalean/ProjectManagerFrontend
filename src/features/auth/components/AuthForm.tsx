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
    <div className="max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' ? 'Login' : 'Register'}
      </h2>

      <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'register' && (
          <Input
            label="Name"
            type="text"
            {...registerForm.register('name')}
            error={registerForm.formState.errors.name?.message}
          />
        )}

        <Input
          label="Email"
          type="email"
          {...(mode === 'login' ? loginForm.register('email') : registerForm.register('email'))}
          error={(mode === 'login' ? loginForm.formState.errors.email?.message : registerForm.formState.errors.email?.message)}
        />

        <Input
          label="Password"
          type="password"
          {...(mode === 'login' ? loginForm.register('password') : registerForm.register('password'))}
          error={(mode === 'login' ? loginForm.formState.errors.password?.message : registerForm.formState.errors.password?.message)}
        />

        {mode === 'register' && (
          <Input
            label="Confirm Password"
            type="password"
            {...registerForm.register('confirmPassword')}
            error={registerForm.formState.errors.confirmPassword?.message}
          />
        )}

        <Button
          type="submit"
          disabled={currentMutation.isPending}
          className="w-full"
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

      <p className="text-center mt-4">
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
        <button
          type="button"
          onClick={toggleMode}
          className="text-blue-500 hover:text-blue-700 ml-1"
        >
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  )
}
