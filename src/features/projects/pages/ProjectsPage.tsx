import { useState } from 'react'
import { Input } from '../../../shared/ui/Input'
import { ProjectList } from '../components/ProjectList'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { Button } from '../../../shared/ui/Button'
import type { Project, ProjectStatus } from '../types/project.types'

import { GalleryHorizontalEnd, CircleAlert, CircleCheck, Archive } from 'lucide-react'
export function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [viewMode, setViewMode] = useState<'all' | ProjectStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [startDateFrom, setStartDateFrom] = useState('')
  const [startDateTo, setStartDateTo] = useState('')

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
      <div className="rounded-box bg-base-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="badge badge-primary badge-outline mb-3">Projects</div>
              <h1 className="text-3xl font-bold tracking-tight">Project board</h1>
              {/* <p className="max-w-2xl text-base-content/70">
                Create, edit and manage projects from a dashboard layout.
              </p> */}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button
                variant={viewMode === 'all' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('all')}
                title="All projects" 
              >
                <GalleryHorizontalEnd className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === 'Active' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('Active')}
                title="Active projects"
              >
                <CircleAlert className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === 'Finished' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('Finished')}
                title="Finished projects"
              >
                <CircleCheck className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === 'Archived' ? 'primary' : 'secondary'}
                onClick={() => setViewMode('Archived')}
                title="Archived projects"
              >
                <Archive className="h-5 w-5" />
              </Button>
              <Button onClick={handleCreate}>Create Project</Button>
            </div>
          </div>

          <div className="collapse collapse-arrow border border-base-300 bg-base-100">
            <input type="checkbox" />
            <div className="collapse-title text-base font-semibold">Search filters</div>
            <div className="collapse-content">
              <div className="grid w-full gap-3 pt-1">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
                  <Input
                    label="Search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by name or description"
                  />
                  <Input
                    label="Start from"
                    type="date"
                    value={startDateFrom}
                    onChange={(event) => setStartDateFrom(event.target.value)}
                  />
                  <Input
                    label="Start to"
                    type="date"
                    value={startDateTo}
                    onChange={(event) => setStartDateTo(event.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchTerm('')
                      setStartDateFrom('')
                      setStartDateTo('')
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProjectList
        onEdit={handleEdit}
        onCreate={handleCreate}
        filters={{
          searchTerm: searchTerm.trim() || undefined,
          startDateFrom: startDateFrom || undefined,
          startDateTo: startDateTo || undefined,
          state: viewMode === 'all' ? undefined : viewMode,
        }}
      />

      <ProjectFormModal isOpen={isModalOpen} onClose={handleCloseModal} project={editingProject} />
    </div>
  )
}
