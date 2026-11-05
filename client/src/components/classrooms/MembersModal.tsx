// client/src/components/classrooms/MembersModal.tsx
// Danh sách thành viên thời gian thực kèm công cụ quản trị của Chủ phòng (Tắt mic, Mời ra, Chuyển quyền)

import React, { useState, useEffect } from 'react'
import {
  X,
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
} from 'lucide-react'
import type { RoomMember } from '../../types/classroom'

interface MembersModalProps {
  open: boolean
  onClose: () => void
  members: RoomMember[]
  currentSocketId?: string
  isHost: boolean
  allowMemberScreenShare: boolean
  onMuteMember?: (socketId: string) => void
  onKickMember?: (socketId: string) => void
  onTransferHost?: (socketId: string) => void
  onToggleScreenSharePermission?: (allow: boolean) => void
}

export const MembersModal: React.FC<MembersModalProps> = ({
  open,
  onClose,
  members,
  currentSocketId,
  isHost,
  allowMemberScreenShare,
  onMuteMember,
  onKickMember,
  onTransferHost,
  onToggleScreenSharePermission,
}) => {
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const filteredMembers = members.filter((m) =>
    (m.userName || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách thành viên trong phòng"
        className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
              <span>Mọi người trong phòng</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {members.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Kết nối trực tiếp qua mạng lưới WebRTC Mesh P2P
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="mt-3 relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên thành viên…"
            className="w-full h-9 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
          />
        </div>

        {/* Cài đặt phòng dành cho Chủ phòng */}
        {isHost && onToggleScreenSharePermission && (
          <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Cho phép thành viên chia sẻ màn hình
            </span>
            <input
              type="checkbox"
              checked={allowMemberScreenShare}
              onChange={(e) => onToggleScreenSharePermission(e.target.checked)}
              className="h-4 w-4 accent-teal-600 cursor-pointer"
            />
          </div>
        )}

        {/* Danh sách thành viên */}
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {filteredMembers.map((m) => {
            const isMe = m.socketId === currentSocketId
            const initial = m.userName ? m.userName.charAt(0).toUpperCase() : 'U'

            return (
              <li
                key={m.socketId}
                className="flex items-center justify-between rounded p-2.5 border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                {/* Thông tin avatar & tên */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 shadow-sm"
                    style={{ background: m.avatarColor || '#0ea5e9' }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                      <span className="truncate">{m.userName}</span>
                      {isMe && <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">(Bạn)</span>}
                      {m.role === 'host' && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shrink-0">
                          <Crown className="w-2.5 h-2.5" />
                          <span>Chủ phòng</span>
                        </span>
                      )}
                    </div>

                    {/* Trạng thái mic / cam */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        {m.isMicOn ? (
                          <Mic className="w-3 h-3 text-teal-500" />
                        ) : (
                          <MicOff className="w-3 h-3 text-rose-400" />
                        )}
                        <span>{m.isMicOn ? 'Mic bật' : 'Đã tắt mic'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {m.isCamOn ? (
                          <Video className="w-3 h-3 text-teal-500" />
                        ) : (
                          <VideoOff className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{m.isCamOn ? 'Cam bật' : 'Tắt cam'}</span>
                      </span>
                      {m.isScreenSharing && (
                        <>
                          <span>•</span>
                          <span className="text-teal-500 flex items-center gap-0.5 font-medium">
                            <Monitor className="w-3 h-3" />
                            <span>Đang chia sẻ</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Các nút công cụ của Chủ phòng tác động lên thành viên khác */}
                {isHost && !isMe && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {/* Tắt mic */}
                    {m.isMicOn && onMuteMember && (
                      <button
                        onClick={() => onMuteMember(m.socketId)}
                        title="Tắt tiếng thành viên"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Chuyển chủ phòng */}
                    {onTransferHost && (
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn trao quyền Chủ phòng cho ${m.userName}?`)) {
                            onTransferHost(m.socketId)
                          }
                        }}
                        title="Chuyển quyền Chủ phòng"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Mời ra khỏi phòng */}
                    {onKickMember && (
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn mời ${m.userName} rời khỏi phòng?`)) {
                            onKickMember(m.socketId)
                          }
                        }}
                        title="Mời ra khỏi phòng"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}

          {filteredMembers.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Không tìm thấy thành viên phù hợp.
            </div>
          )}
        </ul>

        {/* Nút đóng */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
