// server/src/sockets/slideHandler.js
// Quản lý sự kiện Lật slide, Laser pointer, Sticky notes real-time

/**
 * Đăng ký các sự kiện liên quan đến trình chiếu Slide
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
module.exports = function slideHandler(io, socket) {
  // Thay đổi trang slide (Host điều khiển)
  socket.on('CHANGE_SLIDE', ({ roomCode, pageIndex }) => {
    io.to(roomCode).emit('SLIDE_CHANGED', {
      pageIndex,
      updatedBy: socket.id
    })
  })

  // Di chuyển con trỏ laser real-time
  socket.on('LASER_MOVE', ({ roomCode, x, y, user }) => {
    socket.to(roomCode).emit('LASER_MOVED', {
      socketId: socket.id,
      user,
      x,
      y
    })
  })

  // Thêm/Cập nhật ghi chú Sticky Note trên slide
  socket.on('ADD_STICKY_NOTE', ({ roomCode, note }) => {
    io.to(roomCode).emit('STICKY_NOTE_ADDED', note)
  })
}
