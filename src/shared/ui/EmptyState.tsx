import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {action}
    </div>
  )
}
