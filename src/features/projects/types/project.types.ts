export type Project = {
  projectId: string
  name: string
  description: string
  startDate: string
  endDate: string
  ownerId: string
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
}

export type UpdateProjectRequest = {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
}
