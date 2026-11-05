// client/src/components/classrooms/RoomView.tsx
// Giao diện phòng học nhóm trực tuyến PeerMind — Chuẩn Google Meet kết hợp trình chiếu & sửa tài liệu realtime

import { useState, useEffect, useMemo, useRef } from 'react'
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
  BookOpen,
  StopCircle,
  RefreshCw,
} from 'lucide-react'
import {
  socket,
  joinRoom,
  leaveRoom,
  sendChatMessage,
  selectDocument,
  stopDocument,
  changeDocumentPage,
  sendDocumentAnnotations,
  clearDocumentAnnotations,
  muteMember,
  kickMember,
  transferHost,
  toggleScreenPermission,
  closeRoom,
} from '../../services/socket'
import { useRoomRTC } from '../../hooks/useRoomRTC'
import { supabase } from '../../services/supabaseClient'
import { isValidUUID } from '../../utils'
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
  AnnotationsByPage,
  DocumentAnnotation,
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
    pagesContent: [
      '# Tích phân bội\n- Định nghĩa tích phân kép\n- Tính chất cơ bản\n- Đổi biến số',
      '# Tích phân kép trên miền chữ nhật\n- Định lý Fubini\n- Ví dụ minh hoạ\n- Bài tập áp dụng',
    ],
  },
  {
    id: 2,
    title: 'Ngữ pháp tiếng Anh B1',
    color: '#8b5cf6',
    slides: [
      ['Present Perfect', ['have/has + V3', 'Kinh nghiệm & kết quả', 'for / since']],
    ],
    pagesContent: [
      '# Present Perfect Tense\n- have/has + V3\n- Diễn tả kinh nghiệm & kết quả\n- Dấu hiệu: for, since, already, yet',
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

/**
 * Component hiển thị Video Stream an toàn với AutoPlay, PlaysInline và Cleanup
 */
function MediaVideo({
  stream,
  muted = false,
  className = 'w-full h-full object-contain',
}: {
  stream: MediaStream | null
  muted?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    if (stream) {
      videoEl.srcObject = stream
      videoEl.play().catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[Video] Tự động phát bị chặn hoặc chờ tương tác:', err)
        }
      })
    } else {
      videoEl.srcObject = null
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  )
}

