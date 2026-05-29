import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'

type Props = {
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
}

export function AppNavbar({ theme, onToggleTheme }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar sticky top-0 z-30 bg-base-100 shadow-sm px-4 sm:px-6 lg:px-8">
      <div className="navbar-start gap-2">
        <label
          htmlFor="app-shell-drawer"
          className="btn btn-square btn-ghost drawer-button lg:hidden"
          aria-label="Open navigation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </label>

        <button
          type="button"
          className="btn btn-ghost text-xl normal-case"
          onClick={() => navigate('/projects')}
        >
          Project Manager
        </button>

        {/* Collapse control moved into the sidebar for better UX */}
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#fff"
                  fill-rule="evenodd"
                  d="M12 1.25c.41 0 .75.34.75.75v2a.75.75 0 0 1-1.5 0V2c0-.41.34-.75.75-.75M3.67 3.72a.75.75 0 0 1 1.06-.05L6.95 5.7a.75.75 0 1 1-1.01 1.1L3.72 4.79a.75.75 0 0 1-.05-1.06m16.66 0c.28.3.26.78-.05 1.06L18.06 6.8a.75.75 0 0 1-1.01-1.11l2.22-2.03a.75.75 0 0 1 1.06.05M12 7.75a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 0 0 0-8.5M6.25 12a5.75 5.75 0 1 1 11.5 0 5.75 5.75 0 0 1-11.5 0m-5 0c0-.41.34-.75.75-.75h2a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1-.75-.75m18 0c0-.41.34-.75.75-.75h2a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75m-2.22 5.03c.29-.3.76-.3 1.06 0l2.22 2.22a.75.75 0 0 1-1.06 1.06l-2.22-2.22a.75.75 0 0 1 0-1.06m-10.06 0c.3.29.3.76 0 1.06L4.75 20.3a.75.75 0 0 1-1.06-1.06l2.22-2.22c.3-.3.77-.3 1.06 0M12 19.25c.41 0 .75.34.75.75v2a.75.75 0 0 1-1.5 0v-2c0-.41.34-.75.75-.75"
                  clip-rule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293a8 8 0 11-10.586-10.586 8 8 0 0010.586 10.586z" />
              </svg>
            )}
          </button>

          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-circle avatar"
              aria-label="User menu"
            >
              <div className="w-10 rounded-full bg-primary text-primary-content">
                <span className="grid h-full place-items-center text-sm font-semibold">
                  {user?.name?.slice(0, 1)?.toUpperCase() ?? 'U'}
                </span>
              </div>
            </button>

            <ul
              tabIndex={0}
              className="menu dropdown-content menu-sm z-[1] mt-3 w-56 rounded-box bg-base-100 p-2 shadow"
            >
              <li className="menu-title">
                <span>{user?.name ?? 'Guest'}</span>
              </li>
              <li>
                <span className="pointer-events-none">{user?.email ?? 'No email'}</span>
              </li>
              <li>
                <NavLink to="/projects">Projects</NavLink>
              </li>
              <li>
                <NavLink to="/tasks">Tasks</NavLink>
              </li>
              <li>
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}
