// client/src/components/classrooms/ClassroomDrawer.tsx
// Ngăn kéo đa năng bên phải (Desktop Drawer / Mobile Bottom Sheet) tích hợp 2 Tab: "Thành viên" & "Trò chuyện"

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Users,
  MessageSquare,
  Send,
  Search,
  Crown,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  UserX,
  VolumeX,
  ArrowRightLeft,
  Shield,
  Hand,
} from 'lucide-react'
import type { RoomMember, ChatMessage } from '../../types/classroom'

interface ClassroomDrawerProps {
  open: boolean
  activeTab: 'members' | 'chat'
  onTabChange: (tab: 'members' | 'chat') => void
  onClose: () => void
  members: RoomMember[]
  messages: ChatMessage[]
  currentUserId?: string
  currentSocketId?: string
  isHost: boolean
  allowMemberScreenShare: boolean
  unreadCount?: number
  onSendMessage: (text: string) => void
  onMuteMember?: (socketId: string) => void
  onKickMember?: (socketId: string) => void
  onTransferHost?: (socketId: string) => void
  onToggleScreenSharePermission?: (allow: boolean) => void
  onSetMemberRole?: (socketId: string, role: 'speaker' | 'viewer') => void
}

const QUICK_EMOJIS = ['👍', '❤️', '👏', '🎉', '💡', '🙋‍♂️']

