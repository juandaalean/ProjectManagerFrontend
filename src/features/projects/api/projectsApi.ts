import { httpClient } from '../../../shared/api/httpClient'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectMemberDto,
  CreateProjectMemberRequest,
  UpdateProjectMemberRoleRequest,
} from '../types/project.types'

export const projectsApi = {
  async getProjects(): Promise<Project[]> {
    const response = await httpClient.get<Project[]>('/projects')
    return response.data
  },

  async getProject(id: string): Promise<Project> {
    const projects = await projectsApi.getProjects()
    const project = projects.find((item) => item.projectId === id)

    if (!project) {
      throw new Error('Project not found')
    }

    return project
  },

  async createProject(project: CreateProjectRequest): Promise<Project> {
    const response = await httpClient.post<Project>('/projects', project)
    return response.data
  },

  async updateProject(id: string, project: UpdateProjectRequest): Promise<Project> {
    const response = await httpClient.put<Project>(`/projects/${id}`, project)
    return response.data
  },

  async deleteProject(id: string): Promise<void> {
    await httpClient.delete(`/projects/${id}`)
  },

  async getProjectMembers(projectId: string): Promise<ProjectMemberDto[]> {
    const response = await httpClient.get<ProjectMemberDto[]>(`/projects/${projectId}/members`)
    return response.data
  },

  async createProjectMember(
    projectId: string,
    member: CreateProjectMemberRequest
  ): Promise<ProjectMemberDto> {
    try {
      console.debug('[projectsApi] createProjectMember payload:', member)
      // Send both userEmail and email to be tolerant to backend naming
      const payload = { userEmail: member.userEmail, email: member.userEmail, Email: member.userEmail, role: member.role }
      const response = await httpClient.post<ProjectMemberDto>(`/projects/${projectId}/members`, payload)
      console.debug('[projectsApi] createProjectMember response:', response.data)
      return response.data
    } catch (error) {
      console.error('[projectsApi] createProjectMember error:', error)
      throw error
    }
  },

  async updateProjectMemberRole(
    projectId: string,
    userId: string,
    payload: UpdateProjectMemberRoleRequest
  ): Promise<ProjectMemberDto> {
    console.debug('[projectsApi] updateProjectMemberRole payload:', { userId, ...payload })

    // Prefer the dedicated role endpoint by userId: /projects/{projectId}/members/{userId}/role
    try {
      const response = await httpClient.put<ProjectMemberDto>(`/projects/${projectId}/members/${encodeURIComponent(userId)}/role`, {
        Role: payload.role,
      })
      console.debug('[projectsApi] updateProjectMemberRole response (put role by id):', response.data)
      return response.data
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      console.warn('[projectsApi] updateProjectMemberRole put-role-by-id failed, status:', status)

      // Fallbacks: try the member resource and the collection endpoint
      if (status === 405) {
        try {
          const resp = await httpClient.put<ProjectMemberDto>(`/projects/${projectId}/members/${encodeURIComponent(userId)}`, {
            Role: payload.role,
          })
          console.debug('[projectsApi] updateProjectMemberRole response (put member fallback):', resp.data)
          return resp.data
        } catch (err2: unknown) {
          const status2 = (err2 as { response?: { status?: number } })?.response?.status
          console.warn('[projectsApi] updateProjectMemberRole member put failed, status:', status2)
        }

        try {
          const resp2 = await httpClient.patch<ProjectMemberDto>(`/projects/${projectId}/members/${encodeURIComponent(userId)}/role`, {
            Role: payload.role,
          })
          console.debug('[projectsApi] updateProjectMemberRole response (patch role by id):', resp2.data)
          return resp2.data
        } catch (err3: unknown) {
          const status3 = (err3 as { response?: { status?: number } })?.response?.status
          console.warn('[projectsApi] updateProjectMemberRole patch-role-by-id failed, status:', status3)
        }

        try {
          const resp4 = await httpClient.put<ProjectMemberDto>(`/projects/${projectId}/members`, {
            Role: payload.role,
            Email: userId,
          })
          console.debug('[projectsApi] updateProjectMemberRole response (put collection fallback):', resp4.data)
          return resp4.data
        } catch (err4: unknown) {
          const status4 = (err4 as { response?: { status?: number } })?.response?.status
          console.warn('[projectsApi] updateProjectMemberRole collection put failed, status:', status4)
        }
      }

      console.error('[projectsApi] updateProjectMemberRole error:', err)
      throw err
    }
  },

  async deleteProjectMember(projectId: string, userId: string): Promise<void> {
    console.debug('[projectsApi] deleteProjectMember payload:', { userId })

    // Prefer deleting by userId in path
    try {
      await httpClient.delete(`/projects/${projectId}/members/${encodeURIComponent(userId)}`)
      console.debug('[projectsApi] deleteProjectMember success (path by id)')
      return
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      console.warn('[projectsApi] deleteProjectMember delete-by-id failed, status:', status)

      // Fallback: try delete by collection with Email in query or body
      if (status === 405) {
        try {
          await httpClient.delete(`/projects/${projectId}/members`, {
            data: { Email: userId },
          })
          console.debug('[projectsApi] deleteProjectMember success (body fallback)')
          return
        } catch (err2: unknown) {
          const status2 = (err2 as { response?: { status?: number } })?.response?.status
          console.warn('[projectsApi] deleteProjectMember delete-with-body failed, status:', status2)
        }

        try {
          await httpClient.delete(`/projects/${projectId}/members?email=${encodeURIComponent(userId)}`)
          console.debug('[projectsApi] deleteProjectMember success (query fallback)')
          return
        } catch (err3: unknown) {
          const status3 = (err3 as { response?: { status?: number } })?.response?.status
          console.warn('[projectsApi] deleteProjectMember delete-query failed, status:', status3)
        }
      }

      console.error('[projectsApi] deleteProjectMember error:', err)
      throw err
    }
  },
}
