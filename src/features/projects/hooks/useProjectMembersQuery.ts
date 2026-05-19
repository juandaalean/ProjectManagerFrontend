import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../api/projectsApi'
import type {
  CreateProjectMemberRequest,
  ProjectMemberDto,
  UpdateProjectMemberRoleRequest,
} from '../types/project.types'

export function useProjectMembersQuery(projectId?: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectsApi.getProjectMembers(projectId!),
    enabled: !!projectId,
  })
}

export function useCreateProjectMemberMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<ProjectMemberDto, Error, CreateProjectMemberRequest>({
    mutationFn: (member) => projectsApi.createProjectMember(projectId, member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}

export function useUpdateProjectMemberRoleMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    ProjectMemberDto,
    Error,
    { userId: string; payload: UpdateProjectMemberRoleRequest }
  >({
    mutationFn: ({ userId, payload }) => projectsApi.updateProjectMemberRole(projectId, userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}

export function useDeleteProjectMemberMutation(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (userId) => projectsApi.deleteProjectMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}