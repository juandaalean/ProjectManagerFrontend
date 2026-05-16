import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'

type Props = {
  collapsed?: boolean
  onToggleCollapse?: () => void
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

export function AppNavbar({ collapsed, onToggleCollapse, theme, onToggleTheme }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar sticky top-0 z-30 bg-base-100 shadow-sm px-4 sm:px-6 lg:px-8">
      <div className="navbar-start gap-2">
        <label htmlFor="app-shell-drawer" className="btn btn-square btn-ghost drawer-button lg:hidden" aria-label="Open navigation">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>

        <button type="button" className="btn btn-ghost text-xl normal-case" onClick={() => navigate('/projects')}>
          Project Manager
        </button>

        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-2 hidden btn btn-ghost btn-square lg:inline-flex"
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

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <NavLink to="/projects">Projects</NavLink>
          </li>
          <li>
            <NavLink to="/tasks">Tasks</NavLink>
          </li>
          <li>
            <details>
              <summary>Workspace</summary>
              <ul className="bg-base-100 rounded-t-none p-2 shadow-sm">
                <li><NavLink to="/projects">Project board</NavLink></li>
                <li><NavLink to="/tasks">Task board</NavLink></li>
              </ul>
            </details>
          </li>
        </ul>
      </div>

      <div className="navbar-end gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle theme"
            className="btn btn-ghost btn-square"
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293a8 8 0 11-10.586-10.586 8 8 0 0010.586 10.586z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM4.22 5.47a1 1 0 011.415 0L6.64 6.47a1 1 0 01-1.415 1.415L4.22 6.887a1 1 0 010-1.415zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm8 7a1 1 0 011-1v-1a1 1 0 10-2 0v1a1 1 0 011 1zm5.78-2.53a1 1 0 000-1.415l-1-1a1 1 0 10-1.415 1.415l1 1a1 1 0 001.415 0zM17 9a1 1 0 100 2h1a1 1 0 100-2h-1z" />
              </svg>
            )}
          </button>

          <div className="dropdown dropdown-end">
            <button type="button" tabIndex={0} className="btn btn-ghost btn-circle avatar" aria-label="User menu">
              <div className="w-10 rounded-full bg-primary text-primary-content">
                <span className="grid h-full place-items-center text-sm font-semibold">
                  {user?.name?.slice(0, 1)?.toUpperCase() ?? 'U'}
                </span>
              </div>
            </button>

            <ul tabIndex={0} className="menu dropdown-content menu-sm z-[1] mt-3 w-56 rounded-box bg-base-100 p-2 shadow">
              <li className="menu-title">
                <span>{user?.name ?? 'Guest'}</span>
              </li>
              <li><span className="pointer-events-none">{user?.email ?? 'No email'}</span></li>
              <li><NavLink to="/projects">Projects</NavLink></li>
              <li><NavLink to="/tasks">Tasks</NavLink></li>
              <li><button type="button" onClick={handleLogout}>Logout</button></li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}
