import { httpClient } from '../../../shared/api/httpClient'
import type { AuthToken, LoginRequest, RegisterRequest } from '../types/auth.types'

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthToken> {
    const response = await httpClient.post<AuthToken>('/auth/login', credentials)
    return response.data
  },

  async register(userData: RegisterRequest): Promise<AuthToken> {
    const response = await httpClient.post<AuthToken>('/auth/register', userData)
    return response.data
  },
}
