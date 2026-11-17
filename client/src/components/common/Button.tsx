// client/src/components/common/Button.tsx — Chuẩn UI_DESIGN_SKILL.md & Design System Teal
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
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0b7a75] dark:focus-visible:ring-[#2dd4bf] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none select-none'

  const variants = {
    // 1. Primary Button (Hành động chính / CTA = pill)
    primary:
      'bg-[#0b7a75] hover:bg-[#08635f] dark:bg-[#2dd4bf] dark:hover:bg-[#14b8a6] text-white dark:text-[#111118] border border-[#111118] dark:border-[#2a2a3a] shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] active:translate-y-[1px] rounded-pill',
    // 1b. Primary Accent (CTA nổi bật = pill)
    accent:
      'bg-[#ffda00] hover:bg-[#ebd000] text-[#111118] border border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[1px] rounded-pill font-semibold',
    // 2. Secondary / Outline Button (Hành động phụ = sm)
    secondary:
      'bg-white dark:bg-[#1b1b26] text-slate-800 dark:text-[#f0f6ff] border border-slate-200 dark:border-[#2a2a3a] hover:bg-slate-50 dark:hover:bg-[#242436] hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs rounded-sm',
    // 3. Ghost Button (Nút trên thanh công cụ = sm)
    ghost:
      'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242436] hover:text-slate-900 dark:hover:text-white rounded-sm',
    // 4. Quiz Answer Button (Riêng cho 4 đáp án trong Phòng thi đấu = sm)
    quiz:
      'bg-white dark:bg-[#1b1b26] text-slate-800 dark:text-[#f0f6ff] border-2 border-slate-200 dark:border-[#2a2a3a] rounded-sm p-4 font-medium shadow-[0_2px_0_0_#e2e8f0] dark:shadow-[0_2px_0_0_#000000] hover:border-[#0b7a75] dark:hover:border-[#2dd4bf] hover:bg-[#e1edff]/40 dark:hover:bg-[#242436] active:translate-y-[2px] active:shadow-none text-left justify-start',
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
