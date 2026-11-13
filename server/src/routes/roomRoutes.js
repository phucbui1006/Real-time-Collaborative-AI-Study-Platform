// routes/roomRoutes.js — /api/rooms

const express = require('express')
const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = rateLimit
const router = express.Router()
const { requireAuth } = require('../middlewares/authMiddleware')
const {
  createRoom,
  verifyRoom,
  getRooms,
  getActiveCounts,
  getDocumentPage,
  getRoomMessages,
  getLiveKitToken,
} = require('../controllers/roomController')

const verifyRoomLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip || 'unknown'),
  message: { success: false, error: 'Thử mã phòng quá nhiều lần. Vui lòng đợi 5 phút.' },
})

router.use(requireAuth)

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
router.post('/verify', verifyRoomLimiter, verifyRoom)

// GET  /api/rooms/verify/:code                    — Kiểm tra mã phòng có tồn tại không
router.get('/verify/:code', verifyRoomLimiter, verifyRoom)

module.exports = router
