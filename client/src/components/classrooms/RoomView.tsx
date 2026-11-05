// client/src/components/classrooms/RoomView.tsx
// Giao diện phòng học nhóm trực tuyến PeerMind — Chuẩn Google Meet kết hợp trình chiếu & sửa tài liệu realtime

import { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  Copy,
  Check,
  Crown,
  FileText,
  X,
  Presentation,
  ShieldAlert,
  Sparkles,
  LogOut,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import {
  socket,
  joinRoom,
  leaveRoom,
  sendChatMessage,
  selectDocument,
  changeDocumentPage,
  editDocumentPage,
  muteMember,
  kickMember,
  transferHost,
  toggleScreenPermission,
  closeRoom,
} from '../../services/socket'
import { useRoomRTC } from '../../hooks/useRoomRTC'
import { VideoGrid } from './VideoGrid'
import { ClassroomControls } from './ClassroomControls'
import { ClassroomChatPanel } from './ClassroomChatPanel'
import { MembersModal } from './MembersModal'
import { DocumentCollaborativeViewer } from './DocumentCollaborativeViewer'
import type {
  RoomState,
  RoomMember,
  ChatMessage,
  RoomDocumentData,
} from '../../types/classroom'

export type SlideItem =
  | [string, string[]]
  | {
      title: string
      points: string[]
      imageUrl?: string
    }

export type DocItem = {
  id: number
  title: string
  color: string
  slides: SlideItem[]
  pagesContent?: string[]
}

export const DOCS: DocItem[] = [
  {
    id: 1,
    title: 'Toán cao cấp – Chương 4',
    color: '#0ea5e9',
    slides: [
      ['Tích phân bội', ['Định nghĩa tích phân kép', 'Tính chất cơ bản', 'Đổi biến số']],
      ['Tích phân kép trên miền chữ nhật', ['Định lý Fubini', 'Ví dụ minh hoạ', 'Bài tập áp dụng']],
    ],
  },
  {
    id: 2,
    title: 'Ngữ pháp tiếng Anh B1',
    color: '#8b5cf6',
    slides: [
      ['Present Perfect', ['have/has + V3', 'Kinh nghiệm & kết quả', 'for / since']],
    ],
  },
]

export interface DocPickerItem {
  id: number
  title: string
  color?: string
  slides?: any[]
  pagesContent?: string[]
}

interface RoomViewProps {
  room: { name: string; code: string; isHost?: boolean }
  isHost?: boolean
  userId?: string
  userName?: string
  docs?: DocPickerItem[]
  onLeave: () => void
}

export default function RoomView({
  room,
  isHost: initialIsHost = false,
  userId = 'guest',
  userName = 'Thành viên',
  docs = [],
  onLeave,
}: RoomViewProps) {
  // Trạng thái phòng từ Socket.io Server
  const [roomState, setRoomState] = useState<RoomState>({
    code: room.code,
    name: room.name,
    hostUserId: userId,
    hostSocketId: '',
    members: [],
    activeDocument: null,
    screenSharerSocketId: null,
    allowMemberScreenShare: true,
    maxMembers: 6,
  })

  const [copiedCode, setCopiedCode] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [docPickerOpen, setDocPickerOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Socket ID của client hiện tại
  const currentSocketId = socket.id

  // Xác định người dùng có phải là Host không
  const isHost = useMemo(() => {
    if (roomState.hostSocketId && currentSocketId) {
      return roomState.hostSocketId === currentSocketId
    }
    if (roomState.hostUserId && userId) {
      return roomState.hostUserId === userId
    }
    return initialIsHost
  }, [roomState.hostSocketId, currentSocketId, roomState.hostUserId, userId, initialIsHost])

  // Custom hook WebRTC Mesh P2P
  const {
    localStream,
    screenStream,
    remoteStreams,
    isMicOn,
    isCamOn,
    isSharingScreen,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
  } = useRoomRTC({
    roomCode: room.code,
    currentSocketId,
    members: roomState.members,
    onPermissionError: (msg) => setErrorMessage(msg),
  })

  // ─── 1. KẾT NỐI SOCKET VÀ LẮNG NGHE SỰ KIỆN PHÒNG HỌC ───────────────────
  useEffect(() => {
    // Gửi lệnh tham gia phòng
    joinRoom(room.code, {
      id: userId,
      name: userName,
      avatarColor: '#0ea5e9',
    })

    // Đồng bộ snapshot phòng
    const onRoomState = (state: RoomState) => {
      setRoomState(state)
    }

    // Thành viên mới vào
    const onMemberJoined = (newMember: RoomMember) => {
      setRoomState((prev) => ({
        ...prev,
        members: [...prev.members.filter((m) => m.socketId !== newMember.socketId), newMember],
      }))
    }

    // Thành viên rời
    const onMemberLeft = ({ socketId }: { socketId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.socketId !== socketId),
        screenSharerSocketId: prev.screenSharerSocketId === socketId ? null : prev.screenSharerSocketId,
      }))
    }

    // Cập nhật trạng thái thành viên (mic, cam, đang nói...)
    const onMemberUpdated = (data: Partial<RoomMember> & { socketId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.socketId === data.socketId ? { ...m, ...data } : m)),
      }))
    }

    // Chuyển chủ phòng
    const onHostChanged = ({ newHostUserId, newHostSocketId }: { newHostUserId: string; newHostSocketId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        hostUserId: newHostUserId,
        hostSocketId: newHostSocketId,
        members: prev.members.map((m) => ({
          ...m,
          role: m.socketId === newHostSocketId ? 'host' : 'member',
        })),
      }))
    }

    // Nhận tin nhắn chat
    const onChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
      if (!chatOpen) {
        setUnreadCount((c) => c + 1)
      }
    }

    // Nhận lịch sử chat
    const onChatHistory = (history: ChatMessage[]) => {
      setMessages(history)
    }

    // Đồng bộ tài liệu trình chiếu
    const onDocSync = (doc: RoomDocumentData | null) => {
      setRoomState((prev) => ({ ...prev, activeDocument: doc }))
    }

    // Chuyển trang tài liệu
    const onDocPageChanged = ({ pageIndex }: { pageIndex: number }) => {
      setRoomState((prev) => {
        if (!prev.activeDocument) return prev
        return {
          ...prev,
          activeDocument: {
            ...prev.activeDocument,
            currentPage: pageIndex,
          },
        }
      })
    }

    // Cập nhật nội dung văn bản trang tài liệu
    const onDocPageUpdated = ({ pageIndex, content }: { pageIndex: number; content: string }) => {
      setRoomState((prev) => {
        if (!prev.activeDocument) return prev
        const pages = [...(prev.activeDocument.pagesContent || [])]
        pages[pageIndex] = content
        return {
          ...prev,
          activeDocument: {
            ...prev.activeDocument,
            pagesContent: pages,
          },
        }
      })
    }

    // Bị Host mời ra hoặc Phòng bị đóng
    const onKicked = ({ reason }: { reason: string }) => {
      alert(reason || 'Bạn đã bị mời ra khỏi phòng học.')
      onLeave()
    }

    const onClosed = ({ reason }: { reason: string }) => {
      alert(reason || 'Chủ phòng đã kết thúc buổi học.')
      onLeave()
    }

    // Thông báo lỗi từ server
    const onError = ({ message }: { message: string }) => {
      setErrorMessage(message)
      setTimeout(() => setErrorMessage(null), 5000)
    }

    socket.on('ROOM:STATE', onRoomState)
    socket.on('ROOM:MEMBER_JOINED', onMemberJoined)
    socket.on('ROOM:MEMBER_LEFT', onMemberLeft)
    socket.on('ROOM:MEMBER_UPDATED', onMemberUpdated)
    socket.on('ROOM:HOST_CHANGED', onHostChanged)
    socket.on('CHAT:MESSAGE', onChatMessage)
    socket.on('CHAT:HISTORY', onChatHistory)
    socket.on('DOC:SYNC', onDocSync)
    socket.on('DOC:PAGE_CHANGED', onDocPageChanged)
    socket.on('DOC:PAGE_UPDATED', onDocPageUpdated)
    socket.on('ROOM:KICKED', onKicked)
    socket.on('ROOM:CLOSED', onClosed)
    socket.on('ERROR', onError)

    return () => {
      leaveRoom(room.code)
      socket.off('ROOM:STATE', onRoomState)
      socket.off('ROOM:MEMBER_JOINED', onMemberJoined)
      socket.off('ROOM:MEMBER_LEFT', onMemberLeft)
      socket.off('ROOM:MEMBER_UPDATED', onMemberUpdated)
      socket.off('ROOM:HOST_CHANGED', onHostChanged)
      socket.off('CHAT:MESSAGE', onChatMessage)
      socket.off('CHAT:HISTORY', onChatHistory)
      socket.off('DOC:SYNC', onDocSync)
      socket.off('DOC:PAGE_CHANGED', onDocPageChanged)
      socket.off('DOC:PAGE_UPDATED', onDocPageUpdated)
      socket.off('ROOM:KICKED', onKicked)
      socket.off('ROOM:CLOSED', onClosed)
      socket.off('ERROR', onError)
    }
  }, [room.code, userId, userName, onLeave, chatOpen])

  // Reset badge tin chưa đọc khi mở bảng chat
  useEffect(() => {
    if (chatOpen) setUnreadCount(0)
  }, [chatOpen])

  // Sao chép mã phòng
  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(room.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  // Gửi tin nhắn chat
  const handleSendMessage = (text: string) => {
    sendChatMessage(room.code, text)
  }

  // Giơ tay phát biểu
  const handleRaiseHand = () => {
    handleSendMessage('✋ [Giơ tay phát biểu]')
  }

  // Chọn tài liệu trình chiếu
  const handleSelectDoc = (docId: number) => {
    selectDocument(room.code, docId)
    setDocPickerOpen(false)
  }

  // Lật trang tài liệu
  const handlePageChange = (pageIndex: number) => {
    changeDocumentPage(room.code, pageIndex)
  }

  // Sửa văn bản trang tài liệu
  const handleEditPage = (pageIndex: number, newContent: string) => {
    editDocumentPage(room.code, pageIndex, newContent)
  }

  // Quản trị thành viên (Host)
  const handleMute = (targetSocketId: string) => muteMember(room.code, targetSocketId)
  const handleKick = (targetSocketId: string) => kickMember(room.code, targetSocketId)
  const handleTransfer = (targetSocketId: string) => transferHost(room.code, targetSocketId)
  const handleToggleScreenSharePermission = (allow: boolean) => toggleScreenPermission(room.code, allow)

  // Bật toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Xác định người đang chia sẻ màn hình
  const screenSharerMember = useMemo(() => {
    if (!roomState.screenSharerSocketId) return null
    return roomState.members.find((m) => m.socketId === roomState.screenSharerSocketId)
  }, [roomState.screenSharerSocketId, roomState.members])

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* ─── 1. THANH TIÊU ĐỀ TRÊN (TOP BAR) ─────────────────────────────── */}
      <header className="flex h-14 items-center justify-between px-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onLeave}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="font-bold text-sm sm:text-base text-slate-100 truncate max-w-[180px] sm:max-w-md">
            {roomState.name || 'Phòng học nhóm'}
          </h1>

          {/* Badge Mã phòng tương tác */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-950/60 text-teal-300 border border-teal-800 hover:bg-teal-900/40 text-xs font-mono tabular-nums transition-colors cursor-pointer shrink-0"
            title="Nhấn để sao chép mã phòng"
          >
            {copiedCode ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-sans text-[11px]">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-teal-400" />
                <span>Mã: {roomState.code}</span>
              </>
            )}
          </button>

          {isHost && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800 shrink-0 uppercase tracking-wider">
              <Crown className="w-3 h-3" />
              <span>Chủ phòng</span>
            </span>
          )}
        </div>

        {/* Cụm nút bên phải */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Nút Toàn màn hình */}
          <button
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Nút Host chọn tài liệu */}
          {isHost && (
            <button
              onClick={() => setDocPickerOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{roomState.activeDocument ? 'Đổi tài liệu' : 'Chiếu tài liệu'}</span>
            </button>
          )}

          {/* Đóng phòng hoàn toàn (Host) */}
          {isHost && (
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn kết thúc buổi học và đóng phòng cho tất cả mọi người?')) {
                  closeRoom(room.code)
                }
              }}
              className="hidden md:inline-flex items-center gap-1 h-8 px-2.5 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-medium transition-colors cursor-pointer"
              title="Đóng phòng học"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đóng phòng</span>
            </button>
          )}
        </div>
      </header>

      {/* Thông báo lỗi nổi (Error Banner) */}
      {errorMessage && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md shrink-0 z-30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── 2. VÙNG TRUNG TÂM (STAGE + CHAT SIDEBAR) ────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden relative">
          {/* TRƯỜNG HỢP A: ĐANG CHIA SẺ MÀN HÌNH */}
          {roomState.screenSharerSocketId ? (
            <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden">
              <div className="w-full flex-1 rounded-md overflow-hidden bg-black flex items-center justify-center relative shadow-2xl">
                {roomState.screenSharerSocketId === currentSocketId && screenStream ? (
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(el) => {
                      if (el && screenStream) el.srcObject = screenStream
                    }}
                    className="w-full h-full object-contain"
                  />
                ) : remoteStreams[roomState.screenSharerSocketId] ? (
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      const st = remoteStreams[roomState.screenSharerSocketId!]
                      if (el && st) el.srcObject = st
                    }}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Đang kết nối tín hiệu màn hình từ {screenSharerMember?.userName || 'thành viên'}…</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs text-white">
                  Màn hình chia sẻ của <span className="font-bold text-teal-400">{screenSharerMember?.userName}</span>
                </div>
              </div>

              {/* Dải Camera thu nhỏ phía dưới */}
              <VideoGrid
                members={roomState.members}
                localSocketId={currentSocketId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                isPresentationMode={true}
              />
            </div>
          ) : /* TRƯỜNG HỢP B: ĐANG TRÌNH CHIẾU TÀI LIỆU */
          roomState.activeDocument ? (
            <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden">
              <div className="w-full flex-1 max-w-5xl rounded-md overflow-hidden mb-2">
                <DocumentCollaborativeViewer
                  document={roomState.activeDocument}
                  isHost={isHost}
                  currentUserId={userId}
                  onPageChange={handlePageChange}
                  onEditPage={handleEditPage}
                />
              </div>

              {/* Dải Camera thu nhỏ phía dưới */}
              <VideoGrid
                members={roomState.members}
                localSocketId={currentSocketId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                isPresentationMode={true}
              />
            </div>
          ) : (
            /* TRƯỜNG HỢP C: CHẾ ĐỘ CUỘC HỌP THUẦN (GOOGLE MEET VIDEO GRID) */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <VideoGrid
                members={roomState.members}
                localSocketId={currentSocketId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                isPresentationMode={false}
              />

              {/* Gợi ý khi chưa chiếu tài liệu */}
              {isHost && (
                <div className="mt-2 text-center text-xs text-slate-400">
                  <button
                    onClick={() => setDocPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 text-teal-400 hover:text-teal-300 underline cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Bấm vào đây để chọn tài liệu bài học từ Thư viện trình chiếu vào phòng</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Khung chat bên phải */}
        <ClassroomChatPanel
          open={chatOpen}
          messages={messages}
          currentUserId={userId}
          membersCount={roomState.members.length}
          onClose={() => setChatOpen(false)}
          onOpenMembers={() => setMembersOpen(true)}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* ─── 3. THANH ĐIỀU KHIỂN PHÍA DƯỚI (BOTTOM CONTROLS) ─────────────── */}
      <ClassroomControls
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        isSharingScreen={isSharingScreen}
        isScreenSharerActive={Boolean(roomState.screenSharerSocketId)}
        canShareScreen={roomState.allowMemberScreenShare || isHost}
        isHost={isHost}
        hasActiveDocument={Boolean(roomState.activeDocument)}
        unreadCount={unreadCount}
        membersCount={roomState.members.length}
        chatOpen={chatOpen}
        membersOpen={membersOpen}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreenShare={isSharingScreen ? stopScreenShare : startScreenShare}
        onOpenDocPicker={() => setDocPickerOpen(true)}
        onRaiseHand={handleRaiseHand}
        onToggleChat={() => setChatOpen(!chatOpen)}
        onToggleMembers={() => setMembersOpen(!membersOpen)}
        onLeaveRoom={onLeave}
      />

      {/* ─── 4. MODALS: DANH SÁCH THÀNH VIÊN VÀ CHỌN TÀI LIỆU ───────────── */}
      <MembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        members={roomState.members}
        currentSocketId={currentSocketId}
        isHost={isHost}
        allowMemberScreenShare={roomState.allowMemberScreenShare}
        onMuteMember={handleMute}
        onKickMember={handleKick}
        onTransferHost={handleTransfer}
        onToggleScreenSharePermission={handleToggleScreenSharePermission}
      />

      {/* Popup chọn tài liệu Thư viện dành cho Chủ phòng */}
      {docPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          onMouseDown={(e) => e.target === e.currentTarget && setDocPickerOpen(false)}
        >
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Chọn tài liệu để trình chiếu
              </h2>
              <button
                onClick={() => setDocPickerOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
              {docs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Thư viện của bạn chưa có tài liệu nào. Hãy nhập tài liệu ở mục "Thư viện" trước.
                </div>
              ) : (
                docs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDoc(d.id)}
                    className="w-full flex items-center gap-3 p-3 rounded border border-slate-200 dark:border-slate-800 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 hover:border-teal-400 text-left transition-colors cursor-pointer"
                  >
                    <div className="h-8 w-8 rounded flex items-center justify-center bg-teal-600 text-white font-bold text-xs shrink-0">
                      {d.title.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {d.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {d.pagesContent?.length || d.slides?.length || 1} trang
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setDocPickerOpen(false)}
                className="h-8 px-4 rounded border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
