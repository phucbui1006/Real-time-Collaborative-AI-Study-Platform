// middlewares/authMiddleware.js — Xác thực JWT Supabase & băm mật khẩu phòng an toàn
const crypto = require('crypto')
const { supabaseAdmin } = require('../config/supabase')

/**
 * Băm mật khẩu phòng bằng scrypt + salt ngẫu nhiên 16 byte
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt:${salt}:${derived}`
}

/**
 * Kiểm tra mật khẩu theo thời gian hằng số (timing-safe)
 * Hỗ trợ cả định dạng scrypt mới và giá trị cũ chưa băm trong DB
 * @param {string} inputPassword
 * @param {string} storedHash
 * @returns {boolean}
 */
function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return true
  if (typeof inputPassword !== 'string' || !inputPassword) return false

  const input = String(inputPassword).trim()
  const stored = String(storedHash).trim()

  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':')
    if (parts.length !== 3) return false
    const [, salt, hashHex] = parts
    try {
      const expectedBuf = Buffer.from(hashHex, 'hex')
      const actualBuf = crypto.scryptSync(input, salt, expectedBuf.length)
      if (actualBuf.length !== expectedBuf.length) return false
      return crypto.timingSafeEqual(actualBuf, expectedBuf)
    } catch {
      return false
    }
  }

  if (stored.startsWith('sha256:')) {
    const parts = stored.split(':')
    if (parts.length !== 3) return false
    const [, salt, hashHex] = parts
    try {
      const expectedBuf = Buffer.from(hashHex, 'hex')
      const actualHex = crypto.createHash('sha256').update(`${salt}:${input}`).digest('hex')
      const actualBuf = Buffer.from(actualHex, 'hex')
      if (actualBuf.length !== expectedBuf.length) return false
      return crypto.timingSafeEqual(actualBuf, expectedBuf)
    } catch {
      return false
    }
  }

  // Tương thích phòng cũ trước migration (so sánh HMAC digest thời gian hằng số)
  const hmacKey = crypto.randomBytes(32)
  const a = crypto.createHmac('sha256', hmacKey).update(input).digest()
  const b = crypto.createHmac('sha256', hmacKey).update(stored).digest()
  return crypto.timingSafeEqual(a, b)
}

/**
 * Loại bỏ các trường nhạy cảm (password_hash) trước khi trả về client
 * @param {Record<string, any> | null} room
 */
function sanitizeRoom(room) {
  if (!room) return null
  const { password_hash, ...safeFields } = room
  return {
    ...safeFields,
    has_password: Boolean(password_hash),
  }
}

/**
 * Middleware bắt buộc xác thực Supabase JWT Bearer token
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Yêu cầu đăng nhập (thiếu Access Token).',
      })
    }

    const token = match[1].trim()
    if (!token || token.length > 4096) {
      return res.status(401).json({
        success: false,
        error: 'Access Token không hợp lệ.',
      })
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
      })
    }

    req.user = data.user
    next()
  } catch (err) {
    console.error('[AuthMiddleware] Lỗi xác thực JWT:', err?.message || err)
    return res.status(401).json({
      success: false,
      error: 'Không thể xác thực phiên đăng nhập.',
    })
  }
}

module.exports = {
  requireAuth,
  hashPassword,
  verifyPassword,
  sanitizeRoom,
}
