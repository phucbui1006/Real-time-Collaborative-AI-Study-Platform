// server/src/sockets/webrtcHandler.js
// Quản lý truyền tải tín hiệu Signaling cho WebRTC Mesh P2P giữa các thành viên trong phòng

/**
 * Đăng ký các sự kiện WebRTC Signaling
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeRooms
 */
module.exports = function webrtcHandler(io, socket, activeRooms) {
  // 1. Chuyển tiếp SDP Offer tới target peer cụ thể
  socket.on('WEBRTC:OFFER', ({ roomCode, targetSocketId, offer }) => {
    if (!roomCode || !targetSocketId || !offer) return
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id) || !room.members.has(targetSocketId)) {
      return
    }

    io.to(targetSocketId).emit('WEBRTC:OFFER', {
      fromSocketId: socket.id,
      offer
    })
  })

  // 2. Chuyển tiếp SDP Answer về lại peer khởi tạo
  socket.on('WEBRTC:ANSWER', ({ roomCode, targetSocketId, answer }) => {
    if (!roomCode || !targetSocketId || !answer) return
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id) || !room.members.has(targetSocketId)) {
      return
    }

    io.to(targetSocketId).emit('WEBRTC:ANSWER', {
      fromSocketId: socket.id,
      answer
    })
  })

  // 3. Chuyển tiếp ICE Candidate
  socket.on('WEBRTC:ICE', ({ roomCode, targetSocketId, candidate }) => {
    if (!roomCode || !targetSocketId || !candidate) return
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id) || !room.members.has(targetSocketId)) {
      return
    }

    io.to(targetSocketId).emit('WEBRTC:ICE', {
      fromSocketId: socket.id,
      candidate
    })
  })
}
