import { useState, useEffect, useRef } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Input } from '../../../shared/ui/Input'
import { useProjectMembersQuery } from '../../projects/hooks/useProjectMembersQuery'
import { useSprintsQuery } from '../../sprints/hooks/useSprintsQuery'
import type { ListTaskItemsQuery, TaskPriority, TaskState } from '../types/task.types'
import { TaskPriorityValues, TaskStateValues } from '../types/task.types'

interface TasksFilterBarProps {
  projectId?: string
  filters: ListTaskItemsQuery
  onChange: (filters: ListTaskItemsQuery) => void
}

export function TasksFilterBar({ projectId, filters, onChange }: TasksFilterBarProps) {
  const { data: members = [] } = useProjectMembersQuery(projectId)
  const { data: sprints = [] } = useSprintsQuery(projectId)
  const [searchInput, setSearchInput] = useState(filters.searchTerm ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const filtersRef = useRef(filters)
  const onChangeRef = useRef(onChange)
  const [userCollapseOverride, setUserCollapseOverride] = useState<boolean | null>(null)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const hasActiveFilters = !!(
    filters.searchTerm ||
    filters.taskState ||
    filters.taskPriority ||
    (projectId && (filters.assignedUser || filters.sprintId))
  )

  const collapseOpen = userCollapseOverride ?? hasActiveFilters

  // Keep the local search input in sync when the parent resets the search
  // (e.g. via "Clear filters"). Doing it during render avoids the
  // setState-in-effect cascading render warning.
  if (filters.searchTerm !== undefined && filters.searchTerm !== searchInput) {
    setSearchInput(filters.searchTerm)
  } else if (filters.searchTerm === undefined && searchInput !== '') {
    setSearchInput('')
  }

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onChangeRef.current({ ...filtersRef.current, searchTerm: searchInput || undefined })
    }, 400)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchInput])

  function update(partial: Partial<ListTaskItemsQuery>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div
      className={`collapse collapse-arrow border border-base-300 bg-base-100 ${collapseOpen ? 'collapse-open' : ''}`}
    >
      <button
        type="button"
        className="collapse-title text-base font-semibold w-full text-left"
        onClick={() => setUserCollapseOverride((prev) => !(prev ?? hasActiveFilters))}
      >
        Search filters
      </button>
      <div className="collapse-content">
        <div className="grid w-full gap-3 pt-1">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: projectId
                ? 'minmax(0,1.6fr) repeat(4,minmax(0,1fr))'
                : 'minmax(0,1.6fr) repeat(2,minmax(0,1fr))',
            }}
          >
            <Input
              label="Search"
              placeholder="Search tasks…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <div>
              <span className="label-text mb-1 text-sm font-semibold tracking-wide text-base-content">
                State
              </span>
              <select
                className="select select-bordered w-full"
                value={filters.taskState ?? ''}
                onChange={(e) =>
                  update({ taskState: (e.target.value || undefined) as TaskState | undefined })
                }
              >
                <option value="">All states</option>
                {TaskStateValues.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label-text mb-1 text-sm font-semibold tracking-wide text-base-content">
                Priority
              </span>
              <select
                className="select select-bordered w-full"
                value={filters.taskPriority ?? ''}
                onChange={(e) =>
                  update({
                    taskPriority: (e.target.value || undefined) as TaskPriority | undefined,
                  })
                }
              >
                <option value="">All priorities</option>
                {TaskPriorityValues.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {projectId && (
              <div>
                <span className="label-text mb-1 text-sm font-semibold tracking-wide text-base-content">
                  Assigned to
                </span>
                <select
                  className="select select-bordered w-full"
                  value={filters.assignedUser ?? ''}
                  onChange={(e) => update({ assignedUser: e.target.value || undefined })}
                >
                  <option value="">All members</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.userName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {projectId && (
              <div>
                <span className="label-text mb-1 text-sm font-semibold tracking-wide text-base-content">
                  Sprint
                </span>
                <select
                  className="select select-bordered w-full"
                  value={filters.sprintId ?? ''}
                  onChange={(e) => update({ sprintId: e.target.value || undefined })}
                >
                  <option value="">All sprints</option>
                  {sprints.map((s) => (
                    <option key={s.sprintId} value={s.sprintId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchInput('')
                  onChange({
                    searchTerm: undefined,
                    taskState: undefined,
                    taskPriority: undefined,
                    assignedUser: undefined,
                    sprintId: undefined,
                  })
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