export const ClassroomDrawer: React.FC<ClassroomDrawerProps> = ({
  open,
  activeTab,
  onTabChange,
  onClose,
  members,
  messages,
  currentUserId,
  currentSocketId,
  isHost,
  allowMemberScreenShare,
  unreadCount = 0,
  onSendMessage,
  onMuteMember,
  onKickMember,
  onTransferHost,
  onToggleScreenSharePermission,
  onSetMemberRole,
}) => {
  const [chatInput, setChatInput] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberActions, setSelectedMemberActions] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc khi chuyển sang tab chat
  useEffect(() => {
    if (open && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      chatInputRef.current?.focus()
    }
  }, [messages, open, activeTab])

  // Lắng nghe phím Esc để đóng drawer
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSendChat = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = chatInput.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setChatInput('')
  }

  const handleSendEmoji = (emoji: string) => {
    onSendMessage(emoji)
  }

  const filteredMembers = members.filter((m) =>
    (m.userName || '').toLowerCase().includes(memberSearch.toLowerCase())
  )

  return (
    <>
      {/* Backdrop mờ cho màn hình nhỏ */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        aria-hidden="true"
      />

      <aside
        className="fixed lg:relative inset-x-0 bottom-0 lg:inset-auto h-[78vh] lg:h-full w-full lg:w-88 xl:w-96 flex flex-col bg-[#0B1220]/95 backdrop-blur-2xl border-t lg:border-t-0 lg:border-l border-slate-800/80 shadow-2xl z-40 rounded-t-2xl lg:rounded-none overflow-hidden select-none transition-transform duration-200"
        aria-label="Bảng thông tin phòng học"
      >
        {/* Handle bar nhỏ trên mobile */}
        <div className="lg:hidden flex items-center justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* ─── 1. HEADER DRAWER: 2 TABS CHUYỂN ĐỔI (THÀNH VIÊN / CHAT) ─── */}
        <div className="flex items-center justify-between px-3 sm:px-4 h-13 border-b border-slate-800/80 bg-[#0F172A]/70 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800/60">
            {/* Tab Thành viên */}
            <button
              onClick={() => onTabChange('members')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Thành viên</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'members' ? 'bg-teal-700 text-teal-100' : 'bg-slate-800 text-slate-400'
              }`}>
                {members.length}
              </span>
            </button>

            {/* Tab Trò chuyện */}
            <button
              onClick={() => onTabChange('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold relative transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Trò chuyện</span>
              {unreadCount > 0 && activeTab !== 'chat' && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Đóng ngăn kéo (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── 2. NỘI DUNG TAB 1: THÀNH VIÊN (DANH SÁCH & QUẢN TRỊ) ─────── */}
        {activeTab === 'members' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Ô tìm kiếm thành viên */}
            <div className="p-3 border-b border-slate-800/60 bg-[#0F172A]/40 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm thành viên trong phòng..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              {/* Tùy chọn quyền Host: Cho phép thành viên chia sẻ màn hình */}
              {isHost && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-400" />
                    <span>Cho phép thành viên chia sẻ màn hình</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowMemberScreenShare}
                      onChange={(e) => onToggleScreenSharePermission?.(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600" />
                  </label>
                </div>
              )}
            </div>

            {/* Danh sách người tham gia */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
              {filteredMembers.map((member) => {
                const isMe =
                  (currentSocketId && member.socketId === currentSocketId) ||
                  member.socketId === 'local-me' ||
                  (currentUserId && member.userId === currentUserId)

                const isMemberHost = member.role === 'host'
                const showActions = selectedMemberActions === member.socketId

                return (
                  <div
                    key={member.socketId}
                    className={`pt-1.5 pb-1 px-2.5 rounded-xl transition-all ${
                      member.isSpeaking
                        ? 'bg-teal-950/30 border border-teal-800/40 ring-1 ring-teal-500/20'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm relative"
                          style={{ backgroundColor: member.avatarColor || '#0ea5e9' }}
                        >
                          {member.userName?.slice(0, 1).toUpperCase() || 'U'}
                          {member.isSpeaking && (
                            <span className="absolute inset-0 rounded-full ring-2 ring-teal-400 animate-ping opacity-60" />
                          )}
                        </div>

                        {/* Tên & Role */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-200 truncate">
                              {member.userName}
                            </span>
                            {isMe && (
                              <span className="text-[10px] text-teal-400 font-medium shrink-0">
                                (Bạn)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap gap-1 mt-0.5">
                            {isMemberHost ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                                <Crown className="w-2.5 h-2.5 text-amber-400" />
                                <span>Chủ phòng</span>
                              </span>
                            ) : member.role === 'speaker' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-teal-950/60 text-teal-300 border border-teal-800/60">
                                <span>Diễn giả</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-800/70 text-slate-400 border border-slate-700/60">
                                <span>Người xem</span>
                              </span>
                            )}
                            {member.isHandRaised && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                <Hand className="w-2.5 h-2.5 text-amber-400" />
                                <span>Giơ tay</span>
                              </span>
                            )}
                            {member.isScreenSharing && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-400">
                                <Monitor className="w-3 h-3" />
                                <span>Đang chiếu</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Trạng thái Mic / Cam + Menu Chủ phòng */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Nút duyệt nhanh giơ tay dành cho Host */}
                        {isHost && !isMe && member.isHandRaised && (
                          <button
                            onClick={() => onSetMemberRole?.(member.socketId, 'speaker')}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-semibold transition-colors cursor-pointer shadow-xs animate-bounce"
                            title="Duyệt cho thành viên phát biểu"
                          >
                            <span>Duyệt ✋</span>
                          </button>
                        )}
                        {/* Biểu tượng Micro */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                            member.isMicOn
                              ? 'text-teal-400 bg-teal-950/40 border border-teal-800/40'
                              : 'text-rose-400 bg-rose-950/30 border border-rose-800/40'
                          }`}
                          title={member.isMicOn ? 'Micro đang bật' : 'Micro đã tắt'}
                        >
                          {member.isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                        </div>

                        {/* Biểu tượng Camera */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                            member.isCamOn
                              ? 'text-teal-400 bg-teal-950/40 border border-teal-800/40'
                              : 'text-slate-500 bg-slate-900 border border-slate-800'
                          }`}
                          title={member.isCamOn ? 'Camera đang bật' : 'Camera đã tắt'}
                        >
                          {member.isCamOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                        </div>

                        {/* Nút tác vụ Host (nếu mình là Host và người kia không phải mình) */}
                        {isHost && !isMe && (
                          <button
                            onClick={() =>
                              setSelectedMemberActions(showActions ? null : member.socketId)
                            }
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer ml-1"
                            title="Quản trị thành viên này"
                          >
                            <span className="font-bold text-xs tracking-tighter">•••</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Menu tác vụ quản trị khi Host bấm ••• */}
                    {isHost && !isMe && showActions && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center flex-wrap gap-1.5 justify-end">
                        {member.role === 'speaker' ? (
                          <button
                            onClick={() => {
                              onSetMemberRole?.(member.socketId, 'viewer')
                              setSelectedMemberActions(null)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-colors cursor-pointer"
                            title="Chuyển thành Người xem (chỉ nghe/xem)"
                          >
                            <span>Hạ quyền Viewer</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onSetMemberRole?.(member.socketId, 'speaker')
                              setSelectedMemberActions(null)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-800/60 text-[10px] font-medium transition-colors cursor-pointer"
                            title="Cấp quyền phát biểu và ghi chú"
                          >
                            <span>Cấp quyền Speaker</span>
                          </button>
                        )}
                        {member.isMicOn && (
                          <button
                            onClick={() => {
                              onMuteMember?.(member.socketId)
                              setSelectedMemberActions(null)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-[10px] font-medium transition-colors cursor-pointer"
                          >
                            <VolumeX className="w-3 h-3" />
                            <span>Tắt mic</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Chuyển quyền Chủ phòng cho ${member.userName}?`)) {
                              onTransferHost?.(member.socketId)
                              setSelectedMemberActions(null)
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Giao quyền Host</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Mời ${member.userName} rời khỏi phòng?`)) {
                              onKickMember?.(member.socketId)
                              setSelectedMemberActions(null)
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Mời ra</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── 3. NỘI DUNG TAB 2: TRÒ CHUYỆN (MESSAGES & INPUT) ──────────── */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Vùng hiển thị tin nhắn */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">Chưa có tin nhắn nào</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                    Hãy bắt đầu trao đổi bài học hoặc thả cảm xúc cho nhóm nhé!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine =
                    msg.me ||
                    (currentUserId && msg.senderId === currentUserId) ||
                    msg.senderName.includes('(Bạn)')

                  const isHandRaise = msg.text.includes('✋')

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {isMine ? 'Bạn' : msg.senderName}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">{msg.time}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-sm ${
                          isHandRaise
                            ? 'bg-amber-950/70 text-amber-200 border border-amber-700/60 font-medium'
                            : isMine
                            ? 'bg-teal-600 text-white rounded-tr-xs'
                            : 'bg-slate-800/90 text-slate-100 border border-slate-700/50 rounded-tl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Dải Emoji nhanh */}
            <div className="px-3 pt-2 pb-1 border-t border-slate-800/60 bg-[#0F172A]/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-500 font-medium">Biểu cảm nhanh:</span>
              <div className="flex items-center gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendEmoji(emoji)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-sm transition-transform hover:scale-120 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Khung nhập tin nhắn */}
            <form
              onSubmit={handleSendChat}
              className="p-3 border-t border-slate-800/80 bg-[#0B1220] shrink-0"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Gửi tin nhắn trong phòng (Enter)..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="h-8.5 w-8.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
                  title="Gửi tin nhắn"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </aside>
    </>
  )
}
