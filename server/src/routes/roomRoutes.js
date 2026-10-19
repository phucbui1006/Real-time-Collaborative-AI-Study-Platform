// routes/roomRoutes.js — /api/rooms

const express = require('express')
const router = express.Router()
const { createRoom, verifyRoom, getRooms } = require('../controllers/roomController')

// GET  /api/rooms               — Danh sách các phòng học
router.get('/', getRooms)

// POST /api/rooms/create        — Tạo phòng học mới, trả về mã 6 số
router.post('/create', createRoom)

// POST /api/rooms/verify        — Xác thực mã phòng & mật khẩu
router.post('/verify', verifyRoom)

// GET  /api/rooms/verify/:code  — Kiểm tra mã phòng có tồn tại không
router.get('/verify/:code', verifyRoom)

module.exports = router
