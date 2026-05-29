import { NavLink } from 'react-router-dom'
import { FolderKanban, CheckSquare } from 'lucide-react'

const navItems = [
  {
    to: '/projects',
    label: 'Projects',
    description: 'Project overview and CRUD',
    icon: FolderKanban,
  },
  {
    to: '/tasks',
    label: 'Tasks',
    description: 'Show all tasks and filters',
    icon: CheckSquare,
  },
]

export function AppSidebar() {
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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Project Manager
            </p>
            <h2 className="mt-2 text-lg font-semibold">Workspace</h2>
            <p className="mt-1 text-sm text-base-content/70">
              Navigation prepared for projects, tasks and future sections.
            </p>
          </div>
        </div>

        {/* Lista de navegación con iconos dinámicos */}
        <ul className="menu mt-4 rounded-box bg-base-100 p-1 w-full">
          {navItems.map((item) => {
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

        <div className="mt-4 rounded-box border border-base-300 bg-base-200 p-4 w-full">
          <p className="text-sm font-semibold">Ready for sections</p>
          <p className="mt-1 text-sm text-base-content/70">
            This shell follows the official drawer pattern and is ready for dashboards, filters, and
            widgets for next features.
          </p>
        </div>
      </div>
    </aside>
  )
}
