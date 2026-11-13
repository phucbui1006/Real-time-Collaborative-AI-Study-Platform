// server/src/sockets/quizHandler.js
// Quản lý thi đấu trắc nghiệm real-time (chỉ Host bắt đầu/kết thúc, member nộp đáp án hợp lệ)

const answerRateMap = new Map()

function isHost(room, socketId) {
  const member = room?.members?.get(socketId)
  if (!member) return false
  return room.hostSocketId === socketId || (room.hostUserId && room.hostUserId === member.userId)
}

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeRooms
 */
module.exports = function quizHandler(io, socket, activeRooms) {
  // Chỉ Host mới được bắt đầu Quiz Battle
  socket.on('START_QUIZ', ({ roomCode, quizData } = {}) => {
    if (!roomCode || typeof roomCode !== 'string') return
    const room = activeRooms.get(roomCode.trim())
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền bắt đầu Quiz Battle.',
        code: 'FORBIDDEN',
      })
    }

    try {
      if (!quizData || Buffer.byteLength(JSON.stringify(quizData), 'utf8') > 512 * 1024) {
        return socket.emit('ERROR', { message: 'Dữ liệu Quiz không hợp lệ hoặc quá lớn.' })
      }
    } catch {
      return
    }

    io.to(room.code).emit('QUIZ_STARTED', {
      quizData,
      startedAt: new Date(),
    })
  })

  // Thành viên trong phòng nộp đáp án
  socket.on('SUBMIT_ANSWER', ({ roomCode, questionId, selectedOption, responseTimeMs } = {}) => {
    if (!roomCode || typeof roomCode !== 'string') return
    const room = activeRooms.get(roomCode.trim())
    const member = room?.members?.get(socket.id)
    if (!room || !member) {
      return socket.emit('ERROR', { message: 'Bạn chưa tham gia phòng học này.' })
    }

    const now = Date.now()
    const last = answerRateMap.get(socket.id) || 0
    if (now - last < 300) return
    answerRateMap.set(socket.id, now)

    const cleanQId = String(questionId ?? '').slice(0, 64)
    const cleanTimeMs = Number.isFinite(responseTimeMs) && responseTimeMs >= 0 ? Math.min(responseTimeMs, 3600000) : 0

    socket.emit('ANSWER_RECEIVED', { questionId: cleanQId, status: 'ok' })

    io.to(room.code).emit('SCORE_UPDATED', {
      userSocketId: socket.id,
      userId: member.userId,
      questionId: cleanQId,
      selectedOption,
      responseTimeMs: cleanTimeMs,
    })
  })

  // Chỉ Host mới được kết thúc Quiz
  socket.on('FINISH_QUIZ', ({ roomCode, leaderboard } = {}) => {
    if (!roomCode || typeof roomCode !== 'string') return
    const room = activeRooms.get(roomCode.trim())
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền kết thúc Quiz Battle.',
        code: 'FORBIDDEN',
      })
    }

    io.to(room.code).emit('QUIZ_FINISHED', {
      leaderboard: Array.isArray(leaderboard) ? leaderboard.slice(0, 100) : [],
      endedAt: new Date(),
    })
  })

  socket.on('disconnect', () => {
    answerRateMap.delete(socket.id)
  })
}
