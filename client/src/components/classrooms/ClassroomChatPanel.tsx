// client/src/components/classrooms/ClassroomChatPanel.tsx
// Khung trò chuyện nhóm thời gian thực, tự cuộn, phân biệt người gửi và hỗ trợ emoji/giơ tay

import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, X, Users, Sparkles } from 'lucide-react'
import type { ChatMessage } from '../../types/classroom'

interface ClassroomChatPanelProps {
  open: boolean
  messages: ChatMessage[]
  currentUserId?: string
  membersCount: number
  onClose: () => void
  onOpenMembers: () => void
  onSendMessage: (text: string) => void
}

export const ClassroomChatPanel: React.FC<ClassroomChatPanelProps> = ({
  open,
  messages,
  currentUserId,
  membersCount,
  onClose,
  onOpenMembers,
  onSendMessage,
}) => {
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) {
      onSendMessage(trimmed)
      setText('')
    }
  }

  if (!open) return null

  return (
    <aside
      className="w-full sm:w-80 md:w-88 h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shrink-0 z-20 shadow-xl transition-all"
      aria-label="Khung trò chuyện trong phòng học"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 tracking-tight">
            Tin nhắn trong phòng
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenMembers}
            className="flex h-7 px-2 items-center gap-1 rounded text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={`Xem danh sách người tham gia (${membersCount})`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="font-mono">{membersCount}</span>
          </button>
          <button
            onClick={onClose}
            aria-label="Đóng bảng chat"
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nội dung danh sách tin nhắn */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-[#070b12]/50 text-xs sm:text-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 p-4">
            <Sparkles className="w-8 h-8 text-teal-500/40 mb-2" />
            <p className="font-medium text-xs">Chưa có tin nhắn nào</p>
            <p className="text-[11px] mt-1 text-slate-400">Hãy gửi lời chào tới mọi người trong phòng học nhé!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.me || (currentUserId && msg.senderId === currentUserId)
            const initial = msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                    isMe
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {initial}
                </div>

                {/* Bong bóng tin nhắn */}
                <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 px-1 mb-0.5 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {isMe ? 'Bạn' : msg.senderName}
                    </span>
                    <span>{msg.time}</span>
                  </div>
                  <div
                    className={`px-3 py-2 rounded text-xs leading-relaxed break-words shadow-2xs ${
                      isMe
                        ? 'bg-teal-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Form nhập tin nhắn */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhắn tin tới mọi người…"
          maxLength={1000}
          className="flex-1 h-9 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="h-9 px-3 rounded bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
          title="Gửi tin nhắn"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </aside>
  )
}
