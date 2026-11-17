// client/src/components/mindmap/MindmapViewer.tsx
// Component sơ đồ tư duy tương tác cho bài học

import React from 'react'

export interface MindmapData {
  id: string
  label: string
  children?: MindmapData[]
}

interface MindmapViewerProps {
  data?: MindmapData
}

export const MindmapViewer: React.FC<MindmapViewerProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[400px] bg-slate-50 dark:bg-[#1b1b26] border border-slate-200/90 dark:border-[#2a2a3a] rounded-lg p-6 flex flex-col items-center justify-center">
      {data ? (
        <div className="space-y-6 text-center">
          <div className="inline-block bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] font-normal text-sm px-5 py-2.5 rounded-pill shadow-[0_2px_0_0_#111118] border border-[#111118]">
            {data.label}
          </div>
          {data.children && (
            <div className="flex flex-wrap justify-center gap-3 pt-6 border-t border-slate-200 dark:border-[#2a2a3a]">
              {data.children.map((child) => (
                <div key={child.id} className="bg-white dark:bg-[#242436] border border-slate-200 dark:border-[#2a2a3a] text-slate-800 dark:text-[#f0f6ff] px-3.5 py-1.5 rounded-sm text-xs font-normal shadow-2xs">
                  {child.label}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500">Chưa có sơ đồ tư duy nào được tạo</p>
      )}
    </div>
  )
}

export default MindmapViewer
