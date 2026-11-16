// server/src/controllers/authController.js
// Xử lý xác thực phía Server với SUPABASE_SERVICE_ROLE_KEY:
// 1. Kiểm tra trùng username (không lộ email)
// 2. Đăng nhập bằng username hoặc email (tra email ở server rồi xác thực, luôn báo lỗi chung)
// 3. Quên mật khẩu qua email hoặc username (hỗ trợ phát hiện tài khoản Google-only, luôn trả thông báo chuẩn)

const { createClient } = require('@supabase/supabase-js')
const { supabaseAdmin } = require('../config/supabase')
const { SUPABASE_URL } = require('../config/env')

const GENERIC_LOGIN_ERROR = 'Tên đăng nhập hoặc mật khẩu không đúng'
const GENERIC_FORGOT_MESSAGE = 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu'

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help',
  'peermind', 'permind', 'moderator', 'mod', 'staff', 'official',
  'api', 'auth', 'login', 'register', 'logout', 'settings',
  'profile', 'user', 'users', 'guest', 'anonymous', 'null', 'undefined',
  'supabase', 'google', 'security', 'bot', 'ai', 'teacher', 'host',
])

const COMMON_PASSWORDS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890',
  'password', 'password123', '111111', '000000', '666666', '888888',
  'qwerty', 'qwerty123', 'abc123', '123123', '123321', '654321',
  'iloveyou', 'admin123', 'letmein', 'welcome', 'monkey', 'dragon',
  'peermind', 'permind', 'matkhau', 'sinhviendaihoc',
])

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateUsernameFormat(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, reason: 'invalid_type', message: 'Tên người dùng không hợp lệ.' }
  }
  const clean = raw.trim().toLowerCase()
  if (clean.length < 3 || clean.length > 20) {
    return { valid: false, reason: 'invalid_length', message: 'Tên người dùng phải từ 3 đến 20 ký tự.' }
  }
  if (!USERNAME_REGEX.test(clean)) {
    return {
      valid: false,
      reason: 'invalid_chars',
      message: 'Tên người dùng chỉ được chứa chữ thường (a-z), số (0-9) và dấu gạch dưới (_).',
    }
  }
  if (RESERVED_USERNAMES.has(clean)) {
    return {
      valid: false,
      reason: 'reserved',
      message: 'Tên người dùng này nằm trong danh sách không được phép sử dụng.',
    }
  }
  return { valid: true, clean }
}

/**
 * Tra cứu user từ identifier (username hoặc email) ở phía server bằng service_role.
 * Ưu tiên gọi RPC resolve_user_auth_info; nếu DB chưa chạy migration RPC thì fallback sang profiles + admin.listUsers.
 */
