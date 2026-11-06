// client/src/components/classrooms/ClassroomControls.tsx
// Thanh điều khiển trung tâm Floating Pill chuẩn PeerMind Meet (Hiệu ứng Glassmorphism, Tooltips phím tắt, Emojis, Responsive Mobile)

import React, { useState, useRef, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Presentation,
  Hand,
  Smile,
  Users,
  MessageSquare,
  PhoneOff,
  MoreHorizontal,
  LogOut,
  AlertTriangle,
} from 'lucide-react'

interface ClassroomControlsProps {
  isMicOn: boolean
  isCamOn: boolean
  isSharingScreen: boolean
  isScreenSharerActive: boolean
  canShareScreen: boolean
  isHost: boolean
  userRole?: 'host' | 'speaker' | 'viewer'
  isHandRaised?: boolean
  hasActiveDocument: boolean
  unreadCount: number
  membersCount: number
  activeDrawerTab: 'members' | 'chat' | null
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleScreenShare: () => void
  onOpenDocPicker: () => void
  onRaiseHand: () => void
  onSendReaction: (emoji: string) => void
  onToggleDrawer: (tab: 'members' | 'chat') => void
  onLeaveRoom: () => void
  onCloseRoomForEveryone?: () => void
}

const REACTIONS = ['👍', '❤️', '👏', '🎉', '💡', '🔥']

