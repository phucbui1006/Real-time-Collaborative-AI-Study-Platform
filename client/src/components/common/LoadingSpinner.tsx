// client/src/components/common/LoadingSpinner.tsx
import React from 'react'

interface LoadingSpinnerProps {
  label?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'Đang tải...' }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 p-4">
      <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      {label && <p className="text-sm text-slate-400 font-medium">{label}</p>}
    </div>
  )
}

export default LoadingSpinner
