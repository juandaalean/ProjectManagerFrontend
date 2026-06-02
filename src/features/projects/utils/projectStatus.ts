import type { Project, ProjectStatus } from '../types/project.types'

export function getProjectStatus(project: Project): ProjectStatus {
  return project.status ?? 'Active'
}

export function isProjectArchived(project: Project) {
  return getProjectStatus(project) === 'Archived'
}

export function getProjectStatusBadgeClassName(status: ProjectStatus) {
  switch (status) {
    case 'Finished':
      return 'badge-success text-success-content'
    case 'Archived':
      return 'badge-neutral text-neutral-content'
    default:
      return 'badge-primary text-primary-content'
  }
}

export function getProjectStatusLabel(status: ProjectStatus) {
  switch (status) {
    case 'Finished':
      return 'Finished'
    case 'Archived':
      return 'Archived'
    default:
      return 'Active'
  }
}
