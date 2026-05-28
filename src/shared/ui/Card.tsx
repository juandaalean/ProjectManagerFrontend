import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react'

interface CardProps extends PropsWithChildren, ComponentPropsWithoutRef<'div'> {
  className?: string
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`card bg-base-100 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  )
}
