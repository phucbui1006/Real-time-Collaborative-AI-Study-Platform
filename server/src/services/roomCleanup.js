// server/src/services/roomCleanup.js
// Job dọn dẹp định kỳ: xóa phòng không hoạt động quá lâu để tiết kiệm dung lượng DB

const { supabaseAdmin } = require('../config/supabase')
const { getActiveRooms } = require('../sockets/roomHandler')

const INACTIVE_DAYS = Number(process.env.ROOM_CLEANUP_DAYS || 7)
const INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 giờ/lần

async function cleanupInactiveRooms() {
  try {
    const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data: staleRooms, error } = await supabaseAdmin
      .from('rooms')
      .select('id, code')
      .eq('is_active', false)
      .lt('created_at', cutoff)
      .limit(200)

    if (error) {
      console.warn('[Cleanup] Không truy vấn được phòng cũ:', error.message)
      return
    }
    if (!staleRooms || staleRooms.length === 0) return

    // Bỏ qua phòng vẫn còn trong RAM (đề phòng)
    const active = getActiveRooms()
    const ids = staleRooms.filter((r) => !active.has(String(r.code))).map((r) => r.id)
    if (ids.length === 0) return

    // Cascade xóa room_members, room_documents, room_messages
    const { error: delErr } = await supabaseAdmin.from('rooms').delete().in('id', ids)
    if (delErr) {
      console.warn('[Cleanup] Lỗi xóa phòng cũ:', delErr.message)
      return
    }
    console.log(`🧹 [Cleanup] Đã xóa ${ids.length} phòng không hoạt động quá ${INACTIVE_DAYS} ngày`)
  } catch (err) {
    console.warn('[Cleanup] Lỗi job dọn dẹp:', err?.message || err)
  }
}

function startRoomCleanupJob() {
  // Chạy lần đầu sau 1 phút kể từ lúc khởi động, rồi lặp định kỳ
  setTimeout(cleanupInactiveRooms, 60 * 1000)
  const timer = setInterval(cleanupInactiveRooms, INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
}

module.exports = { startRoomCleanupJob, cleanupInactiveRooms }
