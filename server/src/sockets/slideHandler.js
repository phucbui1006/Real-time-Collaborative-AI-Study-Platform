// server/src/sockets/slideHandler.js
// Quản lý sự kiện Lật slide, Laser pointer, Sticky notes real-time (có kiểm tra quyền & validate payload)

const laserThrottleMap = new Map()

function getMember(room, socketId) {
  return room?.members?.get(socketId) || null
}

function isHostOrSpeaker(room, socketId) {
  const member = getMember(room, socketId)
  if (!member) return false
  if (room.hostSocketId === socketId || (room.hostUserId && room.hostUserId === member.userId)) {
    return true
  }
  return member.role === 'host' || member.role === 'speaker'
}

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeRooms
 */
module.exports = function slideHandler(io, socket, activeRooms) {
  // Thay đổi trang slide (chỉ Host/Speaker trong phòng)
  socket.on('CHANGE_SLIDE', ({ roomCode, pageIndex } = {}) => {
    if (!roomCode || typeof roomCode !== 'string') return
    const room = activeRooms.get(roomCode.trim())
    if (!room || !isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng và Diễn giả mới có quyền điều khiển slide.',
        code: 'FORBIDDEN',
      })
    }

    const idx = Number(pageIndex)
    if (!Number.isInteger(idx) || idx < 0 || idx > 2000) return

    io.to(room.code).emit('SLIDE_CHANGED', {
      pageIndex: idx,
      updatedBy: socket.id,
    })
  })

  // Di chuyển con trỏ laser real-time (chỉ thành viên trong phòng, throttle ~30fps, tọa độ hợp lệ)
  socket.on('LASER_MOVE', ({ roomCode, x, y } = {}) => {
    if (!roomCode || typeof roomCode !== 'string') return
    const room = activeRooms.get(roomCode.trim())
    const member = getMember(room, socket.id)
    if (!room || !member) return

    if (!Number.isFinite(x) || !Number.isFinite(y) || x < -10000 || x > 10000 || y < -10000 || y > 10000) {
      return
    }

    const now = Date.now()
    const last = laserThrottleMap.get(socket.id) || 0
    if (now - last < 25) return
    laserThrottleMap.set(socket.id, now)

    socket.to(room.code).emit('LASER_MOVED', {
      socketId: socket.id,
      user: member.userName,
      x,
      y,
    })
  })

  // Thêm/Cập nhật ghi chú Sticky Note trên slide (chỉ Host/Speaker, giới hạn kích thước)
  socket.on('ADD_STICKY_NOTE', ({ roomCode, note } = {}) => {
    if (!roomCode || typeof roomCode !== 'string' || !note || typeof note !== 'object') return
    const room = activeRooms.get(roomCode.trim())
    if (!room || !isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng và Diễn giả mới có quyền thêm ghi chú.',
        code: 'FORBIDDEN',
      })
    }

    try {
      if (Buffer.byteLength(JSON.stringify(note), 'utf8') > 8192) return
    } catch {
      return
    }

    io.to(room.code).emit('STICKY_NOTE_ADDED', {
      ...note,
      authorId: socket.user?.id,
    })
  })

  socket.on('disconnect', () => {
    laserThrottleMap.delete(socket.id)
  })
}
