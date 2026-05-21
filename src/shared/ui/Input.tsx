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
<<<<<<< HEAD
      <label htmlFor={id} className="form-control block w-full">
        {label && (
          <span className="label-text mb-1 text-sm font-semibold tracking-wide text-base-content">
            {label}
          </span>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={`input input-bordered bg-base-100 text-base-content placeholder:text-base-content/40 w-full ${error ? 'input-error' : ''} ${icon ? 'pr-11' : ''} ${className}`}
            {...props}
          />
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 right-3 grid h-full place-content-center text-base-content/40">
              {icon}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </label>
=======
      <div className="space-y-1">
        {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
        <input
          ref={ref}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
>>>>>>> 0f34275 (Refactor code for improved readability and consistency across various components)
    )
  },
)

Input.displayName = 'Input'
