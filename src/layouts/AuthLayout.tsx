import type { PropsWithChildren } from 'react'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_68%)] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-8rem] h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute bottom-[-7rem] right-[-6rem] h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="max-w-xl">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">
              Project Manager
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Organiza proyectos, tareas y comentarios sin perder contexto.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Una interfaz más clara para entrar rápido, revisar el estado del trabajo y concentrarte en lo importante.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-medium text-white">Proyectos</p>
                <p className="mt-1 text-sm text-slate-300">Vista limpia de prioridades y progreso.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-medium text-white">Tareas</p>
                <p className="mt-1 text-sm text-slate-300">Seguimiento claro por estado y detalle.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-medium text-white">Comentarios</p>
                <p className="mt-1 text-sm text-slate-300">Contexto compartido para el equipo.</p>
              </div>
            </div>
          </section>

          <section className="lg:justify-self-end">{children}</section>
        </div>
      </div>
    </main>
  )
}
