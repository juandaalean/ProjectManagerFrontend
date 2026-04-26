import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateProjectMutation, useUpdateProjectMutation } from '../hooks/useProjectMutations'
import { projectSchema, type ProjectFormData } from '../schemas/projectSchema'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import type { Project } from '../types/project.types'

interface ProjectFormModalProps {
  isOpen: boolean
  onClose: () => void
  project?: Project | null
}

export function ProjectFormModal({ isOpen, onClose, project }: ProjectFormModalProps) {
  const createMutation = useCreateProjectMutation()
  const updateMutation = useUpdateProjectMutation()

  const isEditing = !!project
  const mutation = isEditing ? updateMutation : createMutation

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: project ? {
      name: project.name,
      description: project.description || '',
      startDate: project.startDate.split('T')[0], // Format for date input
      endDate: project.endDate.split('T')[0],
    } : {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
    },
  })

  const toProjectPayload = (data: ProjectFormData) => ({
    name: data.name.trim(),
    description: (data.description ?? '').trim(),
    startDate: new Date(`${data.startDate}T00:00:00.000Z`).toISOString(),
    endDate: new Date(`${data.endDate}T00:00:00.000Z`).toISOString(),
  })

  const onSubmit = (data: ProjectFormData) => {
    const payload = toProjectPayload(data)

    if (isEditing && project) {
      updateMutation.mutate(
        { id: project.projectId, project: payload },
        {
          onSuccess: () => {
            onClose()
            form.reset()
          },
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onClose()
          form.reset()
        },
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Project' : 'Create Project'}
        </h2>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...form.register('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <Input
            label="Start Date"
            type="date"
            {...form.register('startDate')}
            error={form.formState.errors.startDate?.message}
          />

          <Input
            label="End Date"
            type="date"
            {...form.register('endDate')}
            error={form.formState.errors.endDate?.message}
          />

          {mutation.isError && (
            <p className="text-red-500 text-sm">
              {mutation.error?.message || 'An error occurred'}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? 'Saving...'
                : isEditing
                ? 'Update'
                : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
