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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={handleCreate}>Create Project</Button>
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
