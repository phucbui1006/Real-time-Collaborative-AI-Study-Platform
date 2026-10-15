// client/src/components/common/Skeleton.tsx — Chuẩn UI_DESIGN_SKILL.md (Mục 5.2)
import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/70 rounded-md ${className}`}
      {...props}
    />
  )
}

export default Skeleton
