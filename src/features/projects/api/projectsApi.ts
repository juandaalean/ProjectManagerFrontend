import { httpClient } from '../../../shared/api/httpClient'
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '../types/project.types'

export const projectsApi = {
  async getProjects(): Promise<Project[]> {
    const response = await httpClient.get<Project[]>('/projects')
    return response.data
  },

  async getProject(id: string): Promise<Project> {
    const response = await httpClient.get<Project>(`/projects/${id}`)
    return response.data
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
}
