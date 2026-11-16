// server/src/sockets/index.js
// Khởi tạo & Đăng ký tất cả Socket.io Event Handlers với xác thực Supabase JWT bắt buộc (Fail-closed)

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
  // Middleware xác thực Supabase Access Token bắt buộc (từ chối nếu thiếu hoặc không hợp lệ)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token || typeof token !== 'string' || token.length > 4096) {
        return next(new Error('UNAUTHORIZED: Thiếu Access Token hợp lệ.'))
      }

      const { data, error } = await supabaseAdmin.auth.getUser(token.trim())
      if (error || !data?.user) {
        return next(new Error('UNAUTHORIZED: Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'))
      }

      // Truy vấn username & display_name từ bảng profiles ở server để không tin dữ liệu client gửi lên
      let profile = null
      try {
        const { data: profData } = await supabaseAdmin
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profData) {
          profile = profData
        }
      } catch {}

      socket.user = {
        ...data.user,
        username: profile?.username || data.user.user_metadata?.username || null,
        displayName:
          profile?.display_name ||
          profile?.username ||
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'Thành viên',
        avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || null,
      }
      return next()
    } catch (err) {
      console.warn('Lỗi xác thực socket token:', err.message)
      return next(new Error('UNAUTHORIZED: Không thể xác thực kết nối.'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Client kết nối: ${socket.id} (User: ${socket.user.id})`)
    const activeRooms = getActiveRooms()

    // Đăng ký các handlers cho từng nhóm tính năng real-time (đều kiểm tra membership/role qua activeRooms)
    roomHandler(io, socket)
    webrtcHandler(io, socket, activeRooms)
    chatHandler(io, socket, activeRooms)
    slideHandler(io, socket, activeRooms)
    quizHandler(io, socket, activeRooms)

    socket.on('disconnect', () => {
      console.log(`❌ Client ngắt kết nối: ${socket.id}`)
    })
  })
}

module.exports = { initSockets }
