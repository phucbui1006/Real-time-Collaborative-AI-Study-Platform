// controllers/roomController.js — Tạo & Kiểm tra phòng học

const { supabaseAdmin } = require('../config/supabase')

/** Tạo mã phòng 6 số chưa tồn tại trong DB */
async function createUniqueCode() {
  let code
  let exists = true
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString()
    const { data } = await supabaseAdmin.from('rooms').select('code').eq('code', code).single()
    exists = !!data
  }
  return code
}

/** POST /api/rooms/create — Tạo phòng học mới */
async function createRoom(req, res, next) {
  try {
    const { name, password } = req.body
    if (!name) return res.status(400).json({ error: 'Thiếu tên phòng.' })

    const code = await createUniqueCode()

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        name,
        code,
        password_hash: password ? String(password) : null,
      })
      .select()
      .single()

    if (error) throw error

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

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Mã phòng không tồn tại trên hệ thống.' })
    }

    // Nếu phòng có đặt mật khẩu, kiểm tra mật khẩu
    if (data.password_hash) {
      if (!password || String(password).trim() !== String(data.password_hash).trim()) {
        return res.status(401).json({ success: false, error: 'Mật khẩu phòng không chính xác.' })
      }
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
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ success: true, rooms: data })
  } catch (err) {
    next(err)
  }
}

module.exports = { createRoom, verifyRoom, getRooms }
