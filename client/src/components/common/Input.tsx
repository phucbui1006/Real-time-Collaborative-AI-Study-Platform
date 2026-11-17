// client/src/components/common/Input.tsx — Chuẩn UI_DESIGN_SKILL.md & Design System Teal
import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-9 rounded-sm border bg-white dark:bg-[#242436] px-3 py-1.5 text-sm text-slate-900 dark:text-[#f0f6ff] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors duration-150 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed ${
              icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-rose-400 dark:border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-600'
                : 'border-slate-200 dark:border-[#2a2a3a] focus:border-[#0b7a75] dark:focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#0b7a75] dark:focus:ring-[#2dd4bf]'
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
