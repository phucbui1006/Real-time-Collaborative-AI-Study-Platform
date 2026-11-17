// client/src/components/mindmap/CustomNode.tsx
// Component Node tùy chỉnh trong Sơ đồ tư duy React Flow

import React from 'react'

interface CustomNodeProps {
  label: string
  subtext?: string
}

export const CustomNode: React.FC<CustomNodeProps> = ({ label, subtext }) => {
  return (
    <div className="px-4 py-2 bg-white dark:bg-[#1b1b26] border-2 border-[#111118] dark:border-[#2a2a3a] rounded-md shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] text-[#111118] dark:text-[#f0f6ff] text-center">
      <p className="font-semibold text-sm">{label}</p>
      {subtext && <p className="text-[10px] text-[#0b7a75] dark:text-[#2dd4bf] mt-0.5">{subtext}</p>}
    </div>
  )
}

export default CustomNode
