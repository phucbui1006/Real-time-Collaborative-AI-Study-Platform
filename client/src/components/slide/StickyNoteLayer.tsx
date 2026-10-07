// client/src/components/slide/StickyNoteLayer.tsx
// Lớp ghi chú dán (Sticky Notes) trên slide

import React from 'react'

export interface StickyNote {
  id: string
  text: string
  x: number
  y: number
  author: string
  color?: string
}

interface StickyNoteLayerProps {
  notes: StickyNote[]
}

export const StickyNoteLayer: React.FC<StickyNoteLayerProps> = ({ notes }) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {notes.map((note) => (
        <div
          key={note.id}
          className="absolute pointer-events-auto w-40 p-3 bg-amber-200 text-amber-950 rounded-lg shadow-lg border border-amber-300 text-xs transform -rotate-1 hover:rotate-0 transition duration-150"
          style={{ left: `${note.x}%`, top: `${note.y}%` }}
        >
          <p className="font-semibold mb-1">{note.text}</p>
          <span className="text-[10px] text-amber-700 block text-right">— {note.author}</span>
        </div>
      ))}
    </div>
  )
}

export default StickyNoteLayer
