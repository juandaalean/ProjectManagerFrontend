import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { Input } from '../../../shared/ui/Input'
import { useSprintsQuery } from '../hooks/useSprintsQuery'
import {
  useDeleteSprintMutation,
  useUpdateSprintMutation,
  useAssignTaskToSprintMutation,
  useRemoveTaskFromSprintMutation,
} from '../hooks/useSprintMutations'
import { useSprintWithTasksQuery } from '../hooks/useSprintsQuery'
import { useTasksQuery } from '../../tasks/hooks/useTasksQuery'
import { useUpdateTaskMutation } from '../../tasks/hooks/useTaskMutations'
import { SprintFormModal } from './SprintFormModal'
import type { ListSprintsQuery, Sprint, SprintState } from '../types/sprint.types'
import { SprintStateValues } from '../types/sprint.types'
import { getSprintStateBadgeClassName, getSprintStateLabel } from '../utils/sprintStatus'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import {
  ArrowLeft,
  CalendarRange,
  ChevronRight,
  EllipsisVertical,
  Plus,
  Search,
  Target,
  Trash2,
  Unlink,
  X,
} from 'lucide-react'
import type { TaskItem } from '../../tasks/types/task.types'
import type { TaskState } from '../../tasks/types/task.types'
import type { ProjectMemberDto } from '../../projects/types/project.types'

interface SprintsSectionProps {
  projectId: string
  projectStartDate?: string
  projectEndDate?: string
  canManage?: boolean
}

type KanbanColumnId = 'todo' | 'in-progress' | 'done' | 'canceled'

const KANBAN_COLUMNS: {
  id: KanbanColumnId
  title: string
  accent: string
  bg: string
}[] = [
  { id: 'todo', title: 'TODO', accent: 'border-base-300', bg: 'bg-base-200/40' },
  {
    id: 'in-progress',
    title: 'IN PROGRESS',
    accent: 'border-warning/60',
    bg: 'bg-warning/5',
  },
  { id: 'done', title: 'DONE', accent: 'border-success/60', bg: 'bg-success/5' },
  { id: 'canceled', title: 'CANCELED', accent: 'border-error/60', bg: 'bg-error/5' },
]

const KANBAN_HINT: Record<KanbanColumnId, string> = {
  todo: 'Active · no due date',
  'in-progress': 'Active · with due date',
  done: 'Finished',
  canceled: 'Canceled',
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString()
}

const formatDateRange = (start?: string, end?: string) => {
  if (!start || !end) return '—'
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '—'
  return `${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()}`
}

const getKanbanColumn = (task: TaskItem): KanbanColumnId => {
  if (task.state === 'Finished') return 'done'
  if (task.state === 'Canceled') return 'canceled'
  if (task.startAt || task.completedAt) return 'in-progress'
  return 'todo'
}

function StateBadge({ state }: { state: SprintState }) {
  return (
    <span className={`badge ${getSprintStateBadgeClassName(state)}`}>
      {getSprintStateLabel(state)}
    </span>
  )
}

