// client/src/components/classrooms/VideoGrid.tsx
// Bố cục hiển thị video người tham gia (Hỗ trợ Grid 50 người phân trang 8 ô/trang, Dải Filmstrip dọc và Dải ngang Mobile)

import React, { useState, useMemo } from 'react'
import { VideoTile } from './VideoTile'
import { ChevronRight, ChevronLeft, Users } from 'lucide-react'
import type { RoomMember } from '../../types/classroom'

interface VideoGridProps {
  members: RoomMember[]
  localSocketId?: string
  currentUserId?: string
  localStream: MediaStream | null
  remoteStreams: Record<string, MediaStream>
  isPresentationMode?: boolean
  layoutMode?: 'grid' | 'filmstrip-vertical' | 'filmstrip-horizontal'
  raisedHands?: Set<string>
  onToggleCollapse?: (collapsed: boolean) => void
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  members,
  localSocketId,
  currentUserId,
  localStream,
  remoteStreams,
  isPresentationMode = false,
  layoutMode,
  raisedHands,
  onToggleCollapse,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const checkIsLocal = (member: RoomMember) => {
    if (localSocketId && member.socketId === localSocketId) return true
    if (member.socketId === 'local-me') return true
    if (currentUserId && member.userId === currentUserId) return true
    return false
  }

  // Tự động suy ra layout mode nếu không truyền vào
  const effectiveMode =
    layoutMode || (isPresentationMode ? 'filmstrip-vertical' : 'grid')

