import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { useAuth } from './useAuth'
import type { LoginRequest } from '../types/auth.types'

export function useLoginMutation() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data) => {
      login(data)
    },
  })
}
