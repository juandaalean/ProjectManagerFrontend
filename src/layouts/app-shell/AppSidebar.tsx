import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/projects', label: 'Projects', description: 'Project overview and CRUD' },
  { to: '/tasks', label: 'Tasks', description: 'Work items and states' },
]

export function AppSidebar({ collapsed }: { collapsed?: boolean }) {
  return (
    <aside className="drawer-side z-40">
      <label htmlFor="app-shell-drawer" aria-label="Close sidebar" className="drawer-overlay" />

      <div className={`flex min-h-full ${collapsed ? 'w-20 items-center' : 'w-80'} flex-col bg-base-100 p-4 shadow-xl`} title="Project Manager">
        <div className={`rounded-box bg-base-200 p-4 w-full ${collapsed ? 'flex items-center justify-center' : ''}`}>
          <div className={`w-10 h-10 rounded-md bg-primary text-primary-content grid place-items-center font-semibold ${collapsed ? '' : 'mb-2'}`}>
            PM
          </div>

          {!collapsed && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Project Manager</p>
              <h2 className="mt-2 text-lg font-semibold">Workspace</h2>
              <p className="mt-1 text-sm text-base-content/70">Navigation prepared for projects, tasks and future sections.</p>
            </div>
          )}
        </div>

        <ul className="menu mt-4 rounded-box bg-base-100 p-2 w-full">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                  <div className="w-8 text-center font-semibold">{item.label.slice(0, 1)}</div>
                  {!collapsed && (
                    <div className="flex-1">
                      <div>{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  )}
                </div>
              </NavLink>
            </li>
          ))}
        </ul>

        {!collapsed && (
          <div className="mt-4 rounded-box border border-base-300 bg-base-200 p-4 w-full">
            <p className="text-sm font-semibold">Ready for sections</p>
            <p className="mt-1 text-sm text-base-content/70">This shell follows the official drawer pattern and is ready for dashboards, filters, and widgets.</p>
          </div>
        )}
      </div>
    </aside>
  )
}