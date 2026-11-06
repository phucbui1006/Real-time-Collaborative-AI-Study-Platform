// client/src/components/classrooms/DocumentCollaborativeViewer.tsx
// Trình chiếu tài liệu nhóm kết hợp công cụ ghi chú trực quan (Khoanh hình chữ nhật, Highlight, Gõ text) realtime trong phòng học

import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MousePointer,
  Square,
  Highlighter,
  Type,
  Undo2,
  Trash2,
  RotateCcw,
  Sparkles,
  Eye,
  FileText,
  X,
  Plus,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { RoomDocumentData, DocumentAnnotation } from '../../types/classroom'

export type AnnotationTool = 'select' | 'rect' | 'highlight' | 'text'

const ANNOTATION_COLORS = [
  { id: 'red', hex: '#ef4444', label: 'Đỏ khoanh vùng' },
  { id: 'yellow', hex: '#eab308', label: 'Vàng highlight' },
  { id: 'teal', hex: '#0d9488', label: 'Xanh ngọc' },
  { id: 'blue', hex: '#3b82f6', label: 'Xanh dương' },
]

interface DocumentCollaborativeViewerProps {
  document: RoomDocumentData
  isHost: boolean
  currentUserId?: string
  annotations?: DocumentAnnotation[]
  onPageChange: (pageIndex: number) => void
  onUpdateAnnotations?: (pageIndex: number, annotations: DocumentAnnotation[]) => void
  onClearAnnotations?: (pageIndex?: number) => void
}

