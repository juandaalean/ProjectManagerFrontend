import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body items-center text-center py-12">
        <h2 className="card-title text-2xl">{title}</h2>
        {description && <p className="max-w-md text-base-content/70">{description}</p>}
        {action}
      </div>
    </div>
  )
}