async function resolveUserByIdentifier(identifier) {
  const clean = String(identifier || '').trim().toLowerCase()
  if (!clean || clean.length > 160) return null

  // 1. Thử gọi RPC resolve_user_auth_info (nhanh, O(1) qua index)
  try {
    const { data, error } = await supabaseAdmin.rpc('resolve_user_auth_info', {
      p_identifier: clean,
    })
    if (!error && Array.isArray(data) && data.length > 0) {
      const row = data[0]
      return {
        userId: row.user_id,
        email: row.email,
        username: row.username,
        hasPassword: Boolean(row.has_password),
        providers: Array.isArray(row.providers) ? row.providers : [],
      }
    }
  } catch {
    // Fallback bên dưới nếu RPC chưa được tạo
  }

  // 2. Fallback: Nếu là email
  if (clean.includes('@')) {
    if (!EMAIL_REGEX.test(clean)) return null
    try {
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      if (!listErr && listData?.users) {
        const found = listData.users.find((u) => (u.email || '').toLowerCase() === clean)
        if (found) {
          const providers = Array.isArray(found.identities)
            ? found.identities.map((id) => id.provider).filter(Boolean)
            : found.app_metadata?.providers || []
          const hasEmailIdentity = providers.includes('email')
          return {
            userId: found.id,
            email: found.email,
            username: found.user_metadata?.username || null,
            hasPassword: hasEmailIdentity,
            providers,
          }
        }
      }
    } catch {}
    return null
  }

  // 3. Fallback: Nếu là username -> tìm id trong bảng profiles (không phân biệt hoa/thường), rồi gọi getUserById
  try {
    const { data: profileRow, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .ilike('username', clean)
      .maybeSingle()

    if (!profErr && profileRow?.id) {
      const { data: userRes, error: uErr } = await supabaseAdmin.auth.admin.getUserById(profileRow.id)
      if (!uErr && userRes?.user) {
        const u = userRes.user
        const providers = Array.isArray(u.identities)
          ? u.identities.map((id) => id.provider).filter(Boolean)
          : u.app_metadata?.providers || []
        return {
          userId: u.id,
          email: u.email,
          username: profileRow.username,
          hasPassword: providers.includes('email'),
          providers,
        }
      }
    }

    // Kiểm tra thêm trong user_metadata nếu trigger chưa kịp đồng bộ
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listData?.users) {
      const matched = listData.users.find(
        (u) => (u.user_metadata?.username || '').toLowerCase() === clean
      )
      if (matched) {
        const providers = Array.isArray(matched.identities)
          ? matched.identities.map((id) => id.provider).filter(Boolean)
          : matched.app_metadata?.providers || []
        return {
          userId: matched.id,
          email: matched.email,
          username: matched.user_metadata?.username || clean,
          hasPassword: providers.includes('email'),
          providers,
        }
      }
    }
  } catch {}

  return null
}

/**
 * GET / POST /api/auth/check-username
 * Kiểm tra tên người dùng đã tồn tại chưa (không lộ email hay bất kỳ thông tin nhạy cảm nào)
 */
async function checkUsername(req, res) {
  try {
    const rawUsername = req.query?.username ?? req.body?.username ?? ''
    const excludeUserId = req.query?.excludeUserId ?? req.body?.excludeUserId ?? null

    const check = validateUsernameFormat(String(rawUsername))
    if (!check.valid) {
      return res.status(200).json({
        available: false,
        reason: check.reason,
        message: check.message,
      })
    }

    const clean = check.clean

    // Kiểm tra trong bảng profiles (không phân biệt hoa/thường)
    let query = supabaseAdmin.from('profiles').select('id').ilike('username', clean).limit(1)
    if (excludeUserId && typeof excludeUserId === 'string' && /^[0-9a-f-]{36}$/i.test(excludeUserId)) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query
    if (!error && Array.isArray(data) && data.length > 0) {
      return res.status(200).json({
        available: false,
        reason: 'taken',
        message: 'Tên này đã có người dùng',
      })
    }

    // Phòng trường hợp bảng profiles chưa chạy migration cột username, kiểm tra thêm RPC
    try {
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('check_username_available', {
        p_username: clean,
      })
      if (!rpcErr && rpcData && typeof rpcData.available === 'boolean') {
        return res.status(200).json(rpcData)
      }
    } catch {}

    return res.status(200).json({
      available: true,
      reason: 'ok',
      message: 'Tên người dùng hợp lệ',
    })
  } catch {
    return res.status(500).json({
      available: false,
      reason: 'server_error',
      message: 'Không thể kiểm tra tên người dùng lúc này.',
    })
  }
}

/**
 * POST /api/auth/login
 * Body: { identifier: string, password: string }
 * - Nếu nhập username: tra email tương ứng ở SERVER rồi gọi signInWithPassword
 * - Không bao giờ trả email ra khi đăng nhập thất bại
 * - Sai thông tin luôn trả chung: "Tên đăng nhập hoặc mật khẩu không đúng"
 */