export const DocumentCollaborativeViewer: React.FC<DocumentCollaborativeViewerProps> = ({
  document,
  isHost,
  annotations = [],
  onPageChange,
  onUpdateAnnotations,
  onClearAnnotations,
}) => {
  const hostPage = document.currentPage || 0
  const [localPage, setLocalPage] = useState<number>(hostPage)
  const [isFreeView, setIsFreeView] = useState<boolean>(false)

  // Trạng thái công cụ ghi chú
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select')
  const [activeColor, setActiveColor] = useState<string>('#ef4444')

  // Trạng thái vẽ kéo thả (Drag drawing)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draftBox, setDraftBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const draftBoxRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Trạng thái gõ Text Note nổi (Lưu tọa độ pixel hiển thị chính xác + tỷ lệ % chuẩn hóa để đồng bộ)
  interface TextInputDraftState {
    ratioX: number
    ratioY: number
    displayX: number
    displayY: number
  }
  const [textInputState, setTextInputState] = useState<TextInputDraftState | null>(null)
  const [textInputValue, setTextInputValue] = useState<string>('')

  const contentWrapperRef = useRef<HTMLDivElement>(null)
  const notePopupRef = useRef<HTMLDivElement>(null)

  // Đổi công cụ vẽ chú thích và tự động hủy ô note dở dang
  const handleSelectTool = (tool: AnnotationTool) => {
    setActiveTool(tool)
    setTextInputState(null)
    setTextInputValue('')
    setIsDrawing(false)
    setDragStart(null)
    setDraftBox(null)
    draftBoxRef.current = null
  }

  // Tự động đóng và biến mất ô note nếu bấm ra ngoài vùng ghi chú khi chưa Enter/Lưu
  useEffect(() => {
    if (!textInputState) return

    const handlePointerDownOutside = (e: MouseEvent | PointerEvent) => {
      if (notePopupRef.current && !notePopupRef.current.contains(e.target as Node)) {
        setTextInputState(null)
        setTextInputValue('')
      }
    }

    window.addEventListener('pointerdown', handlePointerDownOutside, true)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside, true)
    }
  }, [textInputState])

  // Tự động hủy ô ghi chú khi chuyển trang tài liệu
  useEffect(() => {
    setTextInputState(null)
    setTextInputValue('')
  }, [localPage])

  // Tự động theo sát trang của Host nếu không bật Chế độ xem tự do
  useEffect(() => {
    if (!isFreeView) {
      setLocalPage(hostPage)
    }
  }, [hostPage, isFreeView])

  const totalPages = Math.max(1, document.totalPages || 0, document.pagesContent?.length || 0)
  const currentPageContent = document.pagesContent?.[localPage] || ''

  // Xử lý chuyển trang
  const handlePrevPage = () => {
    const next = Math.max(0, localPage - 1)
    setLocalPage(next)
    if (isHost) {
      onPageChange(next)
    } else {
      setIsFreeView(true)
    }
  }

  const handleNextPage = () => {
    const next = Math.min(totalPages - 1, localPage + 1)
    setLocalPage(next)
    if (isHost) {
      onPageChange(next)
    } else {
      setIsFreeView(true)
    }
  }

  const handleBackToHostPage = () => {
    setIsFreeView(false)
    setLocalPage(hostPage)
  }

  // Chuyển đổi tọa độ chuột sang % tương đối theo kích thước contentWrapper (hỗ trợ cả React Event và Window Native Event)
  const getRelativeCoords = (e: MouseEvent | React.MouseEvent) => {
    const el = contentWrapperRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const pxX = e.clientX - rect.left
    const pxY = e.clientY - rect.top
    const width = el.offsetWidth || rect.width || 1
    const height = el.offsetHeight || rect.height || 1
    const x = Math.max(0, Math.min(100, (pxX / width) * 100))
    const y = Math.max(0, Math.min(100, (pxY / height) * 100))
    return { x, y }
  }

  // ─── XỬ LÝ VẼ KHOANH HÌNH CHỮ NHẬT VÀ HIGHLIGHT (HOST) ────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isHost || activeTool === 'select') return

    // Bỏ qua nếu click vào chính popup ghi chú hoặc các nút con bên trong
    if (notePopupRef.current && notePopupRef.current.contains(e.target as Node)) {
      return
    }

    // Bỏ qua nếu bấm vào thanh cuộn trình duyệt (khoảng mép phải container cuộn)
    if (scrollContainerRef.current) {
      const scrollRect = scrollContainerRef.current.getBoundingClientRect()
      if (e.clientX >= scrollRect.right - 16) {
        return
      }
    }

    if (activeTool === 'text') {
      const el = contentWrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      const containerWidth = el.offsetWidth || rect.width || 1
      const containerHeight = el.offsetHeight || rect.height || 1

      // Kích thước ô popup nhập ghi chú: rộng 256px, cao ~112px
      const POPUP_WIDTH = 256
      const POPUP_HEIGHT = 112

      // Clamp vị trí hiển thị để không bị tràn mép phải hoặc mép dưới
      const displayX = Math.max(0, Math.min(Math.max(0, containerWidth - POPUP_WIDTH - 8), clickX))
      const displayY = Math.max(0, Math.min(Math.max(0, containerHeight - POPUP_HEIGHT - 8), clickY))

      // Tỷ lệ chuẩn hóa (%) theo kích thước trang tài liệu tương ứng với vị trí hiển thị của ghi chú
      const ratioX = Math.max(0, Math.min(100, (displayX / containerWidth) * 100))
      const ratioY = Math.max(0, Math.min(100, (displayY / containerHeight) * 100))

      setTextInputState({
        ratioX,
        ratioY,
        displayX,
        displayY,
      })
      setTextInputValue('')
      return
    }

    if (activeTool === 'rect' || activeTool === 'highlight') {
      // Ngăn chặn sự kiện bôi đen chữ của trình duyệt khi bắt đầu kéo vẽ
      e.preventDefault()
      const coords = getRelativeCoords(e)
      setIsDrawing(true)
      setDragStart(coords)
      const box = { x: coords.x, y: coords.y, width: 0, height: 0 }
      draftBoxRef.current = box
      setDraftBox(box)
    }
  }

  // Theo dõi sự kiện di chuyển và nhả chuột toàn cục (window) để nét kéo vẽ luôn mượt mà và không bị đứt đoạn
  useEffect(() => {
    if (!isDrawing || !dragStart || !isHost) return

    const handlePointerMove = (e: MouseEvent) => {
      const current = getRelativeCoords(e)
      const x = Math.min(dragStart.x, current.x)
      const y = Math.min(dragStart.y, current.y)
      const width = Math.abs(current.x - dragStart.x)
      const height = Math.abs(current.y - dragStart.y)

      const box = { x, y, width, height }
      draftBoxRef.current = box
      setDraftBox(box)
    }

    const handlePointerUp = () => {
      const box = draftBoxRef.current
      if (box && box.width > 0.8 && box.height > 0.8) {
        const newAnno: DocumentAnnotation = {
          id: `anno_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: activeTool === 'highlight' ? 'highlight' : 'rect',
          x: Number(box.x.toFixed(2)),
          y: Number(box.y.toFixed(2)),
          width: Number(box.width.toFixed(2)),
          height: Number(box.height.toFixed(2)),
          color: activeColor,
          createdAt: Date.now(),
        }
        onUpdateAnnotations?.(localPage, [...annotations, newAnno])
      }

      setIsDrawing(false)
      setDragStart(null)
      setDraftBox(null)
      draftBoxRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDrawing, dragStart, isHost, activeTool, activeColor, localPage, annotations, onUpdateAnnotations])

  // ─── XỬ LÝ GÕ TEXT NOTE ──────────────────────────────────────────────────
  const handleAddTextAnnotation = () => {
    if (!textInputState || !textInputValue.trim()) {
      setTextInputState(null)
      return
    }

    const newAnno: DocumentAnnotation = {
      id: `anno_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'text',
      x: Number(textInputState.ratioX.toFixed(2)),
      y: Number(textInputState.ratioY.toFixed(2)),
      width: 0,
      height: 0,
      color: activeColor,
      text: textInputValue.trim(),
      createdAt: Date.now(),
    }

    onUpdateAnnotations?.(localPage, [...annotations, newAnno])
    setTextInputState(null)
    setTextInputValue('')
  }

  // Hoàn tác nét gần nhất
  const handleUndo = () => {
    if (annotations.length === 0) return
    onUpdateAnnotations?.(localPage, annotations.slice(0, -1))
  }

  // Xóa toàn bộ chú thích trang này
  const handleClearAll = () => {
    if (annotations.length === 0) return
    onClearAnnotations?.(localPage)
  }

  // Xóa một chú thích cụ thể
  const handleDeleteAnnotation = (id: string) => {
    if (!isHost) return
    onUpdateAnnotations?.(localPage, annotations.filter((a) => a.id !== id))
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden select-none">
      {/* ─── 1. HEADER: TÊN TÀI LIỆU & THANH CÔNG CỤ CHÚ THÍCH (ANNOTATION TOOLBAR) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
        {/* Tên tài liệu và số trang */}
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[160px] sm:max-w-xs">
            {document.title}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
            (Trang {localPage + 1}/{totalPages})
          </span>
        </div>

        {/* Cụm công cụ chú thích (Chủ phòng điều khiển, thành viên xem) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isHost ? (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs">
              {/* Con trỏ bình thường */}
              <button
                onClick={() => handleSelectTool('select')}
                className={`h-7 px-2 rounded flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTool === 'select'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Chuột trỏ (Đọc tài liệu bình thường)"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Trỏ</span>
              </button>

              {/* Khoanh hình chữ nhật */}
              <button
                onClick={() => handleSelectTool('rect')}
                className={`h-7 px-2 rounded flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTool === 'rect'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Khoanh vùng bằng hình chữ nhật kéo thả"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Khoanh vùng</span>
              </button>

              {/* Bút Highlight */}
              <button
                onClick={() => handleSelectTool('highlight')}
                className={`h-7 px-2 rounded flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTool === 'highlight'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Tô màu highlight đánh dấu văn bản"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Highlight</span>
              </button>

              {/* Gõ chữ ghi chú */}
              <button
                onClick={() => handleSelectTool('text')}
                className={`h-7 px-2 rounded flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeTool === 'text'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Click vào trang để thêm chữ ghi chú"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Ghi chú</span>
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

              {/* Bảng chọn màu nét */}
              <div className="flex items-center gap-1 px-1">
                {ANNOTATION_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveColor(c.hex)}
                    className={`h-4 w-4 rounded-full transition-transform cursor-pointer ${
                      activeColor === c.hex ? 'scale-125 ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-900' : 'hover:scale-110 opacity-80'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

              {/* Hoàn tác (Undo) */}
              <button
                onClick={handleUndo}
                disabled={annotations.length === 0}
                className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Hoàn tác nét gần nhất (Ctrl + Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              {/* Xóa tất cả nét trang này */}
              <button
                onClick={handleClearAll}
                disabled={annotations.length === 0}
                className="h-7 w-7 rounded flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Xóa toàn bộ chú thích trên trang này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs border border-teal-200 dark:border-teal-800">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Chế độ xem chú thích trực tiếp từ Chủ phòng</span>
            </div>
          )}

          {/* Nút quay lại trang của Host cho thành viên đang xem tự do */}
          {!isHost && isFreeView && (
            <button
              onClick={handleBackToHostPage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-pill bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 transition-colors cursor-pointer shadow-xs animate-pulse"
              title="Quay lại trang mà chủ phòng đang trình bày"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Về trang Host (Trang {hostPage + 1})</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. VÙNG NỘI DUNG TÀI LIỆU VÀ LỚP PHỦ CHÚ THÍCH TRỰC QUAN ─────────── */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        className={`flex-1 overflow-y-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 ${
          isHost && activeTool !== 'select' ? 'cursor-crosshair select-none' : 'cursor-default'
        }`}
      >
        <div
          ref={contentWrapperRef}
          className={`relative min-h-full max-w-4xl mx-auto p-4 sm:p-8 ${
            isHost && activeTool !== 'select' ? 'cursor-crosshair select-none' : 'cursor-default'
          }`}
        >
          {/* Nội dung bài học Markdown */}
          <div
            className={`prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed ${
              isHost && activeTool !== 'select' ? 'select-none pointer-events-none' : 'select-text'
            }`}
          >
            {currentPageContent ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  img: ({ node, ...props }) => (
                    <img
                      {...props}
                      alt={props.alt || 'Tài liệu'}
                      className="max-h-[420px] mx-auto rounded-md object-contain my-4 shadow-sm"
                    />
                  ),
                }}
              >
                {currentPageContent}
              </ReactMarkdown>
            ) : (
              <div className="py-20 text-center text-slate-400 dark:text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-teal-500" />
                <p>Trang này hiện chưa có nội dung văn bản.</p>
              </div>
            )}
          </div>

          {/* ─── 3. LỚP PHỦ SVG & HTML HIỂN THỊ CÁC CHÚ THÍCH / KHOANH VÙNG ─── */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            {/* 1. Các nét khoanh vùng hình chữ nhật & highlight đã lưu */}
            {annotations.map((anno) => {
              if (anno.type === 'rect') {
                return (
                  <rect
                    key={anno.id}
                    x={`${anno.x}%`}
                    y={`${anno.y}%`}
                    width={`${anno.width}%`}
                    height={`${anno.height}%`}
                    fill={`${anno.color}15`}
                    stroke={anno.color}
                    strokeWidth="2.5"
                    strokeDasharray="none"
                    rx="4"
                    className="transition-all"
                  />
                )
              }
              if (anno.type === 'highlight') {
                return (
                  <rect
                    key={anno.id}
                    x={`${anno.x}%`}
                    y={`${anno.y}%`}
                    width={`${anno.width}%`}
                    height={`${anno.height}%`}
                    fill={`${anno.color}50`}
                    stroke={anno.color}
                    strokeWidth="1"
                    rx="3"
                    className="mix-blend-multiply dark:mix-blend-screen"
                  />
                )
              }
              return null
            })}

            {/* 2. Hình chữ nhật / highlight nháp đang kéo chuột (Draft Preview) */}
            {isDrawing && draftBox && (
              <rect
                x={`${draftBox.x}%`}
                y={`${draftBox.y}%`}
                width={`${draftBox.width}%`}
                height={`${draftBox.height}%`}
                fill={activeTool === 'highlight' ? `${activeColor}40` : `${activeColor}20`}
                stroke={activeColor}
                strokeWidth="2"
                strokeDasharray={activeTool === 'rect' ? '4 2' : 'none'}
                rx="4"
              />
            )}
          </svg>

          {/* ─── 4. CÁC HỘP CHỮ GHI CHÚ (TEXT NOTES) ĐẶT TRÊN TRANG ─────────── */}
          {annotations.map((anno) => {
            if (anno.type !== 'text' || !anno.text) return null
            return (
              <div
                key={anno.id}
                style={{
                  left: `${anno.x}%`,
                  top: `${anno.y}%`,
                  borderColor: anno.color,
                }}
                className="absolute z-20 max-w-xs group pointer-events-auto"
              >
                <div
                  style={{ backgroundColor: `${anno.color}20`, borderLeftColor: anno.color }}
                  className="px-2.5 py-1.5 rounded-r-lg bg-white/95 dark:bg-slate-900/95 shadow-md border-l-4 border text-xs text-slate-800 dark:text-slate-100 font-sans flex items-start gap-1.5 backdrop-blur-xs"
                >
                  <span className="flex-1 whitespace-pre-wrap leading-relaxed">{anno.text}</span>
                  {isHost && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAnnotation(anno.id)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-0.5 cursor-pointer"
                      title="Xóa ghi chú này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Ô nhập Text Note nổi khi Host bấm tool 'text' */}
          {textInputState && isHost && (
            <div
              ref={notePopupRef}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                left: `${textInputState.displayX}px`,
                top: `${textInputState.displayY}px`,
              }}
              className="absolute z-30 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-500 shadow-2xl flex flex-col gap-1.5 w-64"
            >
              <textarea
                autoFocus
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddTextAnnotation()
                  } else if (e.key === 'Escape') {
                    setTextInputState(null)
                    setTextInputValue('')
                  }
                }}
                placeholder="Nhập ghi chú tại đây (Enter để lưu, Esc để hủy)..."
                className="w-full h-16 p-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[10px] text-slate-400">Enter để xong</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setTextInputState(null)
                      setTextInputValue('')
                    }}
                    className="h-6 px-2 rounded-lg text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAddTextAnnotation}
                    className="h-6 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Lưu</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. FOOTER: THANH CHUYỂN TRANG ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={localPage === 0}
            className="flex items-center justify-center h-8 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-0.5" />
            <span>Trang trước</span>
          </button>
          <button
            onClick={handleNextPage}
            disabled={localPage >= totalPages - 1}
            className="flex items-center justify-center h-8 px-2.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
          Trang <span className="font-bold text-teal-600 dark:text-teal-400">{localPage + 1}</span> / {totalPages}
        </div>

        {!isHost && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-teal-500" />
            <span>{isFreeView ? 'Chế độ xem tự do' : 'Đang theo dõi Host'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
