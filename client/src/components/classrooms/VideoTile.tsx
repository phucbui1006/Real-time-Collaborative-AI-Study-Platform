// client/src/components/classrooms/VideoTile.tsx
// Component hiển thị khung hình camera/avatar của một thành viên với hiệu ứng "đang nói" chuẩn Google Meet

import React, { useEffect, useRef } from 'react'
import { Mic, MicOff, Monitor, Crown } from 'lucide-react'
import type { RoomMember } from '../../types/classroom'

interface VideoTileProps {
  member: RoomMember
  stream?: MediaStream | null
  isLocal?: boolean
  isCompact?: boolean
}

export const VideoTile: React.FC<VideoTileProps> = ({
  member,
  stream,
  isLocal = false,
  isCompact = false,
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
      className={`relative overflow-hidden rounded-md bg-slate-900 border transition-all duration-200 flex items-center justify-center select-none shadow-md ${
        member.isSpeaking
          ? 'ring-2 ring-teal-500 border-teal-500 shadow-teal-500/20'
          : 'border-slate-800'
      } ${isCompact ? 'w-44 h-28 shrink-0' : 'w-full h-full min-h-[140px]'}`}
    >
      {/* Video Element khi Camera BẬT */}
      {member.isCamOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar đại diện khi Camera TẮT */
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <div
            className={`rounded-full flex items-center justify-center text-white font-bold shadow-inner ${
              isCompact ? 'w-10 h-10 text-sm' : 'w-16 h-16 text-xl'
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

      {/* Tên thành viên + Icon mic góc dưới trái */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-xs px-2 py-1 rounded text-[11px] text-white max-w-[85%]">
        {member.role === 'host' && (
          <span title="Chủ phòng">
            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
          </span>
        )}
        <span className="truncate font-medium">{member.userName} {isLocal && '(Bạn)'}</span>
        {member.isScreenSharing && (
          <span title="Đang chia sẻ màn hình">
            <Monitor className="w-3 h-3 text-teal-400 shrink-0 ml-0.5" />
          </span>
        )}
      </div>

      {/* Trạng thái Micro góc trên phải */}
      <div className="absolute top-2 right-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs shadow-sm ${
            member.isMicOn ? 'bg-slate-900/80 text-teal-400' : 'bg-rose-500/90 text-white'
          }`}
          title={member.isMicOn ? 'Micro đang bật' : 'Micro đã tắt'}
        >
          {member.isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  )
}
