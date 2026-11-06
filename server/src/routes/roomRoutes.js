// routes/roomRoutes.js — /api/rooms

const express = require('express')
const router = express.Router()
const {
  createRoom,
  verifyRoom,
  getRooms,
  getActiveCounts,
  getDocumentPage,
  getRoomMessages,
  getLiveKitToken,
} = require('../controllers/roomController')

// GET  /api/rooms                                 — Danh sách các phòng học
router.get('/', getRooms)

// GET  /api/rooms/active-counts                   — Số lượng người đang online thực tế trong các phòng
router.get('/active-counts', getActiveCounts)

// GET  /api/rooms/:code/document/page/:pageIndex  — Lazy-load nội dung 1 trang tài liệu
router.get('/:code/document/page/:pageIndex', getDocumentPage)

// GET  /api/rooms/:code/messages                  — Lịch sử tin nhắn trò chuyện phân trang
router.get('/:code/messages', getRoomMessages)

// POST /api/rooms/:code/livekit-token             — Cấp token LiveKit cho thành viên phòng
router.post('/:code/livekit-token', getLiveKitToken)

// POST /api/rooms/create                          — Tạo phòng học mới, trả về mã 6 số
router.post('/create', createRoom)

// POST /api/rooms/verify                          — Xác thực mã phòng & mật khẩu
router.post('/verify', verifyRoom)

// GET  /api/rooms/verify/:code                    — Kiểm tra mã phòng có tồn tại không
router.get('/verify/:code', verifyRoom)

module.exports = router
