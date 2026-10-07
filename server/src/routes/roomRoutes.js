// routes/roomRoutes.js — /api/rooms

const express = require('express')
const router = express.Router()
const { createRoom, verifyRoom } = require('../controllers/roomController')

// POST /api/rooms/create        — Tạo phòng học mới, trả về mã 6 số
router.post('/create', createRoom)

// GET  /api/rooms/verify/:code  — Kiểm tra mã phòng có tồn tại không
router.get('/verify/:code', verifyRoom)

module.exports = router
