// client/src/components/common/Button.tsx
import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    primary:
      'bg-indigo-950 text-white hover:bg-indigo-900 border border-indigo-900/50 shadow-xs',
    secondary:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 border border-rose-700/50 shadow-xs'
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 py-2 text-sm',
    lg: 'h-10 px-5 text-sm'
  }

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
