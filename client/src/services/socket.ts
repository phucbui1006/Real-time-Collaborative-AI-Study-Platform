import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/**
 * Socket.io client singleton.
 * autoConnect: false — kết nối thủ công khi người dùng tham gia phòng.
 */
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
})

// ─── Các sự kiện Socket chuẩn của PeerMind ───────────────────────────────────

/** Tham gia phòng học */
export function joinRoom(roomCode: string, userName: string) {
  socket.connect()
  socket.emit('JOIN_ROOM', { roomCode, userName })
}

/** Rời phòng học */
export function leaveRoom(roomCode: string) {
  socket.emit('LEAVE_ROOM', { roomCode })
  socket.disconnect()
}

/** Chủ phòng: chuyển slide */
export function changeSlide(roomCode: string, slideIndex: number) {
  socket.emit('SLIDE_CHANGE', { roomCode, slideIndex })
}

/** Chủ phòng: di chuyển con trỏ laser */
export function moveLaser(roomCode: string, x: number, y: number) {
  socket.emit('LASER_MOVE', { roomCode, x, y })
}
