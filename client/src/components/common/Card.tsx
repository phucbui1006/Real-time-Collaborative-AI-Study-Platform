// client/src/components/common/Card.tsx — Chuẩn UI_DESIGN_SKILL.md & Design System Teal
import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }

  const baseStyle =
    'bg-white dark:bg-[#1b1b26] rounded-md border border-slate-200/90 dark:border-[#2a2a3a] shadow-2xs text-slate-800 dark:text-[#f0f6ff]'
  const hoverStyle = hoverable
    ? 'hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-[#242436] transition-colors duration-150 cursor-pointer'
    : ''

  return (
    <div
      className={`${baseStyle} ${paddingMap[padding]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mb-4 flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-semibold text-slate-900 dark:text-[#f0f6ff] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
)

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-500 dark:text-slate-400 mt-0.5 ${className}`} {...props}>
    {children}
  </p>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => <div className={className} {...props}>{children}</div>

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mt-4 pt-3 border-t border-slate-100 dark:border-[#2a2a3a] flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
)

export default Card