export function SprintsSection({
  projectId,
  projectStartDate,
  projectEndDate,
  canManage,
}: SprintsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [stateFilter, setStateFilter] = useState<SprintState | ''>('')
  const [startFrom, setStartFrom] = useState('')
  const [startTo, setStartTo] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [boardSprintId, setBoardSprintId] = useState<string | null>(null)
  const [drawerTask, setDrawerTask] = useState<TaskItem | null>(null)

  const queryFilters = useMemo<ListSprintsQuery | undefined>(() => {
    const filters: ListSprintsQuery = {}
    if (searchTerm.trim()) filters.searchTerm = searchTerm.trim()
    if (startFrom) filters.startDateFrom = startFrom
    if (startTo) filters.startDateTo = startTo
    if (stateFilter) filters.state = stateFilter
    return Object.keys(filters).length > 0 ? filters : undefined
  }, [searchTerm, startFrom, startTo, stateFilter])

  const { data: sprints = [], isLoading, error } = useSprintsQuery(projectId, queryFilters)

  const hasActiveFilters = !!searchTerm.trim() || !!stateFilter || !!startFrom || !!startTo

  const handleClearFilters = () => {
    setSearchTerm('')
    setStateFilter('')
    setStartFrom('')
    setStartTo('')
  }

  if (boardSprintId) {
    return (
      <>
        <SprintBoardView
          projectId={projectId}
          sprintId={boardSprintId}
          onBack={() => {
            setBoardSprintId(null)
            setDrawerTask(null)
          }}
          canManage={canManage}
          drawerTask={drawerTask}
          onOpenTask={setDrawerTask}
          onCloseDrawer={() => setDrawerTask(null)}
          onEditSprint={(s) => setEditingSprint(s)}
          onCreateSprint={() => setIsCreateOpen(true)}
        />
        {editingSprint && canManage && (
          <SprintFormModal
            projectId={projectId}
            projectStartDate={projectStartDate}
            projectEndDate={projectEndDate}
            sprint={editingSprint}
            onClose={() => setEditingSprint(null)}
          />
        )}
      </>
    )
  }

  return (
    <Card className="border border-base-300 bg-base-100">
      <div className="card-body gap-5 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="badge badge-primary badge-outline mb-2">Sprints</div>
            <h3 className="text-3xl font-bold tracking-tight">Project sprints</h3>
            <p className="mt-1 text-sm text-base-content/70">Pick a sprint to open its board.</p>
          </div>
          {canManage && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New sprint
            </Button>
          )}
        </div>

        <SprintsFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          stateFilter={stateFilter}
          onStateFilterChange={setStateFilter}
          startFrom={startFrom}
          onStartFromChange={setStartFrom}
          startTo={startTo}
          onStartToChange={setStartTo}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />

        {isLoading ? (
          <div className="text-center py-10 text-sm text-base-content/70">Loading sprints...</div>
        ) : error ? (
          <ErrorState message={error.message} />
        ) : sprints.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/30 p-12 text-center text-sm text-base-content/70">
            No sprints found.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sprints.map((sprint) => (
              <SprintOverviewCard
                key={sprint.sprintId}
                sprint={sprint}
                onOpenBoard={() => setBoardSprintId(sprint.sprintId)}
              />
            ))}
          </div>
        )}

        {isCreateOpen && canManage && (
          <SprintFormModal
            projectId={projectId}
            projectStartDate={projectStartDate}
            projectEndDate={projectEndDate}
            onClose={() => setIsCreateOpen(false)}
          />
        )}

        {editingSprint && canManage && (
          <SprintFormModal
            projectId={projectId}
            projectStartDate={projectStartDate}
            projectEndDate={projectEndDate}
            sprint={editingSprint}
            onClose={() => setEditingSprint(null)}
          />
        )}
      </div>
    </Card>
  )
}

