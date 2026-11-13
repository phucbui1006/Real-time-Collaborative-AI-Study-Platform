// client/src/components/classrooms/VideoTile.tsx
// Component hiển thị khung hình camera / avatar người tham gia chuẩn PeerMind Meet (Viền teal khi nói, Giơ tay, Tỉ lệ 16:9)

import React, { useEffect, useRef } from 'react'
import { Mic, MicOff, Monitor, Crown, Hand } from 'lucide-react'
import type { RoomMember } from '../../types/classroom'

interface VideoTileProps {
  member: RoomMember
  stream?: MediaStream | null
  isLocal?: boolean
  isCompact?: boolean
  isHandRaised?: boolean
}

export const VideoTile: React.FC<VideoTileProps> = React.memo(({
  member,
  stream,
  isLocal = false,
  isCompact = false,
  isHandRaised = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const videoEl = videoRef.current
    if (videoEl && stream) {
      videoEl.srcObject = stream
    }
  }, [stream, member.isCamOn])

  const initial = member.userName ? member.userName.charAt(0).toUpperCase() : 'U'

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900/90 border transition-all duration-200 flex items-center justify-center select-none shadow-md ${
        member.isSpeaking
          ? 'ring-2 ring-teal-400 border-teal-400/80 shadow-teal-500/20'
          : 'border-slate-800/80'
      } ${isCompact ? 'w-full aspect-video min-h-[96px] max-h-[140px]' : 'w-full h-full min-h-[140px]'}`}
    >
      {/* 1. Video Element khi Camera BẬT */}
      {member.isCamOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* 2. Avatar đại diện khi Camera TẮT */
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div
            className={`rounded-full flex items-center justify-center text-white font-bold shadow-inner ${
              isCompact ? 'w-9 h-9 text-xs' : 'w-16 h-16 text-xl'
            }`}
            style={{ backgroundColor: member.avatarColor || '#0ea5e9' }}
          >
            {initial}
          </div>
          {!isCompact && (
            <span className="mt-2 text-xs text-slate-300 font-medium truncate max-w-[150px]">
              {member.userName} {isLocal && '(Bạn)'}
            </span>
          )}
        </div>
      )}

      {/* 3. Tên thành viên + Icon Host + Screen Share góc dưới trái */}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 bg-[#0B1220]/80 backdrop-blur-md px-2 py-0.8 rounded-lg text-[10px] sm:text-[11px] text-white max-w-[85%] border border-slate-700/40">
        {member.role === 'host' && (
          <span title="Chủ phòng">
            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
          </span>
        )}
        <span className="truncate font-medium">
          {member.userName} {isLocal && '(Bạn)'}
        </span>
        {member.isScreenSharing && (
          <span title="Đang chia sẻ màn hình">
            <Monitor className="w-3 h-3 text-teal-400 shrink-0 ml-0.5" />
          </span>
        )}
      </div>

      {/* 4. Huy hiệu Giơ tay phát biểu góc trên trái */}
      {isHandRaised && (
        <div
          className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-lg text-[10px] shadow-md animate-bounce"
          title="Đang giơ tay phát biểu"
        >
          <Hand className="w-3 h-3" />
        </div>
      )}

      {/* 5. Trạng thái Micro góc trên phải */}
      <div className="absolute top-1.5 right-1.5">
        <div
          className={`flex h-5.5 w-5.5 sm:h-6 sm:w-6 items-center justify-center rounded-lg text-xs shadow-sm border ${
            member.isMicOn
              ? 'bg-[#0B1220]/80 text-teal-400 border-teal-500/40'
              : 'bg-rose-600/90 text-white border-rose-500/60'
          }`}
          title={member.isMicOn ? 'Micro đang bật' : 'Micro đã tắt'}
        >
          {member.isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
        </div>
      </div>
    </div>
  )
})
