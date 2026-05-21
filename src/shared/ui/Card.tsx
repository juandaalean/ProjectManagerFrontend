import type { PropsWithChildren } from 'react'

interface CardProps extends PropsWithChildren {
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card bg-base-100 shadow-sm ${className}`}>{children}</div>
}
