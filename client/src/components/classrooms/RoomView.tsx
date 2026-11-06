// client/src/components/classrooms/RoomView.tsx
// Giao diện phòng học & trình chiếu trực tuyến PeerMind Meet chuẩn hiện đại cho sinh viên (WebRTC P2P)

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  Maximize2,
  Minimize2,
  BookOpen,
  StopCircle,
  RefreshCw,
  Share2,
  Monitor,
  Camera,
  ZoomIn,
  ZoomOut,
  Scan,
  Pause,
  Play,
  WifiOff,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import {
  socket,
  joinRoom,
  leaveRoom,
  closeRoom,
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
} from '../../services/socket'
import { useRoomRTC } from '../../hooks/useRoomRTC'
import { VideoGrid } from './VideoGrid'
import { ClassroomControls } from './ClassroomControls'
import { ClassroomDrawer } from './ClassroomDrawer'
import { DocumentCollaborativeViewer } from './DocumentCollaborativeViewer'
import { supabase } from '../../services/supabase'

const isValidUUID = (id?: string) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
import type {
  RoomState,
  RoomMember,
  ChatMessage,
  RoomDocumentData,
  DocumentAnnotation,
  AnnotationsByPage,
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
  isPaused = false,
}: {
  stream: MediaStream | null
  muted?: boolean
  className?: string
  isPaused?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    if (stream) {
      videoEl.srcObject = stream
      if (isPaused) {
        videoEl.pause()
      } else {
        videoEl.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('[Video] Tự động phát bị chặn hoặc chờ tương tác:', err)
          }
        })
      }
    } else {
      videoEl.srcObject = null
    }
  }, [stream, isPaused])

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