export const ClassroomControls: React.FC<ClassroomControlsProps> = ({
  isMicOn,
  isCamOn,
  isSharingScreen,
  isScreenSharerActive,
  canShareScreen,
  isHost,
  userRole,
  isHandRaised = false,
  hasActiveDocument,
  unreadCount,
  membersCount,
  activeDrawerTab,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onOpenDocPicker,
  onRaiseHand,
  onSendReaction,
  onToggleDrawer,
  onLeaveRoom,
  onCloseRoomForEveryone,
}) => {
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [moreMobileOpen, setMoreMobileOpen] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)

  const reactionsRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Click outside đóng menu reactions & more
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionsRef.current && !reactionsRef.current.contains(e.target as Node)) {
        setReactionsOpen(false)
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMobileOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      {/* ─── THANH ĐIỀU KHIỂN FLOATING PILL ──────────────────────────────── */}
      <footer className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 select-none max-w-[96vw]">
        <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-full bg-[#0B1220]/90 dark:bg-[#070b12]/92 backdrop-blur-2xl border border-slate-700/60 shadow-2xl">
          {/* 1. NÚT MICROPHONE (M) */}
          <div className="relative group flex flex-col items-center">
            <button
              onClick={onToggleMic}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isMicOn
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700/60'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
              aria-label={userRole === 'viewer' ? 'Người xem cần xin quyền phát biểu' : isMicOn ? 'Tắt micro' : 'Bật micro'}
            >
              {isMicOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            {/* Tooltip desktop */}
            <div className="hidden md:group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap shadow-lg pointer-events-none items-center gap-1">
              <span>{isMicOn ? 'Tắt mic' : 'Bật mic'}</span>
              <kbd className="px-1 rounded bg-slate-800 text-teal-400 font-mono text-[9px]">M</kbd>
            </div>
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">Micro</span>
          </div>

          {/* 2. NÚT CAMERA (V) */}
          <div className="relative group flex flex-col items-center">
            <button
              onClick={onToggleCam}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isCamOn
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-teal-400 hover:text-teal-300 border border-slate-700/60'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
              aria-label={isCamOn ? 'Tắt camera' : 'Bật camera'}
            >
              {isCamOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <div className="hidden md:group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap shadow-lg pointer-events-none items-center gap-1">
              <span>{isCamOn ? 'Tắt camera' : 'Bật camera'}</span>
              <kbd className="px-1 rounded bg-slate-800 text-teal-400 font-mono text-[9px]">V</kbd>
            </div>
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">Camera</span>
          </div>

          {/* 3. NÚT CHIA SẺ MÀN HÌNH (S) - Desktop & Tablet */}
          <div className="relative group flex flex-col items-center hidden sm:flex">
            <button
              onClick={onToggleScreenShare}
              disabled={!canShareScreen && !isSharingScreen}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isSharingScreen
                  ? 'bg-teal-600 hover:bg-teal-500 text-white ring-2 ring-teal-400/40'
                  : isScreenSharerActive
                  ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-teal-300 border border-slate-700/60'
              }`}
              aria-label={isSharingScreen ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
            >
              {isSharingScreen ? (
                <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            <div className="hidden md:group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap shadow-lg pointer-events-none items-center gap-1">
              <span>{isSharingScreen ? 'Dừng chiếu' : 'Chia sẻ màn hình'}</span>
              <kbd className="px-1 rounded bg-slate-800 text-teal-400 font-mono text-[9px]">S</kbd>
            </div>
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">Màn hình</span>
          </div>

          {/* 4. NÚT CHIẾU TÀI LIỆU BÀI HỌC (Host & Thành viên) */}
          <div className="relative group flex flex-col items-center hidden md:flex">
            <button
              onClick={onOpenDocPicker}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                hasActiveDocument
                  ? 'bg-teal-600 text-white ring-2 ring-teal-400/30'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-teal-300 border border-slate-700/60'
              }`}
              aria-label="Chọn tài liệu bài học trình chiếu"
            >
              <Presentation className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="hidden md:group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap shadow-lg pointer-events-none">
              <span>{hasActiveDocument ? 'Đổi tài liệu chiếu' : 'Chiếu tài liệu'}</span>
            </div>
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">Tài liệu</span>
          </div>

          {/* 5. NÚT GIƠ TAY PHÁT BIỂU (H) */}
          <div className="relative group flex flex-col items-center hidden sm:flex">
            <button
              onClick={onRaiseHand}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isHandRaised
                  ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/50 shadow-amber-600/30'
                  : 'bg-slate-800/90 hover:bg-amber-950/60 text-slate-200 hover:text-amber-300 border border-slate-700/60 hover:border-amber-600/50'
              }`}
              aria-label={isHandRaised ? 'Hạ tay' : 'Giơ tay phát biểu'}
            >
              <Hand className={`w-4 h-4 sm:w-5 sm:h-5 ${isHandRaised ? 'text-white' : 'text-amber-400'}`} />
            </button>
            <div className="hidden md:group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap shadow-lg pointer-events-none items-center gap-1">
              <span>{isHandRaised ? 'Hạ tay' : 'Giơ tay'}</span>
              <kbd className="px-1 rounded bg-slate-800 text-amber-400 font-mono text-[9px]">H</kbd>
            </div>
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">
              {isHandRaised ? 'Đang giơ' : 'Giơ tay'}
            </span>
          </div>

          {/* 6. NÚT BIỂU CẢM NHANH (REACTIONS) */}
          <div ref={reactionsRef} className="relative flex flex-col items-center">
            <button
              onClick={() => setReactionsOpen(!reactionsOpen)}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                reactionsOpen
                  ? 'bg-teal-600/30 text-teal-300 border border-teal-500/50'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-teal-300 border border-slate-700/60'
              }`}
              aria-label="Gửi biểu cảm"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Popup thả cảm xúc bay lên */}
            {reactionsOpen && (
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded-full bg-slate-900/95 border border-slate-700/80 shadow-2xl flex items-center gap-1 z-40 backdrop-blur-md animate-in fade-in zoom-in-95">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendReaction(emoji)
                      setReactionsOpen(false)
                    }}
                    className="w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center text-lg transition-transform hover:scale-130 active:scale-95 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">Biểu cảm</span>
          </div>

          <div className="w-px h-6 bg-slate-700/60 mx-0.5 sm:mx-1" />

          {/* 7. NÚT MỞ DANH SÁCH THÀNH VIÊN */}
          <div className="relative group flex flex-col items-center">
            <button
              onClick={() => onToggleDrawer('members')}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm relative ${
                activeDrawerTab === 'members'
                  ? 'bg-teal-600 text-white ring-2 ring-teal-400/40'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-teal-300 border border-slate-700/60'
              }`}
              aria-label="Xem thành viên"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-700 text-slate-200 font-mono text-[10px] font-bold flex items-center justify-center border border-slate-900">
                {membersCount}
              </span>
            </button>
            <div className="hidden md:group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap shadow-lg pointer-events-none">
              <span>Thành viên ({membersCount})</span>
            </div>
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">Người</span>
          </div>

          {/* 8. NÚT MỞ BẢNG CHAT (TRÒ CHUYỆN) */}
          <div className="relative group flex flex-col items-center">
            <button
              onClick={() => onToggleDrawer('chat')}
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm relative ${
                activeDrawerTab === 'chat'
                  ? 'bg-teal-600 text-white ring-2 ring-teal-400/40'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-teal-300 border border-slate-700/60'
              }`}
              aria-label="Trò chuyện nhóm"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && activeDrawerTab !== 'chat' && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="hidden md:group-hover:flex absolute -top-11 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-200 whitespace-nowrap shadow-lg pointer-events-none">
              <span>Trò chuyện</span>
            </div>
            <span className="hidden xl:block text-[9px] text-slate-400 mt-0.5">Chat</span>
          </div>

          {/* 9. NÚT THÊM (…) DÀNH CHO MOBILE */}
          <div ref={moreRef} className="relative sm:hidden flex flex-col items-center">
            <button
              onClick={() => setMoreMobileOpen(!moreMobileOpen)}
              className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-800/90 text-slate-200 border border-slate-700/60 cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {moreMobileOpen && (
              <div className="absolute -top-36 right-0 w-44 p-1.5 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl flex flex-col gap-1 z-40 backdrop-blur-md">
                <button
                  onClick={() => {
                    onToggleScreenShare()
                    setMoreMobileOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 text-left"
                >
                  <Monitor className="w-3.5 h-3.5 text-teal-400" />
                  <span>{isSharingScreen ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}</span>
                </button>
                <button
                  onClick={() => {
                    onOpenDocPicker()
                    setMoreMobileOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 text-left"
                >
                  <Presentation className="w-3.5 h-3.5 text-teal-400" />
                  <span>Chiếu tài liệu</span>
                </button>
                <button
                  onClick={() => {
                    onRaiseHand()
                    setMoreMobileOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800 text-left"
                >
                  <Hand className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isHandRaised ? 'Hạ tay phát biểu' : 'Giơ tay phát biểu'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 10. NÚT RỜI PHÒNG (MÀU ĐỎ TÁCH BIỆT) */}
          <div className="relative group flex flex-col items-center ml-0.5 sm:ml-1">
            <button
              onClick={() => setConfirmLeaveOpen(true)}
              className="h-10 w-10 sm:h-11 sm:w-11 sm:px-4 sm:w-auto rounded-full flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              aria-label="Rời phòng học"
            >
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden md:inline text-xs font-semibold tracking-wide">Rời phòng</span>
            </button>
            <span className="hidden xl:block text-[9px] text-rose-400 mt-0.5">Thoát</span>
          </div>
        </div>
      </footer>

      {/* ─── MODAL HỘP THOẠI XÁC NHẬN RỜI PHÒNG HỌC ────────────────────── */}
      {confirmLeaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F172A] border border-slate-700/80 p-5 shadow-2xl text-slate-100 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-base text-slate-100">
                  {isHost ? 'Bạn đang là Chủ phòng' : 'Rời khỏi phòng học?'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {isHost
                    ? 'Bạn có thể chỉ rời phòng hoặc kết thúc hoàn toàn buổi học cho tất cả thành viên trong nhóm.'
                    : 'Bạn có chắc chắn muốn rời khỏi phòng học này không? Bạn vẫn có thể tham gia lại bất cứ lúc nào.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              {/* Tùy chọn dành cho Chủ phòng: Kết thúc phòng cho tất cả */}
              {isHost && onCloseRoomForEveryone && (
                <button
                  onClick={() => {
                    setConfirmLeaveOpen(false)
                    onCloseRoomForEveryone()
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-rose-600/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Kết thúc phòng cho mọi người</span>
                </button>
              )}

              {/* Rời phòng bình thường */}
              <button
                onClick={() => {
                  setConfirmLeaveOpen(false)
                  onLeaveRoom()
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>{isHost ? 'Chỉ mình tôi rời phòng' : 'Rời phòng ngay'}</span>
              </button>

              {/* Nút hủy */}
              <button
                onClick={() => setConfirmLeaveOpen(false)}
                className="w-full py-2 px-3 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Ở lại phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
