// server/src/sockets/roomHandler.js
// Quản lý sự kiện Tham gia / Rời phòng học real-time

/**
 * Đăng ký các sự kiện liên quan đến phòng học
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
module.exports = function roomHandler(io, socket) {
  // Tham gia phòng học bằng mã phòng
  socket.on('JOIN_ROOM', ({ roomCode, user }) => {
    socket.join(roomCode)
    console.log(`👤 User ${user?.name || socket.id} đã tham gia phòng: ${roomCode}`)

    // Thông báo cho tất cả thành viên trong phòng trừ người mới gia nhập
    socket.to(roomCode).emit('USER_JOINED', {
      socketId: socket.id,
      user,
      joinedAt: new Date()
    })
  })

  // Rời phòng học
  socket.on('LEAVE_ROOM', ({ roomCode, userId }) => {
    socket.leave(roomCode)
    console.log(`🚪 User ${userId || socket.id} đã rời phòng: ${roomCode}`)

    io.to(roomCode).emit('USER_LEFT', {
      socketId: socket.id,
      userId
    })
  })
}
