// server/src/sockets/chatHandler.js
// Quản lý tin nhắn phòng học real-time, chống spam rate-limit (1 tin/giây) và lưu Supabase

const { supabaseAdmin } = require('../config/supabase')

// Theo dõi thời điểm gửi tin nhắn gần nhất của mỗi socket để chống spam (tối đa 1 tin / giây)
// Map<socketId, lastTimestamp>
const messageRateMap = new Map()

/**
 * Xử lý sự kiện trò chuyện trong phòng
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeRooms
 */
function chatHandler(io, socket, activeRooms) {
  socket.on('CHAT:SEND', async ({ roomCode, message }) => {
    try {
      if (!roomCode || typeof message !== 'string') return
      const text = message.trim()
      if (!text || text.length > 2000) return

      const room = activeRooms.get(roomCode)
      if (!room || !room.members.has(socket.id)) {
        return socket.emit('ERROR', { message: 'Bạn chưa tham gia phòng học này.' })
      }

      // Kiểm tra rate limit chống spam: tối đa 1 tin / giây / người
      const now = Date.now()
      const lastSent = messageRateMap.get(socket.id) || 0
      if (now - lastSent < 1000) {
        return socket.emit('ERROR', {
          message: 'Bạn đang gửi tin nhắn quá nhanh (tối đa 1 tin/giây). Vui lòng đợi giây lát.',
          code: 'CHAT_RATE_LIMIT',
        })
      }
      messageRateMap.set(socket.id, now)

      const sender = room.members.get(socket.id)
      const chatMessage = {
        id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
        senderId: sender.userId,
        senderName: sender.userName,
        text,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }

      // Phát cho toàn bộ thành viên trong phòng (bao gồm cả người gửi)
      io.to(roomCode).emit('CHAT:MESSAGE', chatMessage)

      // Lưu bất đồng bộ vào cơ sở dữ liệu Supabase
      if (room.dbRoomId) {
        try {
          await supabaseAdmin.from('room_messages').insert({
            room_id: room.dbRoomId,
            sender_id: sender.userId || null,
            sender_name: sender.userName,
            message: text,
          })
        } catch (dbErr) {
          console.warn('Lỗi lưu tin nhắn Supabase:', dbErr.message)
        }
      }
    } catch (err) {
      console.error('Lỗi CHAT:SEND:', err)
    }
  })

  socket.on('disconnect', () => {
    messageRateMap.delete(socket.id)
  })
}

/**
 * Tải lịch sử tin nhắn gần nhất khi thành viên vào phòng
 * @param {number} dbRoomId
 */
async function loadRecentMessages(dbRoomId) {
  if (!dbRoomId) return []
  try {
    const { data, error } = await supabaseAdmin
      .from('room_messages')
      .select('id, sender_id, sender_name, message, created_at')
      .eq('room_id', dbRoomId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error || !data) return []

    return data.map((m) => {
      let time = ''
      try {
        time = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      } catch {
        time = 'Gần đây'
      }
      return {
        id: String(m.id),
        senderId: m.sender_id,
        senderName: m.sender_name,
        text: m.message,
        time,
      }
    })
  } catch (err) {
    console.warn('Lỗi tải lịch sử chat:', err.message)
    return []
  }
}

module.exports = { chatHandler, loadRecentMessages }
