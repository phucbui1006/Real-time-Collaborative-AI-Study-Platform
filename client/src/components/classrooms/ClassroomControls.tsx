// client/src/components/classrooms/ClassroomControls.tsx
// Thanh điều khiển trung tâm phía dưới giống Google Meet (Mic, Cam, Screen Share, Trình chiếu tài liệu, Chat, Rời phòng)

import React from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Presentation,
  Hand,
  MessageSquare,
  Users,
  PhoneOff,
} from 'lucide-react'

interface ClassroomControlsProps {
  isMicOn: boolean
  isCamOn: boolean
  isSharingScreen: boolean
  isScreenSharerActive: boolean
  canShareScreen: boolean
  isHost: boolean
  hasActiveDocument: boolean
  unreadCount: number
  membersCount: number
  chatOpen: boolean
  membersOpen: boolean
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleScreenShare: () => void
  onOpenDocPicker: () => void
  onRaiseHand: () => void
  onToggleChat: () => void
  onToggleMembers: () => void
  onLeaveRoom: () => void
  onCloseRoom?: () => void
}

export const ClassroomControls: React.FC<ClassroomControlsProps> = ({
  isMicOn,
  isCamOn,
  isSharingScreen,
  isScreenSharerActive,
  canShareScreen,
  isHost,
  hasActiveDocument,
  unreadCount,
  membersCount,
  chatOpen,
  membersOpen,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onOpenDocPicker,
  onRaiseHand,
  onToggleChat,
  onToggleMembers,
  onLeaveRoom,
}) => {
  return (
    <footer className="h-16 w-full bg-slate-900/95 dark:bg-[#070b12]/95 backdrop-blur-md border-t border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none shadow-lg z-30">
      {/* 1. Bên trái: Thông tin phòng / Đồng hồ / Logo */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-200">PeerMind Meet</span>
        <span className="text-slate-600">•</span>
        <span className="font-mono text-teal-400">WebRTC P2P</span>
      </div>

      {/* 2. Cụm nút điều khiển chính ở giữa */}
      <div className="flex items-center gap-2 sm:gap-3 mx-auto">
        {/* Micro */}
        <button
          onClick={onToggleMic}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isMicOn
              ? 'bg-slate-800 hover:bg-slate-700 text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-500/30'
          }`}
          title={isMicOn ? 'Tắt micro (Ctrl + D)' : 'Bật micro (Ctrl + D)'}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleCam}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
            isCamOn
              ? 'bg-slate-800 hover:bg-slate-700 text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-500/30'
          }`}
          title={isCamOn ? 'Tắt camera (Ctrl + E)' : 'Bật camera (Ctrl + E)'}
        >
          {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Chia sẻ màn hình */}
        <button
          onClick={onToggleScreenShare}
          disabled={!canShareScreen && !isSharingScreen}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
            isSharingScreen
              ? 'bg-teal-600 hover:bg-teal-500 text-white ring-2 ring-teal-500/40'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title={
            isSharingScreen
              ? 'Dừng chia sẻ màn hình'
              : isScreenSharerActive
              ? 'Đang có người chia sẻ màn hình'
              : canShareScreen
              ? 'Chia sẻ toàn màn hình / Cửa sổ'
              : 'Chủ phòng đã tắt quyền chia sẻ màn hình'
          }
        >
          {isSharingScreen ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* Trình chiếu tài liệu (Host) */}
        {isHost && (
          <button
            onClick={onOpenDocPicker}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              hasActiveDocument
                ? 'bg-teal-700/80 hover:bg-teal-600 text-white border border-teal-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={hasActiveDocument ? 'Đổi tài liệu trình chiếu' : 'Chọn tài liệu từ Thư viện để trình chiếu'}
          >
            <Presentation className="w-5 h-5" />
          </button>
        )}

        {/* Giơ tay phát biểu */}
        <button
          onClick={onRaiseHand}
          className="h-11 w-11 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-sm"
          title="Giơ tay phát biểu"
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Rời phòng */}
        <button
          onClick={onLeaveRoom}
          className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm font-medium text-xs ml-1"
          title="Rời phòng học"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Rời phòng</span>
        </button>
      </div>

      {/* 3. Bên phải: Chat & Danh sách thành viên */}
      <div className="flex items-center gap-2">
        {/* Nút Mở Thành viên */}
        <button
          onClick={onToggleMembers}
          className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            membersOpen
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
          }`}
          title={`Thành viên (${membersCount})`}
        >
          <Users className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-700 text-[10px] font-bold text-white flex items-center justify-center border border-slate-900">
            {membersCount}
          </span>
        </button>

        {/* Nút Mở Chat */}
        <button
          onClick={onToggleChat}
          className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            chatOpen
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
          }`}
          title="Trò chuyện trong phòng"
        >
          <MessageSquare className="w-4 h-4" />
          {!chatOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border border-slate-900 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </footer>
  )
}
