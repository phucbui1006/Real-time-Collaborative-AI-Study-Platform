// server/src/sockets/index.js
// Khởi tạo & Đăng ký tất cả các Socket.io Event Handlers

const roomHandler = require('./roomHandler')
const slideHandler = require('./slideHandler')
const quizHandler = require('./quizHandler')

/**
 * Khởi tạo Socket.io server và lắng nghe các kết nối mới từ client.
 * @param {import('socket.io').Server} io 
 */
function initSockets(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client kết nối: ${socket.id}`)

    // Đăng ký các handlers cho từng nhóm tính năng real-time
    roomHandler(io, socket)
    slideHandler(io, socket)
    quizHandler(io, socket)

    socket.on('disconnect', () => {
      console.log(`❌ Client ngắt kết nối: ${socket.id}`)
    })
  })
}

module.exports = { initSockets }
