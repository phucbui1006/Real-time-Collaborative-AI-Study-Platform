// controllers/roomController.js — Tạo & Kiểm tra phòng học

const { supabaseAdmin } = require('../config/supabase')
const { getActiveRooms } = require('../sockets/roomHandler')

/** Tạo mã phòng 6 số chưa tồn tại trong DB */
async function createUniqueCode() {
  let code
  let exists = true
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString()
    const { data } = await supabaseAdmin.from('rooms').select('code').eq('code', code).maybeSingle()
    exists = !!data
  }
  return code
}

/** POST /api/rooms/create — Tạo phòng học mới */
async function createRoom(req, res, next) {
  try {
    const { name, password, hostUserId, maxMembers } = req.body
    if (!name) return res.status(400).json({ error: 'Thiếu tên phòng.' })

    const code = await createUniqueCode()
    const payload = {
      name: name.trim(),
      code,
      password_hash: password ? String(password).trim() : null,
      is_active: true,
      max_members: Number(maxMembers) || 6,
    }
    if (hostUserId) {
      payload.host_user_id = hostUserId
    }

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert(payload)
      .select()
      .single()

    if (error) {
      // Fallback nếu schema cũ chưa có một số cột
      console.warn('Lỗi ghi database rooms, thử fallback cơ bản:', error.message)
      const fallbackPayload = {
        name: name.trim(),
        code,
        password_hash: password ? String(password).trim() : null,
        is_active: true,
      }
      const { data: d2, error: e2 } = await supabaseAdmin
        .from('rooms')
        .insert(fallbackPayload)
        .select()
        .single()
      if (e2) throw e2
      return res.status(201).json({ success: true, room: d2 })
    }

    res.status(201).json({ success: true, room: data })
  } catch (err) {
    next(err)
  }
}

/** POST /api/rooms/verify hoặc GET /api/rooms/verify/:code — Kiểm tra mã phòng & mật khẩu */
async function verifyRoom(req, res, next) {
  try {
    const code = req.params.code || req.body.code || req.query.code
    const password = req.body.password || req.query.password

    if (!code) return res.status(400).json({ success: false, error: 'Thiếu mã phòng.' })

    const cleanCode = String(code).trim()
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Mã phòng không tồn tại hoặc phòng đã đóng.' })
    }

    // Nếu phòng có đặt mật khẩu, kiểm tra mật khẩu
    if (data.password_hash) {
      if (!password || String(password).trim() !== String(data.password_hash).trim()) {
        return res.status(401).json({ success: false, error: 'Mật khẩu phòng không chính xác.' })
      }
    }

    // Kiểm tra xem phòng có đang đầy người trong RAM không
    const activeRooms = getActiveRooms()
    const memoryRoom = activeRooms.get(cleanCode)
    const max = data.max_members || 6
    if (memoryRoom && memoryRoom.members.size >= max) {
      return res.status(403).json({ success: false, error: `Phòng đã đủ sĩ số tối đa (${max} người).` })
    }

    res.json({ success: true, room: data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms — Lấy danh sách phòng học */
async function getRooms(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ success: true, rooms: data })
  } catch (err) {
    next(err)
  }
}

module.exports = { createRoom, verifyRoom, getRooms }
