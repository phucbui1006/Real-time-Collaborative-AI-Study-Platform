// server/src/routes/authRoutes.js
// Routes xác thực với Rate Limit chặt chẽ theo cả IP và theo tên đăng nhập (identifier)

const express = require('express')
const rateLimit = require('express-rate-limit')
const {
  checkUsername,
  loginWithIdentifier,
  forgotPassword,
} = require('../controllers/authController')

const router = express.Router()

// 1. Rate limit theo IP cho endpoint đăng nhập (tối đa 10 lần / 15 phút / IP)
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.',
  },
})

// 2. Rate limit theo tên đăng nhập / email (tối đa 6 lần / 10 phút / mỗi tài khoản)
const loginIdentifierLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const id = String(req.body?.identifier || '').trim().toLowerCase().slice(0, 100)
    return id ? `login_id:${id}` : `login_ip:${req.ip}`
  },
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    error: 'Tài khoản này đang có quá nhiều lần thử đăng nhập. Vui lòng thử lại sau ít phút.',
  },
})

// 3. Rate limit cho endpoint quên mật khẩu (tối đa 5 lần / 15 phút / IP + tài khoản)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const id = String(req.body?.identifier || '').trim().toLowerCase().slice(0, 100)
    return `${req.ip}:${id}`
  },
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    error: 'Bạn đã gửi quá nhiều yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau 15 phút.',
  },
})

// 4. Rate limit cho kiểm tra trùng username khi gõ (debounce ~400ms -> cho phép 45 req / phút / IP)
const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    available: false,
    reason: 'rate_limit',
    message: 'Thao tác quá nhanh, vui lòng chờ giây lát.',
  },
})

router.get('/check-username', checkUsernameLimiter, checkUsername)
router.post('/check-username', checkUsernameLimiter, checkUsername)
router.post('/login', loginIpLimiter, loginIdentifierLimiter, loginWithIdentifier)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword)

module.exports = router
