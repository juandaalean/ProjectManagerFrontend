import { httpClient } from '../../../shared/api/httpClient'
import type { UserStats } from '../types/userTypes'

export const usersApi = {
  async getMyStats(): Promise<UserStats> {
    const response = await httpClient.get<UserStats>('/users/me/stats')
    return response.data
  },
}
