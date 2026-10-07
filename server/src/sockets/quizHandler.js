// server/src/sockets/quizHandler.js
// Quản lý thi đấu trắc nghiệm real-time (Gamified Quiz Battle)

/**
 * Đăng ký các sự kiện liên quan đến Quiz Battle
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
module.exports = function quizHandler(io, socket) {
  // Host bắt đầu Quiz Battle
  socket.on('START_QUIZ', ({ roomCode, quizData }) => {
    io.to(roomCode).emit('QUIZ_STARTED', {
      quizData,
      startedAt: new Date()
    })
  })

  // Người chơi nộp đáp án
  socket.on('SUBMIT_ANSWER', ({ roomCode, questionId, selectedOption, responseTimeMs }) => {
    // Phản hồi nhận đáp án
    socket.emit('ANSWER_RECEIVED', { questionId, status: 'ok' })

    // Phát sự kiện cập nhật bảng xếp hạng cho cả phòng
    io.to(roomCode).emit('SCORE_UPDATED', {
      userSocketId: socket.id,
      questionId,
      selectedOption,
      responseTimeMs
    })
  })

  // Bảng xếp hạng kết thúc Quiz
  socket.on('FINISH_QUIZ', ({ roomCode, leaderboard }) => {
    io.to(roomCode).emit('QUIZ_FINISHED', {
      leaderboard,
      endedAt: new Date()
    })
  })
}
