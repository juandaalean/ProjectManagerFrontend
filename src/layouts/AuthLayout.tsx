import type { PropsWithChildren } from 'react'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-layout relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,_var(--color-primary)_18%,_transparent),_transparent_35%),linear-gradient(180deg,_var(--app-page-start),_var(--app-page-end))] text-base-content">      
      {/* Círculos decorativos adaptados a la paleta morada/accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-8rem] h-64 w-64 rounded-full bg-[var(--color-primary)]/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] right-[-6rem] h-72 w-72 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          
          {/* Sección de texto adaptiva */}
          <section className="max-w-xl text-base-content">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
              Project Manager
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-base-content sm:text-5xl lg:text-6xl">
              Organize projects, tasks, and comments without losing context.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 opacity-80 sm:text-lg">
              A clearer interface for quick entry, reviewing work status, and focusing on what's important.
            </p>

            {/* Tarjetas adaptivas usando el fondo base del tema */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-base-300/50 bg-base-100/40 p-4 backdrop-blur-sm shadow-sm dark:shadow-none">
                <p className="text-sm font-semibold text-base-content">Projects</p>
                <p className="mt-1 text-sm opacity-70">
                  A clear view of priorities and progress.
                </p>
              </div>
              <div className="rounded-2xl border border-base-300/50 bg-base-100/40 p-4 backdrop-blur-sm shadow-sm dark:shadow-none">
                <p className="text-sm font-semibold text-base-content">Tasks</p>
                <p className="mt-1 text-sm opacity-70">
                  Clear tracking by status and details.
                </p>
              </div>
              <div className="rounded-2xl border border-base-300/50 bg-base-100/40 p-4 backdrop-blur-sm shadow-sm dark:shadow-none">
                <p className="text-sm font-semibold text-base-content">Comments</p>
                <p className="mt-1 text-sm opacity-70">Shared context for the team.</p>
              </div>
            </div>
          </section>

          <section className="lg:justify-self-end text-base-content w-full">{children}</section>
        </div>
      </div>
    </main>
  )
}