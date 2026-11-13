// server/src/sockets/webrtcHandler.js
// Quản lý truyền tải tín hiệu Signaling cho WebRTC Mesh P2P (kiểm tra thành viên, kích thước payload & rate limit)

const MAX_SIGNAL_PAYLOAD_BYTES = 64 * 1024 // 64KB cho SDP/ICE
const SIGNAL_WINDOW_MS = 1000
const MAX_SIGNALS_PER_WINDOW = 60

const signalCounterMap = new Map()

function checkSignalRateAndSize(socketId, payloadObj) {
  try {
    const serialized = JSON.stringify(payloadObj)
    if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_SIGNAL_PAYLOAD_BYTES) {
      return false
    }
  } catch {
    return false
  }

  const now = Date.now()
  const state = signalCounterMap.get(socketId) || { windowStart: now, count: 0 }
  if (now - state.windowStart >= SIGNAL_WINDOW_MS) {
    state.windowStart = now
    state.count = 0
  }
  state.count += 1
  signalCounterMap.set(socketId, state)
  return state.count <= MAX_SIGNALS_PER_WINDOW
}

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeRooms
 */
module.exports = function webrtcHandler(io, socket, activeRooms) {
  // 1. Chuyển tiếp SDP Offer tới target peer cùng phòng
  socket.on('WEBRTC:OFFER', ({ roomCode, targetSocketId, offer } = {}) => {
    if (!roomCode || !targetSocketId || !offer || targetSocketId === socket.id) return
    const room = activeRooms.get(String(roomCode).trim())
    if (!room || !room.members.has(socket.id) || !room.members.has(targetSocketId)) return
    if (!checkSignalRateAndSize(socket.id, offer)) return

    io.to(targetSocketId).emit('WEBRTC:OFFER', {
      fromSocketId: socket.id,
      offer,
    })
  })

  // 2. Chuyển tiếp SDP Answer về lại peer khởi tạo
  socket.on('WEBRTC:ANSWER', ({ roomCode, targetSocketId, answer } = {}) => {
    if (!roomCode || !targetSocketId || !answer || targetSocketId === socket.id) return
    const room = activeRooms.get(String(roomCode).trim())
    if (!room || !room.members.has(socket.id) || !room.members.has(targetSocketId)) return
    if (!checkSignalRateAndSize(socket.id, answer)) return

    io.to(targetSocketId).emit('WEBRTC:ANSWER', {
      fromSocketId: socket.id,
      answer,
    })
  })

  // 3. Chuyển tiếp ICE Candidate
  socket.on('WEBRTC:ICE', ({ roomCode, targetSocketId, candidate } = {}) => {
    if (!roomCode || !targetSocketId || !candidate || targetSocketId === socket.id) return
    const room = activeRooms.get(String(roomCode).trim())
    if (!room || !room.members.has(socket.id) || !room.members.has(targetSocketId)) return
    if (!checkSignalRateAndSize(socket.id, candidate)) return

    io.to(targetSocketId).emit('WEBRTC:ICE', {
      fromSocketId: socket.id,
      candidate,
    })
  })

  socket.on('disconnect', () => {
    signalCounterMap.delete(socket.id)
  })
}
