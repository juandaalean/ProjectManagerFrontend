export function AppFooter() {
  return (
    <footer className="footer footer-center border-t border-base-300 bg-base-100 px-4 py-6 text-base-content sm:px-6 lg:px-8">
      <aside>
        <p className="font-semibold">Project Manager Frontend</p>
        <p className="text-sm text-base-content/70">© 2026 Project Manager. personal project for learning purposes.</p>
      </aside>
      <nav>
        <div className="grid grid-flow-col gap-3 text-sm">
          <a href="/projects" className="link link-hover">Projects</a>
          <a href="/tasks" className="link link-hover">Tasks</a>
        </div>
      </nav>
    </footer>
  )
}