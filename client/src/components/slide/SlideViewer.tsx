// client/src/components/slide/SlideViewer.tsx
// Trình chiếu Slide PDF / PPTX

import React from 'react'

interface SlideViewerProps {
  documentUrl?: string
  currentPage?: number
  onPageChange?: (page: number) => void
}

export const SlideViewer: React.FC<SlideViewerProps> = ({
  documentUrl,
  currentPage = 1,
  onPageChange
}) => {
  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-4">
      {documentUrl ? (
        <div className="text-center">
          <p className="text-slate-300 font-medium mb-2">Đang trình chiếu trang {currentPage}</p>
          <div className="w-full max-w-3xl aspect-[16/9] bg-slate-900 rounded border border-slate-800 flex items-center justify-center text-slate-500">
            [Khung xem slide document]
          </div>
        </div>
      ) : (
        <p className="text-slate-500">Chưa có tài liệu nào được chọn để trình chiếu</p>
      )}

      {onPageChange && (
        <div className="absolute bottom-4 flex items-center space-x-3 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-800">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm"
          >
            Trang trước
          </button>
          <span className="text-sm font-medium text-slate-300">Trang {currentPage}</span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  )
}

export default SlideViewer
