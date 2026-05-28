import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { useAuth } from '../../auth/context/AuthContext'
import {
  useCreateProjectMemberMutation,
  useDeleteProjectMemberMutation,
  useProjectMembersQuery,
  useUpdateProjectMemberRoleMutation,
} from '../hooks/useProjectMembersQuery'
import {
  projectMemberSchema,
  projectRoleOptions,
  type ProjectMemberFormData,
} from '../schemas/projectMemberSchema'
import type { ProjectMemberDto } from '../types/project.types'
import { canManageProject, getMemberRoleForUser } from '../utils/projectPermissions'

interface ProjectMembersSectionProps {
  projectId: string
  canManageMembers?: boolean
}

const emptyMemberForm = {
  userEmail: '',
  role: 2,
}

function MemberBadge({ role }: { role: number }) {
  const label = projectRoleOptions.find((option) => option.value === role)?.label ?? 'No role'

  return <span className="badge badge-secondary badge-outline">{label}</span>
}

export function ProjectMembersSection({ projectId, canManageMembers }: ProjectMembersSectionProps) {
  const { data: members = [], isLoading, error } = useProjectMembersQuery(projectId)
  const createMutation = useCreateProjectMemberMutation(projectId)
  const updateMutation = useUpdateProjectMemberRoleMutation(projectId)
  const deleteMutation = useDeleteProjectMemberMutation(projectId)
  const [editingMember, setEditingMember] = useState<ProjectMemberDto | null>(null)
  const { user } = useAuth()
  const canManage = canManageMembers ?? canManageProject({
    currentUserId: user?.userId,
    memberRole: getMemberRoleForUser(members, user?.userId),
  })

  const form = useForm<ProjectMemberFormData>({
    resolver: zodResolver(projectMemberSchema) as never,
    defaultValues: emptyMemberForm,
  })

  useEffect(() => {
    if (editingMember) {
      form.reset({
        userEmail: editingMember.userEmail,
        role: editingMember.role,
      })
      return
    }

    form.reset(emptyMemberForm)
  }, [editingMember, form])

  const isEditing = !!editingMember
  const mutation = isEditing ? updateMutation : createMutation

  const memberCountLabel = useMemo(
    () => `${members.length} member${members.length === 1 ? '' : 's'}`,
    [members.length],
  )

  const handleSubmit = (data: ProjectMemberFormData) => {
    if (editingMember) {
      updateMutation.mutate(
        { userId: editingMember.userId, payload: { role: data.role } },
        {
          onSuccess: () => {
            setEditingMember(null)
          },
        },
      )
      return
    }

    createMutation.mutate(
      {
        userEmail: data.userEmail.trim(),
        role: data.role,
      },
      {
        onSuccess: () => {
          form.reset(emptyMemberForm)
        },
      },
    )
  }

  const handleEdit = (member: ProjectMemberDto) => {
    setEditingMember(member)
  }

  const handleCancelEdit = () => {
    setEditingMember(null)
  }

  const handleDelete = (member: ProjectMemberDto) => {
    if (window.confirm(`Remove ${member.userName} from this project?`)) {
      deleteMutation.mutate(member.userId, {
        onSuccess: () => {
          if (editingMember?.userId === member.userId) {
            setEditingMember(null)
          }
        },
      })
    }
  }

  return (
    <Card className="border border-base-300 bg-base-100">
      <div className="card-body gap-6 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="badge badge-secondary badge-outline mb-2">Members</div>
            <h3 className="text-2xl font-bold tracking-tight">Project users</h3>
            <p className="text-sm text-base-content/70">
              Manage the people assigned to this project and update their role when needed.
            </p>
          </div>
          <div className="badge badge-ghost badge-outline">{memberCountLabel}</div>
        </div>

        {isLoading ? (
          <div className="text-center py-6 text-sm text-base-content/70">Loading members...</div>
        ) : error ? (
          <ErrorState message={error.message} />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 p-6 text-sm text-base-content/70">
                  No members have been added yet.
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-200/40 p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold">{member.userName}</h4>
                        <MemberBadge role={member.role} />
                      </div>
                      <p className="text-sm text-base-content/70">{member.userEmail}</p>
                      <p className="text-xs uppercase tracking-wide text-base-content/50">
                        {member.userId}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canManage && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => handleEdit(member)}>
                            Edit role
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(member)}
                            disabled={deleteMutation.isPending}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-200/40 p-5">
              <div className="mb-4 space-y-1">
                <h4 className="text-lg font-semibold">
                  {canManage
                    ? isEditing
                      ? 'Update member role'
                      : 'Add project member'
                    : 'Project members'}
                </h4>
                <p className="text-sm text-base-content/70">
                  {canManage
                    ? isEditing
                      ? 'Update the role selected for this project user.'
                      : 'Invite a user using email and assign the role.'
                    : 'Only admins, coordinators, or the project owner can manage members.'}
                </p>
              </div>

              {canManage ? (
                <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
                  <label className="form-control w-full">
                    <span className="label-text mb-2 text-sm font-semibold tracking-wide text-base-content">
                      User email
                    </span>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      disabled={isEditing}
                      className={`input input-bordered bg-base-100 text-base-content placeholder:text-base-content/40 w-full ${form.formState.errors.userEmail ? 'input-error' : ''}`}
                      {...form.register('userEmail')}
                    />
                    {form.formState.errors.userEmail && (
                      <p className="mt-1 text-sm text-error">
                        {form.formState.errors.userEmail.message}
                      </p>
                    )}
                  </label>

                  <label className="form-control w-full">
                    <span className="label-text mb-2 text-sm font-semibold tracking-wide text-base-content">
                      Role
                    </span>
                    <select
                      className={`select select-bordered bg-base-100 text-base-content w-full ${form.formState.errors.role ? 'select-error' : ''}`}
                      {...form.register('role', { valueAsNumber: true })}
                    >
                      {projectRoleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.role && (
                      <p className="mt-1 text-sm text-error">{form.formState.errors.role.message}</p>
                    )}
                  </label>

                  {mutation.isError && (
                    <p className="text-sm text-error">
                      {mutation.error.message || 'An error occurred'}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    {isEditing && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCancelEdit}
                        disabled={mutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? 'Saving...' : isEditing ? 'Update role' : 'Add member'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 p-4 text-sm text-base-content/70">
                  Member management is read-only for your role.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
