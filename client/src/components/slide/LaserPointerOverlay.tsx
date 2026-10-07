// client/src/components/slide/LaserPointerOverlay.tsx
// Hiển thị con trỏ laser real-time trên slide

import React from 'react'

interface LaserPointer {
  id: string
  x: number
  y: number
  name: string
  color?: string
}

interface LaserPointerOverlayProps {
  pointers: LaserPointer[]
}

export const LaserPointerOverlay: React.FC<LaserPointerOverlayProps> = ({ pointers }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pointers.map((p) => (
        <div
          key={p.id}
          className="absolute transition-all duration-75 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse" />
          <span className="text-[10px] bg-red-950/80 border border-red-500/40 text-red-200 px-1.5 py-0.5 rounded shadow">
            {p.name}
          </span>
        </div>
      ))}
    </div>
  )
}

export default LaserPointerOverlay
