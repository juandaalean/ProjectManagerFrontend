import { NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Calendar,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Layers,
  ListTodo,
  Sparkles,
} from 'lucide-react'

const mainNavItems = [
  {
    to: '/projects',
    label: 'Projects',
    description: 'Project overview and CRUD',
    icon: FolderKanban,
  },
  {
    to: '/tasks',
    label: 'Tasks',
    description: 'Show all your tasks across projects',
    icon: CheckSquare,
  },
]

export function AppSidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const projectNavItems = projectId
    ? [
        {
          id: 'overview',
          label: 'Overview',
          description: 'Project overview',
          icon: LayoutDashboard,
          active:
            location.pathname === `/projects/${projectId}` &&
            !new URLSearchParams(location.search).get('view'),
          onClick: () => navigate(`/projects/${projectId}`),
        },
        {
          id: 'tasks',
          label: 'Tasks',
          description: 'View project tasks',
          icon: ListTodo,
          active:
            location.pathname === `/projects/${projectId}/tasks` ||
            (location.pathname === `/projects/${projectId}` &&
              new URLSearchParams(location.search).get('view') === 'tasks'),
          onClick: () => navigate(`/projects/${projectId}/tasks`),
        },
        {
          id: 'calendar',
          label: 'Calendar',
          description: 'Calendar view',
          icon: Calendar,
          active:
            location.pathname === `/projects/${projectId}` &&
            new URLSearchParams(location.search).get('view') === 'calendar',
          onClick: () => navigate(`/projects/${projectId}?view=calendar`),
        },
        {
          id: 'sprints',
          label: 'Sprints',
          description: 'Sprint management',
          icon: Layers,
          active:
            location.pathname === `/projects/${projectId}` &&
            new URLSearchParams(location.search).get('view') === 'sprints',
          onClick: () => navigate(`/projects/${projectId}?view=sprints`),
        },
        {
          id: 'ai',
          label: 'AI Tasks',
          description: 'AI task automation',
          icon: Sparkles,
          active:
            location.pathname === `/projects/${projectId}` &&
            new URLSearchParams(location.search).get('view') === 'ai',
          onClick: () => navigate(`/projects/${projectId}?view=ai`),
        },
      ]
    : []

  return (
    <aside className="drawer-side z-40">
      <label htmlFor="app-shell-drawer" aria-label="Close sidebar" className="drawer-overlay" />

      <div
        className="flex min-h-full w-80 flex-col bg-base-100 p-2 shadow-xl lg:p-4"
        title="Project Manager"
      >
        <div className="rounded-box bg-base-200 p-3 w-full flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-md bg-primary text-primary-content grid place-items-center font-semibold"
            title="Project Manager"
          >
            PM
          </div>

          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Project Manager
            </p>
            <h2 className="mt-0.25 text-lg font-semibold">Workspace</h2>
            {/* <p className="mt-1 text-sm text-base-content/70">
              Navigation prepared for projects, tasks and future sections.
            </p> */}
          </div>
        </div>

        {/* Main navigation */}
        <ul className="menu mt-4 rounded-box bg-base-100 p-1 w-full">
          {mainNavItems.map((item) => {
            const IconComponent = item.icon

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) =>
                    `block w-full rounded-md px-2 py-1 transition-colors ${
                      isActive
                        ? 'bg-secondary text-secondary-content'
                        : 'text-base-content hover:bg-base-200/50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-base-content)]/10 text-[var(--color-base-content)] shrink-0">
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                    </div>

                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </div>
                </NavLink>
              </li>
            )
          })}
        </ul>

        {/* Project navigation - only shown when on a project detail page */}
        {projectId && (
          <>
            <div className="mt-4 px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">
                Project
              </p>
            </div>

            <ul className="menu mt-2 rounded-box bg-base-100 p-1 w-full">
              {projectNavItems.map((item) => {
                const IconComponent = item.icon

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      title={item.label}
                      className={`block w-full rounded-md px-2 py-1 transition-colors ${
                        item.active
                          ? 'bg-secondary text-secondary-content'
                          : 'text-base-content hover:bg-base-200/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-base-content)]/10 text-[var(--color-base-content)] shrink-0">
                          {IconComponent && <IconComponent className="w-4 h-4" />}
                        </div>

                        <div className="flex-1">
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs opacity-70">{item.description}</div>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {/* <div className="mt-4 rounded-box border border-base-300 bg-base-200 p-4 w-full">
          <p className="text-sm font-semibold">Ready for sections</p>
          <p className="mt-1 text-sm text-base-content/70">
            This shell follows the official drawer pattern and is ready for dashboards, filters, and
            widgets for next features.
          </p>
        </div> */}
      </div>
    </aside>
  )
}
