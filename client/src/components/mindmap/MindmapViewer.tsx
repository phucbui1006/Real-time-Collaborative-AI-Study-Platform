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
    <div className="w-full h-full min-h-[400px] bg-slate-50 border border-slate-200/90 rounded-lg p-6 flex flex-col items-center justify-center">
      {data ? (
        <div className="space-y-6 text-center">
          <div className="inline-block bg-indigo-950 text-white font-semibold text-sm px-5 py-2.5 rounded-md shadow-xs border border-indigo-900">
            {data.label}
          </div>
          {data.children && (
            <div className="flex flex-wrap justify-center gap-3 pt-6 border-t border-slate-200">
              {data.children.map((child) => (
                <div key={child.id} className="bg-white border border-slate-200 text-slate-800 px-3.5 py-1.5 rounded-md text-xs font-medium shadow-2xs">
                  {child.label}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Chưa có sơ đồ tư duy nào được tạo</p>
      )}
    </div>
  )
}

export default MindmapViewer
