import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectQuery } from '../hooks/useProjectsQuery'
import { useAuth } from '../../auth/context/AuthContext'
import type { TaskItem } from '../../tasks/types/task.types'
import { useProjectMembersQuery } from '../hooks/useProjectMembersQuery'

interface ProjectTaskCalendarProps {
  projectId: string
  tasks: TaskItem[]
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toLocalDate = (value: string) => new Date(value)

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

const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)

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
    [projectMembers]
  )
  const previousMonth = () => setViewDate((current) => addMonths(current, -1))
  const nextMonth = () => setViewDate((current) => addMonths(current, 1))
  const goToToday = () => setViewDate(new Date())

  const { data: project } = useProjectQuery(projectId)
  const { user } = useAuth()
  const isOwner = !!project && !!user && project.ownerId === user.userId

  return (
    <section className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="badge badge-secondary text-secondary-content mb-2">Project calendar</div>
            {isOwner && <div className="badge badge-accent text-accent-content mb-2">Owner</div>}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{formatMonth(selectedMonth)}</h2>
          <p className="text-sm text-base-content/70">Tasks are placed on the completion day when available.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost btn-sm" onClick={previousMonth} type="button">Previous</button>
          <button className="btn btn-ghost btn-sm" onClick={goToToday} type="button">Today</button>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth} type="button">Next</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-2 py-1 text-center">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day) => {
          const isCurrentMonth = day.getMonth() === selectedMonth.getMonth()
          const dayKey = toDayKey(day)
          const dayTasks = eventsByDay.get(dayKey) ?? []

          return (
            <div
              key={dayKey}
              className={`min-h-28 rounded-2xl border p-2 ${isCurrentMonth ? 'border-base-300 bg-base-200/40' : 'border-base-300/60 bg-base-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{day.getDate()}</span>
                {dayTasks.length > 0 && (
                  <span className="badge badge-primary badge-outline badge-sm">{dayTasks.length}</span>
                )}
              </div>

              <div className="mt-2 space-y-2">
                {dayTasks.slice(0, 3).map((task) => {
                  const stateClass = task.state === 'Finished'
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
                          Assigned to: {memberById.get(task.assignedUserId)?.userName ?? task.assignedUserId}
                        </span>
                      </div>
                    </button>
                  )
                })}
                {dayTasks.length > 3 && (
                  <p className="px-1 text-[11px] text-base-content/60">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}