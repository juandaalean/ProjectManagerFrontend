import type { ProjectMemberDto } from '../types/project.types'

const MANAGER_ROLES = new Set([0, 1])

export function isProjectManagerRole(role?: number | null) {
  return role != null && MANAGER_ROLES.has(role)
}

export function getMemberRoleForUser(
  members: ProjectMemberDto[] | undefined,
  userId: string | undefined,
) {
  if (!members || !userId) {
    return undefined
  }

  return members.find((member) => member.userId === userId)?.role
}

export function canManageProject(params: {
  currentUserId?: string
  ownerId?: string
  memberRole?: number
}) {
  const { currentUserId, ownerId, memberRole } = params

  return currentUserId === ownerId || isProjectManagerRole(memberRole)
}

export function canToggleTaskState(params: {
  currentUserId?: string
  assignedUserId?: string
  ownerId?: string
  memberRole?: number
}) {
  const { currentUserId, assignedUserId, ownerId, memberRole } = params

  return (
    currentUserId === assignedUserId ||
    currentUserId === ownerId ||
    isProjectManagerRole(memberRole)
  )
}

export function canCreateTask(params: { memberRole?: number }) {
  return isProjectManagerRole(params.memberRole)
}