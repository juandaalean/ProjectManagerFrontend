import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectQuery } from '../hooks/useProjectsQuery'
import { useAuth } from '../../auth/context/AuthContext'
import type { TaskItem } from '../../tasks/types/task.types'
import { useProjectMembersQuery } from '../hooks/useProjectMembersQuery'
import { TaskFormModal } from '../../tasks/components/TaskFormModal'
import { canCreateTask, getMemberRoleForUser } from '../utils/projectPermissions'
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'

interface ProjectTaskCalendarProps {
  projectId: string
  tasks: TaskItem[]
}

const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 21 }, (_, index) => currentYear - 10 + index)
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toLocalDate = (value: string) => new Date(value)

const toDateOnlyKey = (value: string) => value.split('T')[0]

const toDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  result.setDate(result.getDate() - result.getDay())
  return result
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1)

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate()

const normalizeEventDate = (task: TaskItem) => {
  const rawDate = task.completedAt ?? task.createdAt
  const date = toLocalDate(rawDate)

  return Number.isNaN(date.getTime()) ? null : date
}

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)

export function ProjectTaskCalendar({ projectId, tasks }: ProjectTaskCalendarProps) {
  const navigate = useNavigate()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [createTaskDate, setCreateTaskDate] = useState<string | null>(null)
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear())
  const monthPickerRef = useRef<HTMLDivElement | null>(null)
  const { data: projectMembers = [] } = useProjectMembersQuery(projectId)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(viewDate)
    const gridStart = startOfWeek(monthStart)
    const gridEnd = addDays(startOfWeek(addDays(monthEnd, 6)), 6)

    const days: Date[] = []
    for (let current = gridStart; current <= gridEnd; current = addDays(current, 1)) {
      days.push(current)
    }

    return days
  }, [viewDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>()

    for (const task of tasks) {
      const eventDate = normalizeEventDate(task)
      if (!eventDate) {
        continue
      }

      const key = toDayKey(eventDate)
      const existing = map.get(key) ?? []
      existing.push(task)
      map.set(key, existing)
    }

    return map
  }, [tasks])

  const selectedMonth = useMemo(() => startOfMonth(viewDate), [viewDate])
  const memberById = useMemo(
    () => new Map(projectMembers.map((member) => [member.userId, member])),
    [projectMembers],
  )
  const previousMonth = () => setViewDate((current) => addMonths(current, -1))
  const nextMonth = () => setViewDate((current) => addMonths(current, 1))
  const closeCreateTaskModal = () => setCreateTaskDate(null)

  const toggleMonthPicker = () => {
    setIsMonthPickerOpen((open) => {
      if (!open) {
        setPickerYear(viewDate.getFullYear())
      }
      return !open
    })
  }

  const selectMonth = (monthIndex: number) => {
    const safeDay = Math.min(viewDate.getDate(), daysInMonth(pickerYear, monthIndex))
    setViewDate(new Date(pickerYear, monthIndex, safeDay))
    setIsMonthPickerOpen(false)
  }

  useEffect(() => {
    if (!isMonthPickerOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMonthPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMonthPickerOpen])

  const isCurrentMonth = useMemo(() => {
    const today = new Date()
    return (
      viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth()
    )
  }, [viewDate])

  const { data: project } = useProjectQuery(projectId)
  const { user } = useAuth()
  const isOwner = !!project && !!user && project.ownerId === user.userId
  const canCreate = canCreateTask({
    memberRole: getMemberRoleForUser(projectMembers, user?.userId),
    projectStatus: project?.status,
  })
  const projectStartDate = project?.startDate ? toDateOnlyKey(project.startDate) : null
  const projectEndDate = project?.endDate ? toDateOnlyKey(project.endDate) : null

  const isWithinProjectRange = (dayKey: string) => {
    if (!projectStartDate || !projectEndDate) {
      return true
    }

    return dayKey >= projectStartDate && dayKey <= projectEndDate
  }

  return (
    <section className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="badge badge-secondary text-secondary-content mb-2">
              Project calendar
            </div>
            {isOwner && <div className="badge badge-accent text-accent-content mb-2">Owner</div>}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{formatMonth(selectedMonth)}</h2>
          {/* <p className="text-sm text-base-content/70">
            Tasks are placed on the completion day when available.
          </p> */}
          {projectStartDate && projectEndDate && (
            <p className="mt-1 text-sm text-base-content/60">
              Project span: {new Date(projectStartDate).toLocaleDateString()} -{' '}
              {new Date(projectEndDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={previousMonth}
            type="button"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div ref={monthPickerRef} className="relative">
            <button
              className={`btn btn-sm gap-2 normal-case font-medium ${isCurrentMonth ? 'btn-primary text-primary-content' : 'btn-outline'}`}
              onClick={toggleMonthPicker}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isMonthPickerOpen}
            >
              <CalendarDays className="w-4 h-4" />
              <span>{formatMonth(selectedMonth)}</span>
            </button>

            {isMonthPickerOpen && (
              <div
                role="dialog"
                aria-label="Jump to month"
                className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-xl"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setPickerYear((year) => year - 1)}
                    aria-label="Previous year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-base-content/60" />
                    <select
                      className="select select-bordered select-sm w-28"
                      value={pickerYear}
                      onChange={(event) => setPickerYear(Number(event.target.value))}
                      aria-label="Select year"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setPickerYear((year) => year + 1)}
                    aria-label="Next year"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {monthLabels.map((label, monthIndex) => {
                    const isActive =
                      viewDate.getFullYear() === pickerYear && viewDate.getMonth() === monthIndex
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => selectMonth(monthIndex)}
                        className={`btn btn-sm normal-case ${isActive ? 'btn-primary text-primary-content' : 'btn-ghost'}`}
                      >
                        {label.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-base-300 pt-3">
                  <span className="text-xs text-base-content/60">Quick jump</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => {
                      const today = new Date()
                      setPickerYear(today.getFullYear())
                      setViewDate(today)
                      setIsMonthPickerOpen(false)
                    }}
                  >
                    Go to today
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={nextMonth}
            type="button"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-2 py-1 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day) => {
          const isCurrentMonth = day.getMonth() === selectedMonth.getMonth()
          const dayKey = toDayKey(day)
          const dayTasks = eventsByDay.get(dayKey) ?? []
          const withinProjectRange = isWithinProjectRange(dayKey)
          const isProjectStart = projectStartDate === dayKey
          const isProjectEnd = projectEndDate === dayKey

          return (
            <div
              key={dayKey}
              className={`relative min-h-28 overflow-hidden rounded-2xl border p-2 ${isCurrentMonth ? 'border-base-300 bg-base-200/40' : 'border-base-300/60 bg-base-100 opacity-60'} ${withinProjectRange ? 'ring-1 ring-primary/15' : ''} ${isProjectStart || isProjectEnd ? 'border-secondary/60 bg-secondary/10' : ''}`}
            >
              {canCreate && (
                <button
                  type="button"
                  className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (withinProjectRange) {
                      setCreateTaskDate(dayKey)
                    }
                  }}
                  disabled={!withinProjectRange}
                  aria-label={`Create task for ${day.toLocaleDateString()}`}
                />
              )}
              <div className="flex items-start justify-between gap-2">
                <span className="relative z-10 text-sm font-semibold">{day.getDate()}</span>
                {withinProjectRange && (
                  <span className="relative z-10 badge badge-secondary badge-outline badge-sm">
                    Project
                  </span>
                )}
                {dayTasks.length > 0 && (
                  <span className="relative z-10 badge badge-primary badge-outline badge-sm">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="relative z-10 mt-2 space-y-2">
                {(isProjectStart || isProjectEnd) && (
                  <div className="flex gap-2 text-[10px] uppercase tracking-wide text-secondary-content">
                    {isProjectStart && (
                      <span className="badge badge-secondary badge-sm">Start</span>
                    )}
                    {isProjectEnd && <span className="badge badge-secondary badge-sm">End</span>}
                  </div>
                )}
                {dayTasks.slice(0, 3).map((task) => {
                  const stateClass =
                    task.state === 'Finished'
                      ? 'border-success/30 bg-success/10 text-success'
                      : task.state === 'Canceled'
                        ? 'border-error/30 bg-error/10 text-error'
                        : 'border-primary/30 bg-primary/10 text-base-content'

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate(`/projects/${projectId}/tasks/${task.id}`)}
                      className={`block w-full rounded-xl border px-2 py-1 text-left text-xs font-medium transition hover:scale-[1.01] ${stateClass}`}
                      title={task.title}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="truncate">{task.title}</span>
                        <span className="truncate text-[10px] opacity-80">
                          Assigned to:{' '}
                          {memberById.get(task.assignedUserId)?.userName ?? task.assignedUserId}
                        </span>
                      </div>
                    </button>
                  )
                })}
                {dayTasks.length > 3 && (
                  <p className="px-1 text-[11px] text-base-content/60">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {createTaskDate && canCreate && (
        <TaskFormModal
          projectId={projectId}
          initialStartAt={createTaskDate}
          initialCompletedAt={createTaskDate}
          onClose={closeCreateTaskModal}
        />
      )}
    </section>
  )
}
