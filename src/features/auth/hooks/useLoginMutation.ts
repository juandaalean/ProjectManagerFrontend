import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { useAuth } from './useAuth'
import type { LoginRequest } from '../types/auth.types'

export function useLoginMutation() {
  const { login } = useAuth()

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (data, variables) => {
      // TODO: Update when API provides user data
      const mockUser = {
        id: '1',
        name: 'User',
        email: variables.email,
      }
      login(data.accessToken, mockUser)
    },
  })
}
