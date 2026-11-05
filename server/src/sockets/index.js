// server/src/sockets/index.js
// Khởi tạo & Đăng ký tất cả các Socket.io Event Handlers kèm Middleware xác thực Supabase Token

const { supabaseAdmin } = require('../config/supabase')
const { roomHandler, getActiveRooms } = require('./roomHandler')
const webrtcHandler = require('./webrtcHandler')
const { chatHandler } = require('./chatHandler')
const slideHandler = require('./slideHandler')
const quizHandler = require('./quizHandler')

/**
 * Khởi tạo Socket.io server và lắng nghe các kết nối mới từ client.
 * @param {import('socket.io').Server} io 
 */
function initSockets(io) {
  // Middleware xác thực Supabase Access Token khi client gửi handshake auth
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (token) {
        const { data, error } = await supabaseAdmin.auth.getUser(token)
        if (!error && data?.user) {
          socket.user = data.user
        }
      }
      return next()
    } catch (err) {
      console.warn('Lỗi xác thực socket token:', err.message)
      return next()
    }
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Client kết nối: ${socket.id} (User: ${socket.user?.id || 'Guest/Unauth'})`)
    const activeRooms = getActiveRooms()

    // Đăng ký các handlers cho từng nhóm tính năng real-time
    roomHandler(io, socket)
    webrtcHandler(io, socket, activeRooms)
    chatHandler(io, socket, activeRooms)
    slideHandler(io, socket)
    quizHandler(io, socket)

    socket.on('disconnect', () => {
      console.log(`❌ Client ngắt kết nối: ${socket.id}`)
    })
  })
}

module.exports = { initSockets }