async function loginWithIdentifier(req, res) {
  try {
    const { identifier, password } = req.body || {}

    if (
      typeof identifier !== 'string' ||
      typeof password !== 'string' ||
      !identifier.trim() ||
      !password ||
      identifier.trim().length > 160 ||
      password.length > 256
    ) {
      return res.status(401).json({
        success: false,
        error: GENERIC_LOGIN_ERROR,
      })
    }

    const cleanId = identifier.trim().toLowerCase()
    let targetEmail = null

    if (cleanId.includes('@')) {
      if (!EMAIL_REGEX.test(cleanId)) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR })
      }
      targetEmail = cleanId
    } else {
      // Nếu là username: kiểm tra sơ bộ định dạng và tra email ở server
      if (!USERNAME_REGEX.test(cleanId)) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR })
      }
      const resolved = await resolveUserByIdentifier(cleanId)
      if (!resolved || !resolved.email) {
        return res.status(401).json({ success: false, error: GENERIC_LOGIN_ERROR })
      }
      targetEmail = resolved.email
    }

    // Tạo một ephemeral Supabase client (persistSession: false) để thực hiện signInWithPassword
    // mà không làm thay đổi trạng thái auth của supabaseAdmin singleton
    const authClient = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )

    const { data, error } = await authClient.auth.signInWithPassword({
      email: targetEmail,
      password,
    })

    if (error || !data?.session || !data?.user) {
      return res.status(401).json({
        success: false,
        error: GENERIC_LOGIN_ERROR,
      })
    }

    return res.status(200).json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
      user: data.user,
    })
  } catch {
    return res.status(401).json({
      success: false,
      error: GENERIC_LOGIN_ERROR,
    })
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: { identifier: string, redirectTo?: string }
 * - Nhận email hoặc tên người dùng -> server tự tra email
 * - Nếu tài khoản chỉ đăng ký bằng Google (không có mật khẩu): trả thông báo hướng dẫn dùng "Tiếp tục với Google"
 * - Các trường hợp còn lại: LUÔN trả thông báo giống nhau:
 *   "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu"
 */
async function forgotPassword(req, res) {
  try {
    const { identifier, redirectTo } = req.body || {}
    if (typeof identifier !== 'string' || !identifier.trim() || identifier.trim().length > 160) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập tên người dùng hoặc email hợp lệ.',
      })
    }

    const cleanId = identifier.trim().toLowerCase()
    const resolved = await resolveUserByIdentifier(cleanId)

    // Trường hợp tài khoản chỉ đăng ký bằng Google (không có mật khẩu) - Mục 2.4
    if (resolved && resolved.providers.includes('google') && !resolved.hasPassword) {
      return res.status(200).json({
        success: true,
        isGoogleOnly: true,
        message:
          'Tài khoản này được đăng ký bằng Google và chưa thiết lập mật khẩu riêng. Vui lòng bấm "Tiếp tục với Google" để đăng nhập.',
      })
    }

    const targetEmail = resolved?.email || (EMAIL_REGEX.test(cleanId) ? cleanId : null)

    if (targetEmail) {
      // Kiểm tra redirectTo an toàn (chỉ cho phép domain hợp lệ)
      const defaultOrigin = process.env.CLIENT_URL || 'https://permind.io.vn'
      let safeRedirect = `${defaultOrigin.replace(/\/$/, '')}/reset-password`
      if (typeof redirectTo === 'string' && /^https?:\/\//i.test(redirectTo)) {
        try {
          const parsed = new URL(redirectTo)
          if (
            parsed.hostname === 'permind.io.vn' ||
            parsed.hostname === 'www.permind.io.vn' ||
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.hostname.endsWith('.vercel.app')
          ) {
            safeRedirect = redirectTo
          }
        } catch {}
      }

      try {
        await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: safeRedirect,
        })
      } catch {
        // Không lộ lỗi nội bộ ra ngoài để chống account enumeration
      }
    }

    return res.status(200).json({
      success: true,
      isGoogleOnly: false,
      message: GENERIC_FORGOT_MESSAGE,
    })
  } catch {
    return res.status(200).json({
      success: true,
      isGoogleOnly: false,
      message: GENERIC_FORGOT_MESSAGE,
    })
  }
}

module.exports = {
  checkUsername,
  loginWithIdentifier,
  forgotPassword,
  validateUsernameFormat,
  COMMON_PASSWORDS,
  RESERVED_USERNAMES,
}
