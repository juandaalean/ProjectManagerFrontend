import type { TaskPriority, TaskState } from '../types/task.types'

const badgeBaseClass = 'badge border-transparent px-6 py-2 text-xs font-semibold tracking-wide'

const stateBadgeClasses: Record<TaskState, string> = {
  Active: 'badge-primary text-primary-content',
  Finished: 'badge-success text-success-content',
  Canceled: 'badge-error text-error-content',
}

const priorityBadgeClasses: Record<TaskPriority, string> = {
  Critical: 'badge-error text-error-content',
  High: 'badge-warning text-warning-content',
  Medium: 'badge-secondary text-secondary-content',
  Low: 'badge-info text-info-content',
}

export function getTaskStateBadgeClassName(state: TaskState) {
  return `${badgeBaseClass} ${stateBadgeClasses[state]}`
}

export function getTaskPriorityBadgeClassName(priority: TaskPriority) {
  return `${badgeBaseClass} ${priorityBadgeClasses[priority]}`
}