interface SprintsFiltersProps {
  searchTerm: string
  onSearchTermChange: (v: string) => void
  stateFilter: SprintState | ''
  onStateFilterChange: (v: SprintState | '') => void
  startFrom: string
  onStartFromChange: (v: string) => void
  startTo: string
  onStartToChange: (v: string) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

function SprintsFilters({
  searchTerm,
  onSearchTermChange,
  stateFilter,
  onStateFilterChange,
  startFrom,
  onStartFromChange,
  startTo,
  onStartToChange,
  hasActiveFilters,
  onClearFilters,
}: SprintsFiltersProps) {
  return (
    <div className="collapse collapse-arrow border border-base-300 bg-base-100">
      <input type="checkbox" />
      <div className="collapse-title text-base font-semibold">Search filters</div>
      <div className="collapse-content">
        <div className="grid gap-3 pt-1 md:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))]">
          <Input
            label="Search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search by sprint name"
            icon={<Search className="h-4 w-4" />}
          />
          <div>
            <span className="label-text mb-1 text-sm font-semibold tracking-wide text-base-content">
              State
            </span>
            <select
              className="select select-bordered w-full"
              value={stateFilter}
              onChange={(event) => onStateFilterChange(event.target.value as SprintState | '')}
            >
              <option value="">All</option>
              {SprintStateValues.map((state) => (
                <option key={state} value={state}>
                  {getSprintStateLabel(state)}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Start from"
            type="date"
            value={startFrom}
            onChange={(event) => onStartFromChange(event.target.value)}
          />
          <Input
            label="Start to"
            type="date"
            value={startTo}
            onChange={(event) => onStartToChange(event.target.value)}
          />
          <div className="md:col-span-4 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SprintOverviewCardProps {
  sprint: Sprint
  onOpenBoard: () => void
}

function SprintOverviewCard({ sprint, onOpenBoard }: SprintOverviewCardProps) {
  return (
    <button
      type="button"
      onClick={onOpenBoard}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-base-300 bg-base-100 p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <h4 className="line-clamp-1 text-lg font-bold tracking-tight">{sprint.name}</h4>
        <StateBadge state={sprint.state} />
      </div>

      <div className="flex w-full items-center gap-2 text-xs text-base-content/60">
        <CalendarRange className="h-3.5 w-3.5" />
        {formatDateRange(sprint.startDate, sprint.endDate)}
      </div>

      {sprint.goal && (
        <p className="line-clamp-2 text-sm text-base-content/70">
          <span className="font-medium">Goal:</span> {sprint.goal}
        </p>
      )}

      <div className="mt-auto flex w-full items-center justify-between pt-1 text-sm font-medium text-primary">
        <span>Open board</span>
        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

interface SprintBoardViewProps {
  projectId: string
  sprintId: string
  onBack: () => void
  canManage?: boolean
  drawerTask: TaskItem | null
  onOpenTask: (task: TaskItem) => void
  onCloseDrawer: () => void
  onEditSprint: (sprint: Sprint) => void
  onCreateSprint: () => void
}

function SprintBoardView({
  projectId,
  sprintId,
  onBack,
  canManage,
  drawerTask,
  onOpenTask,
  onCloseDrawer,
  onEditSprint,
}: SprintBoardViewProps) {
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null)
  const queryClient = useQueryClient()
  const { data: sprintDetail, isLoading } = useSprintWithTasksQuery(projectId, sprintId)
  const { data: members = [] } = useProjectMembersQuery(projectId)
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  )

  const updateMutation = useUpdateSprintMutation(projectId)
  const deleteMutation = useDeleteSprintMutation(projectId)
  const removeMutation = useRemoveTaskFromSprintMutation(projectId)
  const assignMutation = useAssignTaskToSprintMutation(projectId)
  const updateTaskMutation = useUpdateTaskMutation()

  const tasks = useMemo(() => sprintDetail?.tasks ?? [], [sprintDetail?.tasks])
  const tasksByColumn = useMemo(() => {
    const map: Record<KanbanColumnId, TaskItem[]> = {
      todo: [],
      'in-progress': [],
      done: [],
      canceled: [],
    }
    for (const task of tasks) {
      map[getKanbanColumn(task)].push(task)
    }
    return map
  }, [tasks])

  const progressPercent = useMemo(() => {
    if (tasks.length === 0) return 0
    const done = tasks.filter((t) => t.state === 'Finished').length
    return Math.round((done / tasks.length) * 100)
  }, [tasks])

  const handleCloseSprint = (sprint: Sprint) => {
    if (window.confirm(`Mark sprint "${sprint.name}" as Completed?`)) {
      updateMutation.mutate({
        sprintId: sprint.sprintId,
        request: { state: 'Completed' },
      })
    }
  }

  const handleDeleteSprint = (sprint: Sprint) => {
    if (window.confirm(`Delete sprint "${sprint.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(sprint.sprintId, { onSuccess: onBack })
    }
  }

  const handleRefreshBoard = () => {
    queryClient.invalidateQueries({ queryKey: ['sprint-with-tasks', projectId, sprintId] })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const targetColumnId = over.id as KanbanColumnId
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const sourceColumnId = getKanbanColumn(task)
    if (sourceColumnId === targetColumnId) return

    const now = new Date().toISOString()

    let newState: TaskState
    let newCompletedAt: string | null | undefined
    let clearCompletedAt: boolean | undefined

    switch (targetColumnId) {
      case 'todo':
        newState = 'Active'
        newCompletedAt = undefined
        clearCompletedAt = true
        break
      case 'in-progress':
        newState = 'Active'
        newCompletedAt = now
        clearCompletedAt = undefined
        break
      case 'done':
        newState = 'Finished'
        newCompletedAt = now
        clearCompletedAt = undefined
        break
      case 'canceled':
        newState = 'Canceled'
        newCompletedAt = undefined
        clearCompletedAt = true
        break
    }

    updateTaskMutation.mutate(
      { projectId, taskItemId: taskId, task: { state: newState, completedAt: newCompletedAt, clearCompletedAt } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['sprint-with-tasks', projectId, sprintId] })
        },
      },
    )
  }

  const handleRemoveTask = (task: TaskItem) => {
    const tId = task.id
    const sId = sprintId
    const tasksInSprint = sprintDetail?.tasks ?? []
    removeMutation.mutate(
      { taskItemId: tId, sprintId: sId },
      {
        onSuccess: () => {
          queryClient.setQueryData(['sprint-with-tasks', projectId, sId], {
            sprint: sprintDetail?.sprint ?? null,
            tasks: tasksInSprint.filter((t) => t.id !== tId),
          })
          onCloseDrawer()
        },
      },
    )
  }

  if (isLoading || !sprintDetail) {
    return (
      <Card className="border border-base-300 bg-base-100">
        <div className="card-body items-center justify-center gap-3 p-12 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-md" />
          Loading sprint board...
        </div>
      </Card>
    )
  }

  const sprint = sprintDetail.sprint
  if (!sprint) {
    return (
      <Card className="border border-base-300 bg-base-100">
        <div className="card-body p-6">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to sprints
          </Button>
          <ErrorState message="Sprint not found." />
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="border border-base-300 bg-base-100">
        <div className="card-body gap-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                Sprints
              </Button>
              <div className="h-6 w-px bg-base-300" />
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-bold tracking-tight">{sprint.name}</h3>
                <StateBadge state={sprint.state} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <>
                  {sprint.state !== 'Completed' && sprint.state !== 'Canceled' && (
                    <Button variant="primary" size="sm" onClick={() => setIsAssignOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Add tasks
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteSprint(sprint)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <div className="dropdown dropdown-end">
                    <button
                      type="button"
                      className="btn btn-ghost btn-circle btn-sm"
                      aria-label="Sprint actions"
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <EllipsisVertical className="h-5 w-5" />
                    </button>
                    <ul
                      className="menu dropdown-content menu-sm z-[1] mt-3 w-44 rounded-box bg-base-100 p-2 shadow"
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <li>
                        <button type="button" onClick={handleRefreshBoard}>
                          Refresh
                        </button>
                      </li>
                      <li>
                        <button type="button" onClick={() => onEditSprint(sprint)}>
                          Edit
                        </button>
                      </li>
                      {sprint.state !== 'Completed' && sprint.state !== 'Canceled' && (
                        <li>
                          <button
                            type="button"
                            onClick={() => handleCloseSprint(sprint)}
                            disabled={updateMutation.isPending}
                          >
                            End sprint
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-box bg-base-200/30 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-base-content/70">
              <CalendarRange className="h-4 w-4" />
              <span>
                <span className="text-base-content/50">Dates:</span>{' '}
                {formatDateRange(sprint.startDate, sprint.endDate)}
              </span>
            </div>
            {sprint.goal && (
              <div className="flex items-center gap-2 text-base-content/70">
                <Target className="h-4 w-4" />
                <span>
                  <span className="text-base-content/50">Goal:</span> {sprint.goal}
                </span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-base-300">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-base-content/70">
                {progressPercent}% · {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid gap-3 lg:grid-cols-4">
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  columnId={col.id}
                  title={col.title}
                  accent={col.accent}
                  bg={col.bg}
                  hint={KANBAN_HINT[col.id]}
                  tasks={tasksByColumn[col.id]}
                  onSelectTask={onOpenTask}
                  memberById={memberById}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="w-72 rounded-lg border border-base-300 bg-base-100 p-2.5 shadow-xl">
                  <p className="line-clamp-2 text-sm font-semibold text-base-content">
                    {activeTask.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PriorityChip priority={activeTask.priority} />
                    {memberById.get(activeTask.assignedUserId)?.userName && (
                      <span className="text-xs text-base-content/70">
                        {memberById.get(activeTask.assignedUserId)?.userName}
                      </span>
                    )}
                  </div>
                  {activeTask.completedAt && (
                    <div className="mt-1 text-[10px] text-base-content/50">
                      {new Date(activeTask.completedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </Card>

      {drawerTask && (
        <TaskDrawer
          task={drawerTask}
          memberName={memberById.get(drawerTask.assignedUserId)?.userName}
          canManage={!!canManage}
          isRemoving={removeMutation.isPending}
          onClose={onCloseDrawer}
          onRemove={() => handleRemoveTask(drawerTask)}
        />
      )}

      <AddTasksModal
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        projectId={projectId}
        sprintId={sprintId}
        sprintName={sprint.name}
        existingTaskIds={tasks.map((t) => t.id)}
        onAssign={async (taskId) => {
          await assignMutation.mutateAsync({ taskItemId: taskId, sprintId })
        }}
        isAssigning={assignMutation.isPending}
      />
    </>
  )
}

interface KanbanColumnProps {
  columnId: KanbanColumnId
  title: string
  accent: string
  bg: string
  hint: string
  tasks: TaskItem[]
  onSelectTask: (task: TaskItem) => void
  memberById: Map<string, ProjectMemberDto>
}

function KanbanColumn({
  columnId,
  title,
  accent,
  bg,
  hint,
  tasks,
  onSelectTask,
  memberById,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[280px] flex-col justify-start rounded-2xl border-t-4 p-3 transition-colors ${
        isOver ? 'border-primary/80 bg-primary/5' : accent + ' ' + bg
      }`}
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <h6 className="text-xs font-semibold uppercase tracking-wider">{title}</h6>
        <span className="badge badge-ghost badge-sm">{tasks.length}</span>
      </div>
      <p className="grow-0 px-1 pb-3 text-[10px] uppercase tracking-wide text-base-content/40">{hint}</p>
      <div className="flex flex-1 flex-col justify-start space-y-2">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-base-300/60 bg-base-100/50 p-4 text-center text-xs text-base-content/40">
            No tasks
          </div>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onSelect={onSelectTask} memberById={memberById} />)
        )}
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: TaskItem
  onSelect: (task: TaskItem) => void
  memberById: Map<string, ProjectMemberDto>
}

function TaskCard({ task, onSelect, memberById }: TaskCardProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: task.id })
  const assigneeName = memberById.get(task.assignedUserId)?.userName
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onSelect(task)}
      className={`block w-full rounded-lg border border-base-300 bg-base-100 p-2.5 text-left text-sm transition hover:border-primary/40 hover:shadow-sm ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <p className="line-clamp-2 text-sm font-semibold text-base-content">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityChip priority={task.priority} />
        {assigneeName && (
          <span className="text-xs text-base-content/70">{assigneeName}</span>
        )}
      </div>
      {task.completedAt && (
        <div className="mt-1 text-[10px] text-base-content/50">
          {new Date(task.completedAt).toLocaleDateString()}
        </div>
      )}
    </button>
  )
}

function PriorityChip({ priority }: { priority: TaskItem['priority'] }) {
  const className =
    priority === 'Critical'
      ? 'bg-error/15 text-error'
      : priority === 'High'
        ? 'bg-warning/15 text-warning'
        : priority === 'Medium'
          ? 'bg-base-200 text-base-content/70'
          : 'bg-info/15 text-info'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${className}`}>
      {priority}
    </span>
  )
}


