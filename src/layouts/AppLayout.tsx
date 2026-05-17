import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import { AppFooter } from './app-shell/AppFooter'
import { AppNavbar } from './app-shell/AppNavbar'
import { AppSidebar } from './app-shell/AppSidebar'

export function AppLayout({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'))

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
      localStorage.setItem('theme', theme)
    } catch {
      // ignore (SSR / restricted env)
    }
  }, [theme])

  return (
    <div className="drawer min-h-screen bg-base-200 text-base-content lg:drawer-open">
      <input id="app-shell-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-h-screen flex-col">
        <AppNavbar
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <AppFooter />
      </div>

      <AppSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
    </div>
  )
}
