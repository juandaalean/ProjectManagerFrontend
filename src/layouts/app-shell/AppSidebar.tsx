import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/projects', label: 'Projects', description: 'Project overview and CRUD' },
  { to: '/tasks', label: 'Tasks', description: 'Work items and states' },
]

export function AppSidebar({ collapsed, onToggleCollapse }: { collapsed?: boolean; onToggleCollapse?: () => void }) {
  return (
    <aside className="drawer-side z-40">
      <label htmlFor="app-shell-drawer" aria-label="Close sidebar" className="drawer-overlay" />

      <div className={`flex min-h-full transition-all ${collapsed ? 'w-20 items-center' : 'w-80'} flex-col bg-base-100 p-2 lg:p-4 shadow-xl`} title="Project Manager">
        <div className={`rounded-box bg-base-200 p-3 w-full flex ${collapsed ? 'items-center justify-center' : 'items-start gap-3'}`}>
          {!collapsed && (
            <div className="w-10 h-10 rounded-md bg-primary text-primary-content grid place-items-center font-semibold" title="Project Manager">
              PM
            </div>
          )}

          {!collapsed && (
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Project Manager</p>
              <h2 className="mt-2 text-lg font-semibold">Workspace</h2>
              <p className="mt-1 text-sm text-base-content/70">Navigation prepared for projects, tasks and future sections.</p>
            </div>
          )}

          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`btn btn-ghost btn-square ${collapsed ? 'mx-auto' : 'ml-auto'}`}
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        <ul className="menu mt-4 rounded-box bg-base-100 p-1 w-full">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} title={item.label} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                  <div className="w-8 h-8 flex items-center justify-center rounded-md font-semibold bg-base-200 text-base-content">{item.label.slice(0, 1)}</div>
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