interface TaskDrawerProps {
  task: TaskItem
  memberName?: string
  canManage: boolean
  isRemoving: boolean
  onClose: () => void
  onRemove: () => void
}

function TaskDrawer({
  task,
  memberName,
  canManage,
  isRemoving,
  onClose,
  onRemove,
}: TaskDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-base-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-base-300 p-5">
          <div className="flex-1 pr-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
              Task details
            </p>
            <h3 className="mt-1 text-xl font-bold leading-tight">{task.title}</h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            aria-label="Close task details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {task.description && (
            <section>
              <SectionLabel>Description</SectionLabel>
              <p className="mt-1 whitespace-pre-wrap text-sm text-base-content/80">
                {task.description}
              </p>
            </section>
          )}

          <section className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <span className="inline-flex items-center gap-1.5">
                <StateDot state={task.state} />
                {task.state}
              </span>
            </Field>
            <Field label="Priority">
              <PriorityChip priority={task.priority} />
            </Field>
            <Field label="Assignee">{memberName ?? task.assignedUserId}</Field>
            <Field label="Start date">{formatDate(task.startAt)}</Field>
            <Field label="Due date">{formatDate(task.completedAt)}</Field>
          </section>

          <section className="rounded-box bg-base-200/40 p-3 text-xs text-base-content/60">
            <p className="font-semibold uppercase tracking-wider">Sprint</p>
            <p className="mt-1">
              This task is part of the current sprint. Remove it from the sprint to unassign.
            </p>
          </section>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-300 p-4">
            <Button variant="danger" size="sm" onClick={onRemove} disabled={isRemoving}>
              <Unlink className="h-4 w-4" />
              Remove from sprint
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">
      {children}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1 text-sm font-medium text-base-content">{children}</div>
    </div>
  )
}

