import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { useAuth } from './useAuth'
import type { RegisterRequest } from '../types/auth.types'

export function useRegisterMutation() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authApi.register(userData),
    onSuccess: (data) => {
      login(data)
    },
  })
}
