// client/src/components/mindmap/CustomNode.tsx
// Component Node tùy chỉnh trong Sơ đồ tư duy React Flow

import React from 'react'

interface CustomNodeProps {
  label: string
  subtext?: string
}

export const CustomNode: React.FC<CustomNodeProps> = ({ label, subtext }) => {
  return (
    <div className="px-4 py-2 bg-slate-900 border border-indigo-500/50 rounded-lg shadow-md text-white text-center">
      <p className="font-semibold text-sm">{label}</p>
      {subtext && <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  )
}

export default CustomNode
