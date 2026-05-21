import type { ButtonHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
<<<<<<< HEAD
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const baseClasses = 'btn font-medium disabled:cursor-not-allowed disabled:opacity-50'
=======
  ({ variant = 'primary', className = '', ...props }, ref) => {
    const baseClasses =
      'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
>>>>>>> 0f34275 (Refactor code for improved readability and consistency across various components)
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-ghost',
      danger: 'btn-error text-error-content',
    }
    const sizeClasses = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    }

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
