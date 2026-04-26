import { httpClient } from '../../../shared/api/httpClient'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth.types'

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await httpClient.post<AuthResponse>('/auth/register', userData)
    return response.data
  },
}
