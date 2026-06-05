import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/usersApi'

export function useUserStats() {
  return useQuery({
    queryKey: ['users', 'me', 'stats'],
    queryFn: () => usersApi.getMyStats(),
    staleTime: 30_000,
  })
}
