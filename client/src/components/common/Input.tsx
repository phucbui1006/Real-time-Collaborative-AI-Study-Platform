// client/src/components/common/Input.tsx — Chuẩn UI_DESIGN_SKILL.md
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
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-9 rounded-md border bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-150 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
              icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-600'
                : 'border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
