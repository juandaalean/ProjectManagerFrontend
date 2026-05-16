import { useState } from 'react'
import { ProjectList } from '../components/ProjectList'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { Button } from '../../../shared/ui/Button'
import type { Project } from '../types/project.types'

export function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const handleCreate = () => {
    setEditingProject(null)
    setIsModalOpen(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
  }

  return (
    <div className="space-y-6">
      <div className="hero rounded-box bg-base-100 shadow-sm">
        <div className="hero-content flex-col items-start gap-4 p-6 lg:flex-row lg:justify-between">
          <div>
            <div className="badge badge-primary badge-outline mb-3">Projects</div>
            <h1 className="text-3xl font-bold tracking-tight">Project board</h1>
            <p className="max-w-2xl text-base-content/70">
              Create, edit and manage projects from a dashboard layout built with DaisyUI.
            </p>
          </div>
          <Button onClick={handleCreate}>Create Project</Button>
        </div>
      </div>

      <ProjectList onEdit={handleEdit} onCreate={handleCreate} />

      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        project={editingProject}
      />
    </div>
  )
}
