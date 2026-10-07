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
    <div className="w-full h-full min-h-[400px] bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center">
      {data ? (
        <div className="space-y-4 text-center">
          <div className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg border border-indigo-400">
            {data.label}
          </div>
          {data.children && (
            <div className="flex justify-center space-x-6 pt-6 border-t border-slate-800">
              {data.children.map((child) => (
                <div key={child.id} className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm">
                  {child.label}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-slate-500">Chưa có sơ đồ tư duy nào được tạo</p>
      )}
    </div>
  )
}

export default MindmapViewer
