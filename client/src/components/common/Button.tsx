// client/src/components/common/Button.tsx — Chuẩn UI_DESIGN_SKILL.md (Mục 3.3)
import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'quiz' | 'danger'
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
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none'

  const variants = {
    // 1. Primary Button (Hành động chính / CTA = pill)
    primary:
      'bg-indigo-950 text-white hover:bg-indigo-900 shadow-2xs active:translate-y-[1px] border border-indigo-900/60 rounded-pill',
    // 1b. Primary Accent (CTA nổi bật = pill)
    accent:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs active:translate-y-[1px] border border-indigo-500/60 rounded-pill',
    // 2. Secondary / Outline Button (Hành động phụ = sm)
    secondary:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs rounded-sm',
    // 3. Ghost Button (Nút trên thanh công cụ = sm)
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-sm',
    // 4. Quiz Answer Button (Riêng cho 4 đáp án trong Phòng thi đấu = sm)
    quiz:
      'bg-white text-slate-800 border-2 border-slate-200 rounded-sm p-4 font-medium shadow-[0_2px_0_0_#e2e8f0] hover:border-indigo-500 hover:bg-indigo-50/30 active:translate-y-[2px] active:shadow-none text-left justify-start',
    // 5. Danger Button (Hành động nguy hiểm/xóa = sm)
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 border border-rose-700/50 shadow-2xs active:translate-y-[1px] rounded-sm'
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 py-2 text-sm',
    lg: 'h-10 px-5 text-sm'
  }

  const appliedSize = variant === 'quiz' ? '' : sizes[size]

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${appliedSize} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
