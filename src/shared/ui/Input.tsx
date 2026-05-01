import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="block">
        {label && (
          <span className="text-sm font-semibold tracking-wide text-slate-600">
            {label}
          </span>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={`mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
            } ${className}`}
            {...props}
          />
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 right-3 grid h-9 w-9 place-content-center text-slate-400">
              {icon}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </label>
    )
  }
)

Input.displayName = 'Input'
