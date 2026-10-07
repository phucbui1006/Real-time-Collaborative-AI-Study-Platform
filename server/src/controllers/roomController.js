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
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Thiếu tên phòng.' })

    const code = await createUniqueCode()

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert({ name, code })
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ success: true, room: data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms/verify/:code — Kiểm tra mã phòng */
async function verifyRoom(req, res, next) {
  try {
    const { code } = req.params
    const { data } = await supabaseAdmin.from('rooms').select('*').eq('code', code).single()

    if (!data) return res.status(404).json({ success: false, error: 'Mã phòng không tồn tại.' })

    res.json({ success: true, room: data })
  } catch (err) {
    next(err)
  }
}

module.exports = { createRoom, verifyRoom }