interface FloatingReaction {
  id: string
  emoji: string
  left: number
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
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() => socket.connected)

  useEffect(() => {
    const handleConnect = () => {
      console.log('🔌 Socket connected:', socket.id)
      setCurrentSocketId(socket.id || '')
      setIsSocketConnected(true)
    }
    const handleDisconnect = () => {
      console.log('🔌 Socket disconnected')
      setCurrentSocketId('')
      setIsSocketConnected(false)
    }

    if (socket.connected && socket.id) {
      setCurrentSocketId(socket.id)
      setIsSocketConnected(true)
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
  const [activeDrawerTab, setActiveDrawerTab] = useState<'members' | 'chat' | null>(null)
  const [docPickerOpen, setDocPickerOpen] = useState(false)
  const [pickerDocs, setPickerDocs] = useState<DocPickerItem[]>(docs.length > 0 ? docs : DOCS)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docsLoadError, setDocsLoadError] = useState<string | null>(null)
  const [annotationsByPage, setAnnotationsByPage] = useState<AnnotationsByPage>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Thời lượng buổi học
  const [durationSeconds, setDurationSeconds] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedDuration = useMemo(() => {
    const hrs = Math.floor(durationSeconds / 3600)
    const mins = Math.floor((durationSeconds % 3600) / 60)
    const secs = durationSeconds % 60
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [durationSeconds])

  // Trạng thái Sân khấu: Zoom, Tạm dừng, Tránh lặp vô hạn (Infinity Mirror)
  const [stageZoom, setStageZoom] = useState<number>(1)
  const [isStagePaused, setIsStagePaused] = useState<boolean>(false)
  const [showLocalMirrorPreview, setShowLocalMirrorPreview] = useState<boolean>(false)
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([])
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set())

  const stageContainerRef = useRef<HTMLDivElement>(null)

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

  // Memoize handler lỗi quyền thiết bị
  const handlePermissionError = useCallback((msg: string) => {
    setErrorMessage(msg)
  }, [])

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
    stopAllMedia,
  } = useRoomRTC({
    roomCode: room.code,
    currentSocketId,
    members: roomState.members,
    onPermissionError: handlePermissionError,
  })

  // Hàm rời phòng tập trung: giải phóng toàn bộ Camera, Mic, Screen Share và thông báo Server
  const handleLeave = useCallback(() => {
    console.log('[RoomView] Thực hiện rời phòng: Dọn dẹp thiết bị media...')
    stopAllMedia()
    leaveRoom(room.code)
    onLeave()
  }, [stopAllMedia, room.code, onLeave])

  // Đóng phòng hoàn toàn cho tất cả mọi người (Chủ phòng)
  const handleCloseRoomForEveryone = useCallback(() => {
    stopAllMedia()
    closeRoom(room.code)
    onLeave()
  }, [stopAllMedia, room.code, onLeave])

  // Đảm bảo dừng 100% camera và mic khi RoomView bị unmount
  useEffect(() => {
    return () => {
      stopAllMedia()
    }
  }, [stopAllMedia])

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
    const list = [...roomState.members]
    const hasMe = list.some(
      (m) =>
        (currentSocketId && m.socketId === currentSocketId) ||
        (m.userId && m.userId === userId) ||
        m.socketId === 'local-me'
    )
    if (!hasMe) {
      list.unshift(mySelfMember)
    } else {
      const idx = list.findIndex(
        (m) =>
          (currentSocketId && m.socketId === currentSocketId) ||
          (m.userId && m.userId === userId) ||
          m.socketId === 'local-me'
      )
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          isMicOn,
          isCamOn,
          isScreenSharing: isSharingScreen,
        }
      }
    }
    return list
  }, [roomState.members, mySelfMember, currentSocketId, userId, isMicOn, isCamOn, isSharingScreen])

  // ─── ĐĂNG KÝ VÀ LẮNG NGHE SỰ KIỆN REALTIME SOCKET.IO ────────────────────
  useEffect(() => {
    joinRoom(room.code, {
      id: userId,
      name: userName,
      avatarColor: '#0ea5e9',
    })

    const onRoomState = (state: RoomState) => {
      setRoomState((prev) => ({
        ...prev,
        ...state,
        members: state.members || [],
        activeDocument: state.activeDocument !== undefined ? state.activeDocument : prev.activeDocument,
      }))
      if (state.annotationsByPage) {
        setAnnotationsByPage(state.annotationsByPage)
      }
    }

    const onMemberJoined = (member: RoomMember) => {
      setRoomState((prev) => ({
        ...prev,
        members: [...prev.members.filter((m) => m.socketId !== member.socketId), member],
      }))
      setToastMessage(`${member.userName} vừa tham gia phòng`)
      setTimeout(() => setToastMessage(null), 3000)
    }

    const onMemberLeft = ({ socketId }: { socketId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.socketId !== socketId),
        screenSharerSocketId: prev.screenSharerSocketId === socketId ? null : prev.screenSharerSocketId,
      }))
      setRaisedHands((prev) => {
        const next = new Set(prev)
        next.delete(socketId)
        return next
      })
    }

    const onMemberUpdated = (data: Partial<RoomMember> & { socketId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.socketId === data.socketId ? { ...m, ...data } : m)),
      }))
    }

    const onHostChanged = (data: { newHostUserId: string; newHostSocketId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        hostSocketId: data.newHostSocketId,
        hostUserId: data.newHostUserId,
      }))
      setToastMessage(`Quyền Chủ phòng đã được chuyển giao`)
      setTimeout(() => setToastMessage(null), 4000)
    }

    const onChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
      if (activeDrawerTab !== 'chat') {
        setUnreadCount((c) => c + 1)
      }

      // Xử lý giơ tay
      if (msg.text.includes('✋')) {
        const sid = msg.senderId || 'unknown'
        setRaisedHands((prev) => new Set(prev).add(sid))
      }
    }

    const onChatHistory = (history: ChatMessage[]) => {
      setMessages(history)
    }

    const onDocSync = (document: RoomDocumentData | null) => {
      setRoomState((prev) => ({
        ...prev,
        activeDocument: document,
      }))
    }

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

    const onKicked = ({ reason }: { reason: string }) => {
      alert(reason || 'Bạn đã bị mời ra khỏi phòng học.')
      handleLeave()
    }

    const onClosed = ({ reason }: { reason: string }) => {
      alert(reason || 'Chủ phòng đã kết thúc buổi học.')
      handleLeave()
    }

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
  }, [room.code, userId, userName, handleLeave, activeDrawerTab])

  // Reset badge tin chưa đọc khi mở tab chat
  useEffect(() => {
    if (activeDrawerTab === 'chat') setUnreadCount(0)
  }, [activeDrawerTab])

  // Lắng nghe phím tắt toàn cục (M, V, S, H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const key = e.key.toLowerCase()
      if (key === 'm') {
        e.preventDefault()
        toggleMic()
      } else if (key === 'v') {
        e.preventDefault()
        toggleCam()
      } else if (key === 's') {
        e.preventDefault()
        if (isSharingScreen) stopScreenShare()
        else if (roomState.allowMemberScreenShare || isHost) startScreenShare()
      } else if (key === 'h') {
        e.preventDefault()
        handleRaiseHand()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleMic, toggleCam, isSharingScreen, stopScreenShare, startScreenShare, roomState.allowMemberScreenShare, isHost])

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
                  } else {
                    rawPages = [d.pages_content]
                  }
                }
              }

              const safePages = rawPages.length > 0 ? rawPages : [`# ${docTitle}\n\nNội dung tài liệu học tập.`]

              list.push({
                id: d.id,
                title: docTitle,
                color: '#0ea5e9',
                pagesContent: safePages,
              })
            })
          }
        }

        // 2. Tải thêm từ LocalStorage (tài liệu khách và cache)
        const localKeys = ['peermind_docs_guest', 'peermind_library_docs']
        localKeys.forEach((key) => {
          try {
            const raw = localStorage.getItem(key)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) {
                parsed.forEach((d: any) => {
                  if (!list.some((existing) => existing.id === d.id)) {
                    const docTitle = d.title || d.original_name || 'Tài liệu'
                    let rawPages: string[] = []
                    if (Array.isArray(d.pagesContent)) rawPages = d.pagesContent
                    else if (Array.isArray(d.slides)) {
                      rawPages = d.slides.map((s: any) =>
                        Array.isArray(s) ? `# ${s[0]}\n\n${s[1]?.join('\n')}` : `# ${s.title}\n\n${s.points?.join('\n')}`
                      )
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
      setToastMessage(`Đã sao chép mã phòng: ${room.code}`)
      setTimeout(() => {
        setCopiedCode(false)
        setToastMessage(null)
      }, 2500)
    }
  }

  // Mời bạn bè (Copy link)
  const handleInviteFriends = () => {
    const inviteUrl = `${window.location.origin}/#classrooms?join=${room.code}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl)
      setToastMessage('Đã sao chép liên kết mời vào phòng!')
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  // Gửi tin nhắn chat
  const handleSendMessage = (text: string) => {
    sendChatMessage(room.code, text)
  }

  // Giơ tay phát biểu
  const handleRaiseHand = () => {
    handleSendMessage('✋ [Giơ tay phát biểu]')
    setRaisedHands((prev) => new Set(prev).add('local-me'))
    setToastMessage('Bạn đã giơ tay phát biểu')
    setTimeout(() => setToastMessage(null), 2500)
  }

  // Gửi biểu cảm nhanh (Floating Reaction)
  const handleSendReaction = (emoji: string) => {
    handleSendMessage(emoji)
    const id = `react_${Date.now()}_${Math.random()}`
    const left = Math.floor(Math.random() * 50) + 25
    setFloatingReactions((prev) => [...prev, { id, emoji, left }])
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id))
    }, 2200)
  }

  // Chọn tài liệu trình chiếu
  const handleSelectDoc = (selectedDoc: DocPickerItem) => {
    const rawPages =
      selectedDoc.pagesContent && selectedDoc.pagesContent.length > 0
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

    setRoomState((prev) => ({
      ...prev,
      activeDocument: docData,
    }))
    setAnnotationsByPage({})

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

  // Lật trang tài liệu
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

  // Chú thích trực quan
  const handleUpdateAnnotations = (pageIndex: number, newAnnotations: DocumentAnnotation[]) => {
    setAnnotationsByPage((prev) => ({
      ...prev,
      [pageIndex]: newAnnotations,
    }))
    sendDocumentAnnotations(room.code, pageIndex, newAnnotations)
  }

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

  // Bật/tắt toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Chụp ảnh màn hình sân khấu
  const handleTakeScreenshot = () => {
    const stageEl = stageContainerRef.current
    const videoEl = stageEl?.querySelector('video')
    if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = videoEl.videoWidth
        canvas.height = videoEl.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
          const dataUrl = canvas.toDataURL('image/png')
          const link = document.createElement('a')
          link.download = `peermind-screenshot-${room.code}-${Date.now()}.png`
          link.href = dataUrl
          link.click()
          setToastMessage('Đã lưu ảnh chụp màn hình thành công!')
          setTimeout(() => setToastMessage(null), 3000)
          return
        }
      } catch (e) {
        console.warn('Lỗi capture canvas:', e)
      }
    }
    setToastMessage('Ảnh chụp màn hình khả dụng khi đang có luồng chia sẻ video.')
    setTimeout(() => setToastMessage(null), 3000)
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

  const screenSharerMember = useMemo(() => {
    if (isLocalSharing) return mySelfMember
    if (!activeScreenSharerSocketId) return null
    return roomState.members.find((m) => m.socketId === activeScreenSharerSocketId)
  }, [isLocalSharing, mySelfMember, activeScreenSharerSocketId, roomState.members])

  // Trạng thái kết nối WebRTC P2P
  const connectionStatus = useMemo(() => {
    if (!isSocketConnected) return { label: 'Mất kết nối', color: 'bg-rose-500' }
    return { label: 'WebRTC P2P: Tốt', color: 'bg-emerald-400' }
  }, [isSocketConnected])

  const hasPresentationOrShare = isSomeoneSharing || Boolean(roomState.activeDocument)

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#0B1220] text-slate-100 font-sans select-none">
      {/* ─── BANNER CẢNH BÁO MẤT KẾT NỐI MẠNG ─────────────────────────────── */}
      {!isSocketConnected && (
        <div className="bg-amber-600/95 text-slate-950 font-semibold text-xs px-4 py-1.5 flex items-center justify-center gap-2 shadow-md shrink-0 z-30 animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>Đang mất kết nối tới máy chủ phòng học. Hệ thống đang tự động kết nối lại…</span>
        </div>
      )}

      {/* ─── 1. THANH TIÊU ĐỀ TRÊN (HEADER MỎNG 56PX) ────────────────────── */}
      <header className="flex h-14 items-center justify-between px-3 sm:px-5 border-b border-slate-800/80 bg-[#0B1220]/90 backdrop-blur-xl shrink-0 z-20">
        {/* Bên trái: Nút quay lại, Tên phòng, Chip mã, Badge Host */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={handleLeave}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            title="Quay lại danh sách phòng"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-[140px] sm:max-w-xs">
            {roomState.name || 'Phòng học nhóm'}
          </h1>

          {/* Chip Mã phòng với toast sao chép */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 text-teal-300 border border-slate-700/60 hover:bg-slate-800 text-xs font-mono tabular-nums transition-all cursor-pointer shrink-0 shadow-xs"
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
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60 shrink-0 tracking-wide">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Chủ phòng</span>
            </span>
          )}
        </div>

        {/* Ở giữa: Đồng hồ thời lượng + Chấm trạng thái kết nối WebRTC */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800/60 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDuration}</span>
          </div>

          <div className="w-px h-3 bg-slate-700/60" />

          <div
            className="flex items-center gap-1.5 cursor-help"
            title={connectionStatus.label}
          >
            <span className={`w-2 h-2 rounded-full ${connectionStatus.color} animate-pulse`} />
            <span className="text-[11px] text-slate-400">P2P Tốt</span>
          </div>
        </div>

        {/* Bên phải: Mời bạn, Dừng chiếu (Host), Toàn màn hình */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Nút Host Dừng chiếu tài liệu / Đổi tài liệu khi đang chiếu */}
          {isHost && roomState.activeDocument && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDocPickerOpen(true)}
                className="hidden sm:inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                title="Chọn tài liệu khác để trình chiếu"
              >
                <Presentation className="w-3.5 h-3.5 text-teal-400" />
                <span>Đổi tài liệu</span>
              </button>
              <button
                onClick={handleStopDocPresentation}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-medium transition-colors cursor-pointer"
                title="Dừng trình chiếu tài liệu này"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dừng chiếu</span>
              </button>
            </div>
          )}

          {/* Nút Mời bạn bè */}
          <button
            onClick={handleInviteFriends}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-medium transition-colors cursor-pointer"
            title="Sao chép liên kết mời bạn vào phòng"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mời bạn</span>
          </button>

          {/* Nút Toàn màn hình */}
          <button
            onClick={toggleFullscreen}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Thông báo Toast nổi góc trên */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-teal-500/60 text-teal-200 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner thông báo lỗi nếu có */}
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

      {/* ─── 2. VÙNG TRUNG TÂM (SÂN KHẤU CHÍNH + FILMSTRIP + DRAWER) ───────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden relative">
          {/* TRƯỜNG HỢP A: ĐANG CÓ CHIA SẺ MÀN HÌNH */}
          {isSomeoneSharing ? (
            <div className="w-full h-full flex flex-col lg:flex-row items-center justify-between overflow-hidden gap-2">
              {/* SÂN KHẤU MÀN HÌNH CHIA SẺ */}
              <div
                ref={stageContainerRef}
                className="w-full flex-1 h-full rounded-2xl overflow-hidden bg-radial from-slate-900/90 via-[#0B1220] to-[#070b12] border border-slate-800/80 flex items-center justify-center relative shadow-2xl group"
              >
                {/* 1. Xử lý Infinity Mirror khi chính mình chia sẻ tab hiện tại */}
                {isLocalSharing && !showLocalMirrorPreview ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 max-w-md animate-in fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-teal-950/60 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-4 shadow-lg shadow-teal-500/10">
                      <Monitor className="w-8 h-8 animate-pulse" />
                    </div>
                    <h3 className="font-bold text-base text-slate-100">
                      Bạn đang chia sẻ màn hình với cả phòng
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      💡 Hãy chuyển sang một cửa sổ hoặc tab khác (tài liệu, slide, code...) để mọi người cùng theo dõi nội dung của bạn mà không bị hiển thị lặp vô hạn.
                    </p>

                    <div className="flex items-center gap-2 mt-5">
                      <button
                        onClick={stopScreenShare}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition-colors cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4" />
                        <span>Dừng chia sẻ</span>
                      </button>
                      <button
                        onClick={() => setShowLocalMirrorPreview(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                        title="Bật video xem trước (có thể lặp hình)"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem bản thu nhỏ</span>
                      </button>
                    </div>
                  </div>
                ) : isLocalSharing ? (
                  /* Bản xem trước cục bộ (khi người dùng chủ động bật) */
                  <div
                    style={{ transform: `scale(${stageZoom})` }}
                    className="w-full h-full transition-transform duration-150 flex items-center justify-center"
                  >
                    <MediaVideo
                      stream={screenStream}
                      muted={true}
                      isPaused={isStagePaused}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : isRemoteSharing && activeScreenSharerSocketId ? (
                  /* Màn hình chia sẻ từ thành viên khác trong phòng */
                  <div
                    style={{ transform: `scale(${stageZoom})` }}
                    className="w-full h-full transition-transform duration-150 flex items-center justify-center"
                  >
                    <MediaVideo
                      stream={remoteStreams[activeScreenSharerSocketId]}
                      muted={false}
                      isPaused={isStagePaused}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Đang kết nối tín hiệu màn hình từ {screenSharerMember?.userName || 'thành viên'}…</span>
                  </div>
                )}

                {/* Nhãn nổi nhỏ góc trên trái */}
                <div className="absolute top-3 left-3 bg-[#0B1220]/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-slate-200 border border-slate-700/60 flex items-center gap-2 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="font-medium">
                    {isLocalSharing
                      ? 'Bạn đang chia sẻ màn hình'
                      : `${screenSharerMember?.userName || 'Thành viên'} đang chia sẻ màn hình`}
                  </span>
                </div>

                {/* Thanh công cụ nổi trên sân khấu khi rê chuột (Hover Floating Toolbar) */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1.5 rounded-full bg-[#0B1220]/90 backdrop-blur-md border border-slate-700/70 shadow-2xl flex items-center gap-1.5 z-20">
                  <button
                    onClick={() => setStageZoom((z) => Math.min(2, z + 0.25))}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setStageZoom((z) => Math.max(0.75, z - 0.25))}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setStageZoom(1)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Ghim vừa màn hình"
                  >
                    <Scan className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-slate-700" />
                  <button
                    onClick={() => setIsStagePaused(!isStagePaused)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isStagePaused ? 'Tiếp tục phát' : 'Tạm dừng màn hình'}
                  >
                    {isStagePaused ? <Play className="w-3.5 h-3.5 text-teal-400" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleTakeScreenshot}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Chụp ảnh màn hình"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dải người tham gia (Filmstrip dọc Desktop) */}
              <VideoGrid
                members={effectiveMembers}
                localSocketId={currentSocketId}
                currentUserId={userId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                layoutMode="filmstrip-vertical"
                raisedHands={raisedHands}
              />
            </div>
          ) : /* TRƯỜNG HỢP B: ĐANG TRÌNH CHIẾU TÀI LIỆU */
          roomState.activeDocument ? (
            <div className="w-full h-full flex flex-col lg:flex-row items-center justify-between overflow-hidden gap-2">
              <div className="w-full flex-1 h-full rounded-2xl overflow-hidden shadow-2xl relative">
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

              {/* Dải người tham gia Filmstrip dọc Desktop */}
              <VideoGrid
                members={effectiveMembers}
                localSocketId={currentSocketId}
                currentUserId={userId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                layoutMode="filmstrip-vertical"
                raisedHands={raisedHands}
              />
            </div>
          ) : (
            /* TRƯỜNG HỢP C: CHƯA CÓ AI CHIA SẺ (EMPTY STATE HOẶC GRID HỌP THUẦN) */
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              {/* Nếu có người bật camera -> Hiển thị Video Grid họp thuần */}
              {effectiveMembers.some((m) => m.isCamOn) ? (
                <VideoGrid
                  members={effectiveMembers}
                  localSocketId={currentSocketId}
                  currentUserId={userId}
                  localStream={localStream}
                  remoteStreams={remoteStreams}
                  layoutMode="grid"
                  raisedHands={raisedHands}
                />
              ) : (
                /* Empty state chào đón sinh viên đẹp mắt */
                <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-radial from-slate-900/80 via-[#0B1220]/90 to-[#070b12] border border-slate-800/80 text-center flex flex-col items-center shadow-2xl animate-in fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-teal-950/60 border border-teal-500/40 text-teal-400 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/10">
                    <Presentation className="w-8 h-8" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                    Không gian học tập & trình chiếu
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed max-w-sm">
                    Bắt đầu buổi học nhóm bằng cách chọn tài liệu bài học từ Thư viện hoặc chia sẻ màn hình máy tính của bạn.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 mt-6 w-full max-w-xs">
                    {/* Nút Chiếu tài liệu */}
                    <button
                      onClick={() => setDocPickerOpen(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-600/30"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Chiếu tài liệu bài học</span>
                    </button>

                    {/* Nút Chia sẻ màn hình */}
                    <button
                      onClick={startScreenShare}
                      disabled={!roomState.allowMemberScreenShare && !isHost}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Monitor className="w-4 h-4 text-teal-400" />
                      <span>Chia sẻ màn hình</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dải Filmstrip ngang trên Mobile khi đang trình chiếu */}
          {hasPresentationOrShare && (
            <div className="w-full lg:hidden shrink-0 mt-1">
              <VideoGrid
                members={effectiveMembers}
                localSocketId={currentSocketId}
                currentUserId={userId}
                localStream={localStream}
                remoteStreams={remoteStreams}
                layoutMode="filmstrip-horizontal"
                raisedHands={raisedHands}
              />
            </div>
          )}
        </main>

        {/* ─── 3. NGĂN KÉO PHẢI (CLASSROOM DRAWER: THÀNH VIÊN & CHAT) ──────── */}
        <ClassroomDrawer
          open={activeDrawerTab !== null}
          activeTab={activeDrawerTab || 'chat'}
          onTabChange={(tab) => setActiveDrawerTab(tab)}
          onClose={() => setActiveDrawerTab(null)}
          members={effectiveMembers}
          messages={messages}
          currentUserId={userId}
          currentSocketId={currentSocketId}
          isHost={isHost}
          allowMemberScreenShare={roomState.allowMemberScreenShare}
          unreadCount={unreadCount}
          onSendMessage={handleSendMessage}
          onMuteMember={handleMute}
          onKickMember={handleKick}
          onTransferHost={handleTransfer}
          onToggleScreenSharePermission={handleToggleScreenSharePermission}
        />
      </div>

      {/* ─── 4. BIỂU CẢM BAY LÊN TRÊN SÂN KHẤU (FLOATING REACTIONS) ────────── */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{ left: `${r.left}%` }}
            className="absolute bottom-24 text-3xl animate-in slide-in-from-bottom-12 fade-in duration-700 fill-mode-forwards"
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* ─── 5. THANH ĐIỀU KHIỂN DƯỚI CÙNG (FLOATING PILL CĂN GIỮA) ────────── */}
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
        activeDrawerTab={activeDrawerTab}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreenShare={isSharingScreen ? stopScreenShare : startScreenShare}
        onOpenDocPicker={() => setDocPickerOpen(true)}
        onRaiseHand={handleRaiseHand}
        onSendReaction={handleSendReaction}
        onToggleDrawer={(tab) => {
          setActiveDrawerTab(activeDrawerTab === tab ? null : tab)
        }}
        onLeaveRoom={handleLeave}
        onCloseRoomForEveryone={handleCloseRoomForEveryone}
      />

      {/* ─── 6. MODAL CHỌN TÀI LIỆU TRÌNH CHIẾU DÀNH CHO CHỦ PHÒNG ────────── */}
      {docPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onMouseDown={(e) => e.target === e.currentTarget && setDocPickerOpen(false)}
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#0F172A] p-5 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-400" />
                <h2 className="font-bold text-sm text-slate-100">
                  Chọn tài liệu Thư viện để trình chiếu
                </h2>
              </div>
              <button
                onClick={() => setDocPickerOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingDocs ? (
                <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin text-teal-400" />
                  <span>Đang tải danh sách tài liệu từ kho lưu trữ...</span>
                </div>
              ) : docsLoadError ? (
                <div className="py-6 text-center text-xs text-rose-400 flex flex-col items-center justify-center gap-2">
                  <p>{docsLoadError}</p>
                  <button
                    onClick={() => {
                      setDocsLoadError(null)
                      setDocPickerOpen(false)
                      setTimeout(() => setDocPickerOpen(true), 50)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Thử lại</span>
                  </button>
                </div>
              ) : pickerDocs.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <FileText className="w-8 h-8 mb-2 text-slate-500 opacity-60" />
                  <p className="font-semibold text-slate-200">Chưa có tài liệu nào trong Thư viện</p>
                  <p className="mt-1 text-slate-400">Bạn vui lòng nhập tài liệu (PDF/DOCX) ở mục Thư viện trước nhé.</p>
                </div>
              ) : (
                pickerDocs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDoc(d)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:bg-teal-950/20 hover:border-teal-500/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-teal-600 text-white font-bold text-xs shrink-0 shadow-sm">
                      {d.title.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-teal-400">
                        {d.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {d.pagesContent?.length || d.slides?.length || 1} trang tài liệu
                      </div>
                    </div>
                    <span className="text-[11px] text-teal-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Chiếu ngay →
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setDocPickerOpen(false)}
                className="h-8 px-4 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
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
