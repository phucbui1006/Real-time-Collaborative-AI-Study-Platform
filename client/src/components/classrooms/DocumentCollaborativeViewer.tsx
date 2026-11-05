// client/src/components/classrooms/DocumentCollaborativeViewer.tsx
// Trình chiếu tài liệu nhóm, đồng bộ lật trang, chế độ Xem tự do, chỉnh sửa văn bản realtime và Lưu về thư viện

import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  BookmarkCheck,
  RotateCcw,
  Sparkles,
  Eye,
  FileText,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { supabase } from '../../services/supabaseClient'
import type { RoomDocumentData } from '../../types/classroom'

interface DocumentCollaborativeViewerProps {
  document: RoomDocumentData
  isHost: boolean
  currentUserId?: string
  onPageChange: (pageIndex: number) => void
  onEditPage: (pageIndex: number, newContent: string) => void
  onSaveToLibrary?: () => void
}

export const DocumentCollaborativeViewer: React.FC<DocumentCollaborativeViewerProps> = ({
  document,
  isHost,
  currentUserId,
  onPageChange,
  onEditPage,
}) => {
  const hostPage = document.currentPage || 0
  const [localPage, setLocalPage] = useState<number>(hostPage)
  const [isFreeView, setIsFreeView] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editingContent, setEditingContent] = useState<string>('')
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)

  const editDebounceTimer = useRef<number | null>(null)

  // Khi Host lật trang: nếu không bật chế độ Xem tự do thì tự động theo sát trang của Host
  useEffect(() => {
    if (!isFreeView) {
      setLocalPage(hostPage)
    }
  }, [hostPage, isFreeView])

  const totalPages = Math.max(1, document.totalPages || 0, document.pagesContent?.length || 0)
  const currentPageContent = document.pagesContent?.[localPage] || ''

  // Cập nhật nội dung editor khi đổi trang
  useEffect(() => {
    setEditingContent(currentPageContent)
  }, [localPage, currentPageContent])

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

  // Host gõ văn bản chỉnh sửa với debounce 400ms
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setEditingContent(val)

    if (editDebounceTimer.current) {
      window.clearTimeout(editDebounceTimer.current)
    }
    editDebounceTimer.current = window.setTimeout(() => {
      onEditPage(localPage, val)
    }, 400)
  }

  // Lưu tài liệu đã sửa về Thư viện cá nhân
  const handleSaveToPersonalLibrary = async () => {
    if (saving) return
    setSaving(true)
    try {
      const copyTitle = `${document.title} (Bản học nhóm)`
      const { error } = await supabase.from('documents').insert({
        title: copyTitle,
        original_name: copyTitle,
        filename: `${copyTitle}.md`,
        total_pages: totalPages,
        pages_content: document.pagesContent,
        owner_user_id: currentUserId || null,
        created_at: new Date().toISOString(),
      })

      if (!error) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        alert('Không thể lưu tài liệu: ' + error.message)
      }
    } catch (err: any) {
      alert('Lỗi lưu tài liệu: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Header thanh tài liệu */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
            {document.title}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            (Trang {localPage + 1}/{totalPages})
          </span>
        </div>

        {/* Thanh trạng thái Xem tự do / Đồng bộ Host */}
        <div className="flex items-center gap-2">
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

          {/* Nút Host Bật/Tắt chế độ Chỉnh sửa văn bản */}
          {isHost && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer border ${
                isEditing
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Xong sửa</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Sửa trang này</span>
                </>
              )}
            </button>
          )}

          {/* Nút Lưu về thư viện cá nhân */}
          <button
            onClick={handleSaveToPersonalLibrary}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Lưu bản sao tài liệu hiện tại (bao gồm các nội dung đã sửa) vào Thư viện cá nhân"
          >
            <BookmarkCheck className={`w-3.5 h-3.5 ${saveSuccess ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`} />
            <span>{saveSuccess ? 'Đã lưu!' : saving ? 'Đang lưu…' : 'Lưu vào thư viện'}</span>
          </button>
        </div>
      </div>

      {/* Vùng nội dung trang: Markdown Reader hoặc Editor */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
        {isEditing && isHost ? (
          <div className="flex flex-col h-full gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-teal-600 dark:text-teal-400">
                ✍️ Trình soạn thảo văn bản (Markdown & LaTeX Math)
              </span>
              <span>Các thay đổi được tự động đồng bộ tới mọi người trong phòng</span>
            </div>
            <textarea
              value={editingContent}
              onChange={handleTextChange}
              placeholder="Nhập nội dung slide/trang bài học tại đây (hỗ trợ Markdown, công thức $math$)..."
              className="w-full flex-1 min-h-[300px] p-4 text-sm font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed">
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
              <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 text-teal-500" />
                <p>Trang này hiện chưa có nội dung văn bản.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer điều khiển lật trang */}
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
