export type Project = {
  projectId: string
  name: string
  description: string
  startDate: string
  endDate: string
  ownerId: string
}

export type CreateProjectRequest = {
  name: string
  description: string
  startDate: string
  endDate: string
}

export type UpdateProjectRequest = {
  name?: string
  description?: string
  startDate?: string
  endDate?: string
}
