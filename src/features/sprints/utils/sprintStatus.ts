import type { SprintState } from '../types/sprint.types'

export function getSprintStateBadgeClassName(state: SprintState) {
  switch (state) {
    case 'Active':
      return 'badge-primary text-primary-content'
    case 'Completed':
      return 'badge-success text-success-content'
    case 'Canceled':
      return 'badge-error text-error-content'
    default:
      return 'badge-secondary text-secondary-content'
  }
}

export function getSprintStateLabel(state: SprintState) {
  switch (state) {
    case 'Planned':
      return 'Planned'
    case 'Active':
      return 'Active'
    case 'Completed':
      return 'Completed'
    case 'Canceled':
      return 'Canceled'
  }
}
