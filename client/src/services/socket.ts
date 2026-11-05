// client/src/services/socket.ts
// Quản lý Socket.io client singleton, gắn Supabase Access Token tự động và định kiểu sự kiện

import { io, Socket } from 'socket.io-client'
import { supabase } from './supabaseClient'
import type { ClientToServerEvents, ServerToClientEvents } from '../types/classroom'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Socket.io client instance với typing an toàn.
 * autoConnect: false để kết nối có kiểm soát khi có thông tin người dùng.
 */
export const socket: TypedSocket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})

/**
 * Chuẩn bị token và kết nối socket
 */
export async function connectSocket(): Promise<TypedSocket> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      socket.auth = { token }
    }
  } catch (err) {
    console.warn('Không lấy được Supabase session cho socket:', err)
  }

  if (!socket.connected) {
    socket.connect()
  }
  return socket
}

/**
 * Tham gia phòng học (gửi thông tin thành viên)
 */
export async function joinRoom(roomCode: string, user: { id: string; name: string; avatarColor?: string }) {
  await connectSocket()
  socket.emit('ROOM:JOIN', { roomCode, user })
}

/**
 * Rời phòng học
 */
export function leaveRoom(roomCode: string) {
  if (socket.connected) {
    socket.emit('ROOM:LEAVE', { roomCode })
    socket.disconnect()
  }
}

/**
 * Bật/tắt Micro hoặc Camera
 */
export function toggleMedia(roomCode: string, isMicOn?: boolean, isCamOn?: boolean) {
  if (socket.connected) {
    socket.emit('ROOM:MEDIA_TOGGLE', { roomCode, isMicOn, isCamOn })
  }
}

/**
 * Phát tín hiệu đang nói (Voice Activity Detection)
 */
export function sendSpeakingState(roomCode: string, isSpeaking: boolean) {
  if (socket.connected) {
    socket.emit('ROOM:SPEAKING_STATE', { roomCode, isSpeaking })
  }
}

/**
 * Bắt đầu chia sẻ màn hình
 */
export function startScreenShare(roomCode: string) {
  if (socket.connected) {
    socket.emit('ROOM:SCREEN_SHARE_START', { roomCode })
  }
}

/**
 * Dừng chia sẻ màn hình
 */
export function stopScreenShare(roomCode: string) {
  if (socket.connected) {
    socket.emit('ROOM:SCREEN_SHARE_STOP', { roomCode })
  }
}

/**
 * Gửi tin nhắn trò chuyện
 */
export function sendChatMessage(roomCode: string, message: string) {
  if (socket.connected) {
    socket.emit('CHAT:SEND', { roomCode, message })
  }
}

/**
 * Chủ phòng: Chọn tài liệu để trình chiếu
 */
export function selectDocument(roomCode: string, documentId: number) {
  if (socket.connected) {
    socket.emit('DOC:SELECT', { roomCode, documentId })
  }
}

/**
 * Chủ phòng: Chuyển trang tài liệu
 */
export function changeDocumentPage(roomCode: string, pageIndex: number) {
  if (socket.connected) {
    socket.emit('DOC:CHANGE_PAGE', { roomCode, pageIndex })
  }
}

/**
 * Chủ phòng: Chỉnh sửa nội dung văn bản trang
 */
export function editDocumentPage(roomCode: string, pageIndex: number, content: string) {
  if (socket.connected) {
    socket.emit('DOC:EDIT_PAGE', { roomCode, pageIndex, content })
  }
}

/**
 * Chủ phòng: Tắt mic thành viên
 */
export function muteMember(roomCode: string, targetSocketId: string) {
  if (socket.connected) {
    socket.emit('ROOM:MUTE_MEMBER', { roomCode, targetSocketId })
  }
}

/**
 * Chủ phòng: Mời thành viên ra khỏi phòng
 */
export function kickMember(roomCode: string, targetSocketId: string) {
  if (socket.connected) {
    socket.emit('ROOM:KICK_MEMBER', { roomCode, targetSocketId })
  }
}

/**
 * Chủ phòng: Chuyển quyền chủ phòng
 */
export function transferHost(roomCode: string, targetSocketId: string) {
  if (socket.connected) {
    socket.emit('ROOM:TRANSFER_HOST', { roomCode, targetSocketId })
  }
}

/**
 * Chủ phòng: Cấp/Khóa quyền chia sẻ màn hình của thành viên
 */
export function toggleScreenPermission(roomCode: string, allow: boolean) {
  if (socket.connected) {
    socket.emit('ROOM:TOGGLE_SCREEN_PERMISSION', { roomCode, allow })
  }
}

/**
 * Chủ phòng: Đóng phòng học
 */
export function closeRoom(roomCode: string) {
  if (socket.connected) {
    socket.emit('ROOM:CLOSE', { roomCode })
  }
}

// ─── Tương thích ngược với các hàm cũ ─────────────────────────────────────
export function changeSlide(roomCode: string, slideIndex: number) {
  changeDocumentPage(roomCode, slideIndex)
}
export function moveLaser(roomCode: string, x: number, y: number) {
  if (socket.connected) {
    socket.emit('LASER_MOVE' as any, { roomCode, x, y })
  }
}
