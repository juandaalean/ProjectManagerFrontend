import type { TaskPriority, TaskState } from '../types/task.types'

const dotBaseClass = 'inline-flex h-4 w-4 shrink-0 rounded-full border border-base-100 shadow-sm'

const stateBadgeClasses: Record<TaskState, string> = {
  Active: 'bg-primary',
  Finished: 'bg-success',
  Canceled: 'bg-error',
}

const priorityBadgeClasses: Record<TaskPriority, string> = {
  Critical: 'bg-error',
  High: 'bg-warning',
  Medium: 'bg-secondary',
  Low: 'bg-info',
}

export function getTaskStateBadgeClassName(state: TaskState) {
  return `${dotBaseClass} ${stateBadgeClasses[state]}`
}

export function getTaskPriorityBadgeClassName(priority: TaskPriority) {
  return `${dotBaseClass} ${priorityBadgeClasses[priority]}`
}
