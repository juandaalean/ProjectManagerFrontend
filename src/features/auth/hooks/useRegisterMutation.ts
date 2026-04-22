import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { useAuth } from './useAuth'
import type { RegisterRequest } from '../types/auth.types'

export function useRegisterMutation() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authApi.register(userData),
    onSuccess: (data, variables) => {
      // Assuming the API returns token and user info, but currently only token
      // For now, store token and create user from registration data
      const user = {
        id: '1', // TODO: Get from API
        name: variables.name,
        email: variables.email,
      }
      login(data.accessToken, user)
    },
  })
}