export default function RoomView({
  room,
  isHost: initialIsHost = false,
  userId = 'guest',
  userName = 'Thành viên',
  docs = [],
  onLeave,
}: RoomViewProps) {
  // Socket ID phản ứng tức thì theo trạng thái kết nối
  const [currentSocketId, setCurrentSocketId] = useState<string>(() => socket.id || '')

  useEffect(() => {
    const handleConnect = () => {
      console.log('🔌 Socket connected:', socket.id)
      setCurrentSocketId(socket.id || '')
    }
    const handleDisconnect = () => {
      console.log('🔌 Socket disconnected')
      setCurrentSocketId('')
    }

    if (socket.connected && socket.id) {
      setCurrentSocketId(socket.id)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [])

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
  const [pickerDocs, setPickerDocs] = useState<DocPickerItem[]>(docs.length > 0 ? docs : DOCS)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docsLoadError, setDocsLoadError] = useState<string | null>(null)
  const [annotationsByPage, setAnnotationsByPage] = useState<AnnotationsByPage>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // Optimistic Member đại diện cho chính người dùng hiện tại (tránh badge = 0 và màn hình đen)
  const mySelfMember = useMemo<RoomMember>(() => ({
    socketId: currentSocketId || 'local-me',
    userId,
    userName: userName || 'Chủ phòng',
    role: initialIsHost ? 'host' : 'member',
    avatarColor: '#0ea5e9',
    isMicOn,
    isCamOn,
    isScreenSharing: isSharingScreen,
    isSpeaking: false,
    joinedAt: Date.now(),
  }), [currentSocketId, userId, userName, initialIsHost, isMicOn, isCamOn, isSharingScreen])

  // Danh sách thành viên hiệu dụng luôn có ít nhất bản thân người dùng
  const effectiveMembers = useMemo<RoomMember[]>(() => {
    if (roomState.members.length === 0) {
      return [mySelfMember]
    }
    const hasMe = roomState.members.some(
      (m) => (currentSocketId && m.socketId === currentSocketId) || (userId && m.userId === userId)
    )
    if (!hasMe) {
      return [mySelfMember, ...roomState.members]
    }
    return roomState.members.map((m) => {
      if ((currentSocketId && m.socketId === currentSocketId) || (userId && m.userId === userId)) {
        return {
          ...m,
          isMicOn,
          isCamOn,
          isScreenSharing: isSharingScreen,
        }
      }
      return m
    })
  }, [roomState.members, mySelfMember, currentSocketId, userId, isMicOn, isCamOn, isSharingScreen])

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
      if (state.annotationsByPage) {
        setAnnotationsByPage(state.annotationsByPage)
      }
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

    // Đồng bộ chú thích trực quan trên trang tài liệu (In-Memory)
    const onDocAnnotate = ({ pageIndex, annotations }: { pageIndex: number; annotations: DocumentAnnotation[] }) => {
      setAnnotationsByPage((prev) => ({
        ...prev,
        [pageIndex]: annotations,
      }))
    }

    const onDocClearAnnotations = ({ pageIndex }: { pageIndex?: number }) => {
      if (pageIndex !== undefined) {
        setAnnotationsByPage((prev) => {
          const next = { ...prev }
          delete next[pageIndex]
          return next
        })
      } else {
        setAnnotationsByPage({})
      }
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
    socket.on('DOC:ANNOTATE', onDocAnnotate)
    socket.on('DOC:CLEAR_ANNOTATIONS', onDocClearAnnotations)
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
      socket.off('DOC:ANNOTATE', onDocAnnotate)
      socket.off('DOC:CLEAR_ANNOTATIONS', onDocClearAnnotations)
      socket.off('ROOM:KICKED', onKicked)
      socket.off('ROOM:CLOSED', onClosed)
      socket.off('ERROR', onError)
    }
  }, [room.code, userId, userName, onLeave, chatOpen])

  // Reset badge tin chưa đọc khi mở bảng chat
  useEffect(() => {
    if (chatOpen) setUnreadCount(0)
  }, [chatOpen])

  // Nạp danh sách tài liệu từ Database Supabase & LocalStorage khi mở modal chọn tài liệu
  useEffect(() => {
    if (!docPickerOpen) return

    let isMounted = true
    async function fetchPickerDocs() {
      setLoadingDocs(true)
      setDocsLoadError(null)
      try {
        const list: DocPickerItem[] = []

        // 1. Tải từ Supabase (nếu đã đăng nhập với tài khoản thật)
        if (isValidUUID(userId)) {
          const { data, error } = await supabase
            .from('documents')
            .select('id, original_name, filename, subject, pages_content, total_pages, created_at')
            .eq('owner_user_id', userId)
            .order('created_at', { ascending: false })

          if (error) {
            console.warn('Lỗi query documents từ Supabase:', error.message)
          } else if (data && Array.isArray(data)) {
            data.forEach((d) => {
              const docTitle = d.original_name || d.filename || 'Tài liệu'
              let rawPages: string[] = []
              if (Array.isArray(d.pages_content)) {
                rawPages = d.pages_content
              } else if (typeof d.pages_content === 'string') {
                try {
                  const parsed = JSON.parse(d.pages_content)
                  if (Array.isArray(parsed)) rawPages = parsed
                } catch {
                  if (d.pages_content.includes('[[--PERMIND_PAGE_BREAK--]]')) {
                    rawPages = d.pages_content
                      .split(/\[\[--PERMIND_PAGE_BREAK--\]\]/)
                      .map((p: string) => p.trim())
                      .filter(Boolean)
                  } else {
                    rawPages = [d.pages_content]
                  }
                }
              }

              // Nếu có d.total_pages lớn hơn rawPages.length:
              if (typeof d.total_pages === 'number' && d.total_pages > rawPages.length) {
                while (rawPages.length < d.total_pages) {
                  rawPages.push(`# ${docTitle}\n\nTrang ${rawPages.length + 1}`)
                }
              }

              const safePages = rawPages.length > 0 ? rawPages : [`# ${docTitle}\n\nTài liệu học tập.`]
              list.push({
                id: d.id,
                title: docTitle,
                color: '#0b7a75',
                pagesContent: safePages,
              })
            })
          }
        }

        // 2. Tải thêm từ localStorage (Khách / Demo / Cache)
        const localKeys = [`permind_docs_${userId || 'guest'}`, 'permind_docs_guest', 'peermind_docs_guest']
        localKeys.forEach((key) => {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)
              if (Array.isArray(parsed)) {
                parsed.forEach((d: any) => {
                  if (!list.some((x) => x.id === d.id)) {
                    const docTitle = d.title || d.original_name || d.filename || 'Tài liệu'
                    let rawPages: string[] = []
                    if (Array.isArray(d.pagesContent)) {
                      rawPages = d.pagesContent
                    } else if (Array.isArray(d.pages_content)) {
                      rawPages = d.pages_content
                    } else if (typeof d.pagesContent === 'string') {
                      try {
                        const parsed = JSON.parse(d.pagesContent)
                        if (Array.isArray(parsed)) rawPages = parsed
                      } catch {
                        rawPages = [d.pagesContent]
                      }
                    }

                    const totalCount = d.pagesCount || d.total_pages || 0
                    if (typeof totalCount === 'number' && totalCount > rawPages.length) {
                      while (rawPages.length < totalCount) {
                        rawPages.push(`# ${docTitle}\n\nTrang ${rawPages.length + 1}`)
                      }
                    }

                    const safePages = rawPages.length > 0 ? rawPages : [`# ${docTitle}\n\nTài liệu học tập.`]
                    list.push({
                      id: d.id,
                      title: docTitle,
                      color: d.color || '#0ea5e9',
                      pagesContent: safePages,
                    })
                  }
                })
              }
            }
          } catch {}
        })

        // 3. Nếu chưa có tài liệu nào, bổ sung tài liệu mẫu mặc định
        if (list.length === 0 && docs.length > 0) {
          list.push(...docs)
        } else if (list.length === 0) {
          list.push(...DOCS)
        }

        if (isMounted) {
          setPickerDocs(list)
        }
      } catch (err: any) {
        console.error('Lỗi khi nạp danh sách tài liệu:', err)
        if (isMounted) {
          setDocsLoadError('Không thể nạp danh sách tài liệu. Vui lòng thử lại.')
        }
      } finally {
        if (isMounted) {
          setLoadingDocs(false)
        }
      }
    }

    fetchPickerDocs()

    return () => {
      isMounted = false
    }
  }, [docPickerOpen, userId, docs])

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

  // Chọn tài liệu trình chiếu (0ms Optimistic Update trên máy Host)
  const handleSelectDoc = (selectedDoc: DocPickerItem) => {
    const rawPages = selectedDoc.pagesContent && selectedDoc.pagesContent.length > 0
      ? selectedDoc.pagesContent
      : selectedDoc.slides
      ? selectedDoc.slides.map((s: any) => (Array.isArray(s) ? s[0] : s.title))
      : ['Trang 1']

    const docData: RoomDocumentData = {
      id: selectedDoc.id,
      originalDocumentId: typeof selectedDoc.id === 'number' && selectedDoc.id > 0 ? selectedDoc.id : null,
      title: selectedDoc.title,
      totalPages: rawPages.length,
      pagesContent: rawPages,
      currentPage: 0,
      updatedAt: new Date().toISOString(),
    }

    // Hiển thị ngay trên sân khấu của Host
    setRoomState((prev) => ({
      ...prev,
      activeDocument: docData,
    }))
    setAnnotationsByPage({})

    // Gửi sự kiện Socket để đồng bộ cho toàn bộ phòng
    selectDocument(room.code, selectedDoc.id, {
      title: docData.title,
      pagesContent: docData.pagesContent,
      totalPages: docData.totalPages,
    })

    setDocPickerOpen(false)
  }

  // Host dừng trình chiếu tài liệu
  const handleStopDocPresentation = () => {
    stopDocument(room.code)
    setRoomState((prev) => ({
      ...prev,
      activeDocument: null,
    }))
    setAnnotationsByPage({})
  }

  // Lật trang tài liệu (Cập nhật tức thì 0ms trên máy Host và gửi Socket)
  const handlePageChange = (pageIndex: number) => {
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
    changeDocumentPage(room.code, pageIndex)
  }

  // Cập nhật chú thích trực quan trên trang tài liệu (Khoanh vùng / Highlight / Text)
  const handleUpdateAnnotations = (pageIndex: number, newAnnotations: DocumentAnnotation[]) => {
    setAnnotationsByPage((prev) => ({
      ...prev,
      [pageIndex]: newAnnotations,
    }))
    sendDocumentAnnotations(room.code, pageIndex, newAnnotations)
  }

  // Xóa chú thích trên trang (hoặc toàn bộ)
  const handleClearAnnotations = (pageIndex?: number) => {
    if (pageIndex !== undefined) {
      setAnnotationsByPage((prev) => {
        const next = { ...prev }
        delete next[pageIndex]
        return next
      })
    } else {
      setAnnotationsByPage({})
    }
    clearDocumentAnnotations(room.code, pageIndex)
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

  // Trạng thái chia sẻ màn hình
  const isLocalSharing = Boolean(isSharingScreen && screenStream)
  const activeScreenSharerSocketId = roomState.screenSharerSocketId
  const isRemoteSharing = Boolean(
    activeScreenSharerSocketId &&
    activeScreenSharerSocketId !== currentSocketId &&
    remoteStreams[activeScreenSharerSocketId]
  )
  const isSomeoneSharing = isLocalSharing || Boolean(activeScreenSharerSocketId)

  // Xác định người đang chia sẻ màn hình
  const screenSharerMember = useMemo(() => {
    if (isLocalSharing) {
      return mySelfMember
    }
    if (!activeScreenSharerSocketId) return null
    return roomState.members.find((m) => m.socketId === activeScreenSharerSocketId)
  }, [isLocalSharing, mySelfMember, activeScreenSharerSocketId, roomState.members])

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

          {/* Nút Host chọn tài liệu hoặc Đổi tài liệu */}
          {isHost && (
            <button
              onClick={() => setDocPickerOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{roomState.activeDocument ? 'Đổi tài liệu' : 'Chiếu tài liệu'}</span>
            </button>
          )}

          {/* Nút Dừng chiếu tài liệu (khi đang chiếu) */}
          {isHost && roomState.activeDocument && (
            <button
              onClick={handleStopDocPresentation}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              title="Dừng trình chiếu tài liệu"
            >
              <StopCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden md:inline">Dừng chiếu</span>
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
          {/* TRƯỜNG HỢP A: ĐANG CÓ CHIA SẺ MÀN HÌNH (CỦA MÌNH HOẶC THÀNH VIÊN KHÁC) */}
          {isSomeoneSharing ? (
            <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden">
              <div className="w-full flex-1 rounded-md overflow-hidden bg-black flex items-center justify-center relative shadow-2xl">
                {isLocalSharing ? (
                  <MediaVideo
                    stream={screenStream}
                    muted={true}
                    className="w-full h-full object-contain"
                  />
                ) : isRemoteSharing && activeScreenSharerSocketId ? (
                  <MediaVideo
                    stream={remoteStreams[activeScreenSharerSocketId]}
                    muted={false}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-400 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Đang kết nối tín hiệu màn hình từ {screenSharerMember?.userName || 'thành viên'}…</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur px-3 py-1 rounded text-xs text-white border border-slate-700/50 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span>
                    {isLocalSharing
                      ? 'Màn hình của bạn (Đang chia sẻ vào phòng)'
                      : `Màn hình chia sẻ của ${screenSharerMember?.userName || 'thành viên'}`}
                  </span>
                </div>
              </div>

              {/* Dải Camera thu nhỏ phía dưới */}
              <VideoGrid
                members={effectiveMembers}
                localSocketId={currentSocketId}
                currentUserId={userId}
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
                  annotations={annotationsByPage[roomState.activeDocument.currentPage || 0] || []}
                  onPageChange={handlePageChange}
                  onUpdateAnnotations={handleUpdateAnnotations}
                  onClearAnnotations={handleClearAnnotations}
                />
              </div>

              {/* Dải Camera thu nhỏ phía dưới */}
              <VideoGrid
                members={effectiveMembers}
                localSocketId={currentSocketId}
                currentUserId={userId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                isPresentationMode={true}
              />
            </div>
          ) : (
            /* TRƯỜNG HỢP C: CHẾ ĐỘ CUỘC HỌP THUẦN (GOOGLE MEET VIDEO GRID) */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <VideoGrid
                members={effectiveMembers}
                localSocketId={currentSocketId}
                currentUserId={userId}
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
          membersCount={effectiveMembers.length}
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
        membersCount={effectiveMembers.length}
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
        members={effectiveMembers}
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
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Chọn tài liệu Thư viện để trình chiếu
                </h2>
              </div>
              <button
                onClick={() => setDocPickerOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung danh sách tài liệu */}
            <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
              {loadingDocs ? (
                <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin text-teal-500" />
                  <span>Đang tải danh sách tài liệu từ kho lưu trữ...</span>
                </div>
              ) : docsLoadError ? (
                <div className="py-6 text-center text-xs text-rose-500 flex flex-col items-center justify-center gap-2">
                  <p>{docsLoadError}</p>
                  <button
                    onClick={() => {
                      setDocsLoadError(null)
                      setDocPickerOpen(false)
                      setTimeout(() => setDocPickerOpen(true), 50)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs hover:bg-slate-200 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Thử lại</span>
                  </button>
                </div>
              ) : pickerDocs.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <FileText className="w-8 h-8 mb-2 text-slate-400 opacity-60" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Chưa có tài liệu nào trong Thư viện</p>
                  <p className="mt-1 text-slate-400">Bạn vui lòng nhập tài liệu (PDF/DOCX) ở mục Thư viện trước nhé.</p>
                </div>
              ) : (
                pickerDocs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDoc(d)}
                    className="w-full flex items-center gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 hover:border-teal-500 text-left transition-colors cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded flex items-center justify-center bg-teal-600 text-white font-bold text-xs shrink-0 shadow-sm">
                      {d.title.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        {d.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {d.pagesContent?.length || d.slides?.length || 1} trang tài liệu
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Chiếu ngay →
                    </span>
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
