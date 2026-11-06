// client/src/components/classrooms/VideoGrid.tsx
// Bố cục hiển thị video người tham gia (Hỗ trợ Grid họp thuần, Dải cột dọc Filmstrip bên phải, Dải ngang Mobile)

import React, { useState } from 'react'
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

        {/* Danh sách tile video xếp dọc */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {members.map((member) => {
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
      </div>
    )
  }

  // ─── 2. CHẾ ĐỘ DẢI NGANG DƯỚI SÂN KHẤU (MOBILE / TABLET FILMSTRIP) ─────
  if (effectiveMode === 'filmstrip-horizontal') {
    return (
      <div className="w-full flex items-center gap-2 overflow-x-auto py-2 px-3 bg-[#0B1220]/80 backdrop-blur-md border-t border-slate-800/80 shrink-0 select-none">
        {members.map((member) => {
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

  // ─── 3. CHẾ ĐỘ GRID PHÒNG HỌP THUẦN (GOOGLE MEET MAIN GRID) ───────────────
  const count = members.length
  let gridColsClass = 'grid-cols-1'
  if (count === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2'
  else if (count >= 3 && count <= 4) gridColsClass = 'grid-cols-1 sm:grid-cols-2'
  else if (count >= 5) gridColsClass = 'grid-cols-2 md:grid-cols-3'

  return (
    <div className={`w-full h-full max-w-6xl max-h-[82vh] p-3 sm:p-5 grid ${gridColsClass} gap-3 sm:gap-4 items-center justify-center select-none`}>
      {members.map((member) => {
        const isLocal = checkIsLocal(member)
        const stream = isLocal ? localStream : remoteStreams[member.socketId]
        const isHandRaised = Boolean(
          (raisedHands && raisedHands.has(member.socketId)) ||
          (raisedHands && isLocal && raisedHands.has('local-me'))
        )

        return (
          <div key={member.socketId} className="w-full h-full aspect-[16/10] max-h-[380px]">
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
  )
}