  const handleToggle = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    onToggleCollapse?.(next)
  }

  // ─── PHÂN TRANG GRID TỐI ƯU CHO 50 NGƯỜI (8 Ô/TRANG) ──────────────────
  const PAGE_SIZE = 8
  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages - 1)

  // Ưu tiên hiển thị: Người đang giơ tay > Người đang nói > Người bật cam
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aRaised = (raisedHands && (raisedHands.has(a.socketId) || (checkIsLocal(a) && raisedHands.has('local-me')))) ? 1 : 0
      const bRaised = (raisedHands && (raisedHands.has(b.socketId) || (checkIsLocal(b) && raisedHands.has('local-me')))) ? 1 : 0
      if (aRaised !== bRaised) return bRaised - aRaised
      if (a.isSpeaking !== b.isSpeaking) return (b.isSpeaking ? 1 : 0) - (a.isSpeaking ? 1 : 0)
      if (a.isCamOn !== b.isCamOn) return (b.isCamOn ? 1 : 0) - (a.isCamOn ? 1 : 0)
      return 0
    })
  }, [members, raisedHands, localSocketId, currentUserId])

  // Chỉ lấy các thành viên thuộc trang hiện tại (chỉ subscribe video ô đang hiển thị)
  const visibleMembers = useMemo(() => {
    return sortedMembers.slice(safeCurrentPage * PAGE_SIZE, (safeCurrentPage + 1) * PAGE_SIZE)
  }, [sortedMembers, safeCurrentPage, PAGE_SIZE])

  // ─── 1. CHẾ ĐỘ DẢI CỘT DỌC BÊN PHẢI SÂN KHẤU (DESKTOP FILMSTRIP) ────────
  if (effectiveMode === 'filmstrip-vertical') {
    if (isCollapsed) {
      return (
        <div className="hidden lg:flex flex-col items-center justify-center p-1 bg-[#0B1220]/70 border-l border-slate-800/80 rounded-r-xl shrink-0 z-10">
          <button
            onClick={handleToggle}
            className="flex items-center gap-1 py-3 px-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Mở dải camera thành viên"
          >
            <ChevronLeft className="w-4 h-4 text-teal-400" />
            <span className="text-[10px] font-mono [writing-mode:vertical-lr] tracking-wider text-slate-300">
              Camera ({members.length})
            </span>
          </button>
        </div>
      )
    }

    return (
      <div className="hidden lg:flex flex-col w-52 xl:w-60 h-full bg-[#0B1220]/75 backdrop-blur-md border-l border-slate-800/80 rounded-r-2xl shrink-0 z-10 overflow-hidden">
        {/* Header dải filmstrip */}
        <div className="flex items-center justify-between px-3 h-9 border-b border-slate-800/60 bg-[#0F172A]/40 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>Thành viên ({members.length})</span>
          </div>
          <button
            onClick={handleToggle}
            className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Thu gọn dải camera"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Danh sách tile video xếp dọc (phân trang tối đa 8 ô/lần để chống treo DOM khi phòng 50 người) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {visibleMembers.map((member) => {
            const isLocal = checkIsLocal(member)
            const stream = isLocal ? localStream : remoteStreams[member.socketId]
            const isHandRaised = Boolean(
              (raisedHands && raisedHands.has(member.socketId)) ||
              (raisedHands && isLocal && raisedHands.has('local-me'))
            )

            return (
              <VideoTile
                key={member.socketId}
                member={member}
                stream={stream}
                isLocal={isLocal}
                isCompact={true}
                isHandRaised={isHandRaised}
              />
            )
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-slate-800/60 bg-[#0F172A]/60 text-[11px] font-mono text-slate-300 shrink-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={safeCurrentPage === 0}
              className="h-6 w-6 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>
              {safeCurrentPage + 1}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safeCurrentPage >= totalPages - 1}
              className="h-6 w-6 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── 2. CHẾ ĐỘ DẢI NGANG DƯỚI SÂN KHẤU (MOBILE / TABLET FILMSTRIP) ─────
  if (effectiveMode === 'filmstrip-horizontal') {
    return (
      <div className="w-full flex items-center gap-2 overflow-x-auto py-2 px-3 bg-[#0B1220]/80 backdrop-blur-md border-t border-slate-800/80 shrink-0 select-none">
        {visibleMembers.map((member) => {
          const isLocal = checkIsLocal(member)
          const stream = isLocal ? localStream : remoteStreams[member.socketId]
          const isHandRaised = Boolean(
            (raisedHands && raisedHands.has(member.socketId)) ||
            (raisedHands && isLocal && raisedHands.has('local-me'))
          )

          return (
            <div key={member.socketId} className="w-36 sm:w-44 shrink-0">
              <VideoTile
                member={member}
                stream={stream}
                isLocal={isLocal}
                isCompact={true}
                isHandRaised={isHandRaised}
              />
            </div>
          )
        })}
      </div>
    )
  }

  // ─── 3. CHẾ ĐỘ GRID PHÒNG HỌP THUẦN (PHÂN TRANG 8 Ô / TRANG) ───────────
  const count = visibleMembers.length
  let gridColsClass = 'grid-cols-1'
  if (count === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2'
  else if (count >= 3 && count <= 4) gridColsClass = 'grid-cols-1 sm:grid-cols-2'
  else if (count >= 5) gridColsClass = 'grid-cols-2 md:grid-cols-4'

  return (
    <div className="w-full h-full max-w-7xl max-h-[85vh] p-3 sm:p-4 flex flex-col items-center justify-between select-none">
      <div className={`w-full flex-1 grid ${gridColsClass} gap-3 sm:gap-3.5 items-center justify-center auto-rows-fr`}>
        {visibleMembers.map((member) => {
          const isLocal = checkIsLocal(member)
          const stream = isLocal ? localStream : remoteStreams[member.socketId]
          const isHandRaised = Boolean(
            (raisedHands && raisedHands.has(member.socketId)) ||
            (raisedHands && isLocal && raisedHands.has('local-me'))
          )

          return (
            <div key={member.socketId} className="w-full h-full min-h-[140px] max-h-[320px]">
              <VideoTile
                member={member}
                stream={stream}
                isLocal={isLocal}
                isCompact={false}
                isHandRaised={isHandRaised}
              />
            </div>
          )
        })}
      </div>

      {/* Thanh phân trang khi số thành viên > PAGE_SIZE (Hỗ trợ 50 người) */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 px-4 py-1.5 bg-[#0F172A]/90 rounded-full border border-slate-800 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={safeCurrentPage === 0}
            className="h-7 w-7 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300">
            Trang <span className="font-bold text-teal-400">{safeCurrentPage + 1}</span> / {totalPages} ({members.length} thành viên)
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safeCurrentPage >= totalPages - 1}
            className="h-7 w-7 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
