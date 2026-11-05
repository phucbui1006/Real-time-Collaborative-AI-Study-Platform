// client/src/components/classrooms/VideoGrid.tsx
// Bố cục lưới hiển thị video người tham gia (Hỗ trợ Grid linh hoạt và Dải phụ khi trình chiếu)

import React from 'react'
import { VideoTile } from './VideoTile'
import type { RoomMember } from '../../types/classroom'

interface VideoGridProps {
  members: RoomMember[]
  localSocketId?: string
  localStream: MediaStream | null
  remoteStreams: Record<string, MediaStream>
  isPresentationMode?: boolean
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  members,
  localSocketId,
  localStream,
  remoteStreams,
  isPresentationMode = false,
}) => {
  // Chế độ trình chiếu: hiển thị dải ngang thu nhỏ ở trên/dưới
  if (isPresentationMode) {
    return (
      <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-2 px-3 bg-slate-950/40 border-t border-slate-800/80 shrink-0">
        {members.map((member) => {
          const isLocal = member.socketId === localSocketId
          const stream = isLocal ? localStream : remoteStreams[member.socketId]
          return (
            <VideoTile
              key={member.socketId}
              member={member}
              stream={stream}
              isLocal={isLocal}
              isCompact={true}
            />
          )
        })}
      </div>
    )
  }

  // Chế độ toàn màn hình xem người tham gia (Google Meet Main Grid)
  const count = members.length
  let gridColsClass = 'grid-cols-1'
  if (count === 2) gridColsClass = 'grid-cols-1 sm:grid-cols-2'
  else if (count >= 3 && count <= 4) gridColsClass = 'grid-cols-1 sm:grid-cols-2'
  else if (count >= 5) gridColsClass = 'grid-cols-2 md:grid-cols-3'

  return (
    <div className={`w-full h-full max-w-6xl max-h-[82vh] p-4 grid ${gridColsClass} gap-3 items-center justify-center`}>
      {members.map((member) => {
        const isLocal = member.socketId === localSocketId
        const stream = isLocal ? localStream : remoteStreams[member.socketId]
        return (
          <div key={member.socketId} className="w-full h-full aspect-[16/10] max-h-[380px]">
            <VideoTile
              member={member}
              stream={stream}
              isLocal={isLocal}
              isCompact={false}
            />
          </div>
        )
      })}
    </div>
  )
}