function StateDot({ state }: { state: TaskItem['state'] }) {
  const className =
    state === 'Finished' ? 'bg-success' : state === 'Canceled' ? 'bg-error' : 'bg-primary'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />
}

function PriorityBadge({ priority }: { priority: TaskItem['priority'] }) {
  const className =
    priority === 'Critical'
      ? 'bg-error/15 text-error'
      : priority === 'High'
        ? 'bg-warning/15 text-warning'
        : priority === 'Medium'
          ? 'bg-info/15 text-info'
          : 'bg-base-200 text-base-content/70'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {priority}
    </span>
  )
}

interface AddTasksModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  sprintId: string
  sprintName: string
  existingTaskIds: string[]
  onAssign: (taskId: string) => Promise<void>
  isAssigning: boolean
}

function AddTasksModal({
  open,
  onClose,
  projectId,
  sprintName,
  existingTaskIds,
  onAssign,
  isAssigning,
}: AddTasksModalProps) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { data: allTasks = [], isLoading } = useTasksQuery(open ? projectId : undefined)

  const existingSet = useMemo(() => new Set(existingTaskIds), [existingTaskIds])

  const available = useMemo(() => {
    const lowered = search.toLowerCase().trim()
    return allTasks.filter(
      (t) => !existingSet.has(t.id) && (lowered === '' || t.title.toLowerCase().includes(lowered)),
    )
  }, [allTasks, existingSet, search])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    if (selectedIds.size === 0) return
    for (const id of selectedIds) {
      await onAssign(id)
    }
    setSelectedIds(new Set())
    onClose()
  }

  function handleClose() {
    if (isAssigning) return
    setSelectedIds(new Set())
    setSearch('')
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-2xl bg-base-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold">Add tasks to sprint</h3>
            <p className="text-xs text-base-content/60">
              Assigning to <span className="font-medium">{sprintName}</span>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isAssigning}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-base-300 px-5 py-3">
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isAssigning}
          />
        </div>

        <div className="max-h-80 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-base-content/60">Loading tasks…</div>
          ) : available.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-base-content/60">
              {allTasks.length === 0
                ? 'No tasks in this project yet.'
                : 'All tasks are already in this sprint.'}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {available.map((task) => {
                const checked = selectedIds.has(task.id)
                return (
                  <li key={task.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-base-200 ${
                        checked ? 'bg-primary/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={checked}
                        onChange={() => toggle(task.id)}
                        disabled={isAssigning}
                      />
                      <span className="line-clamp-1 flex-1">{task.title}</span>
                      <PriorityBadge priority={task.priority} />
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-base-300 px-5 py-4">
          <span className="text-xs text-base-content/60">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleClose} disabled={isAssigning}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || isAssigning}
            >
              {isAssigning
                ? 'Adding…'
                : `Add ${selectedIds.size || ''} task${selectedIds.size === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
