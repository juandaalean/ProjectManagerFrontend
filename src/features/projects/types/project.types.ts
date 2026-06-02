export type ProjectStatus = 'Active' | 'Finished' | 'Archived'

export const ProjectStatusValues: readonly ProjectStatus[] = ['Active', 'Finished', 'Archived']

export type Project = {
  projectId: string
  name: string
  description: string
  startDate: string
  endDate: string
  ownerId: string
  status?: ProjectStatus | null
}

export type ProjectMemberDto = {
  userId: string
  userName: string
  userEmail: string
  role: number
}

export type CreateProjectMemberRequest = {
  userEmail: string
  role: number
}

export type UpdateProjectMemberRoleRequest = {
  role: number
}

export type CreateProjectRequest = {
  name: string
  description?: string
  startDate: string
  endDate: string
  status?: ProjectStatus
}

export type UpdateProjectRequest = {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  status?: ProjectStatus
}

export type ListProjectsQuery = {
  searchTerm?: string
  startDateFrom?: string
  startDateTo?: string
  state?: ProjectStatus
}
