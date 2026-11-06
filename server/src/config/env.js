// config/env.js — Đọc và kiểm tra biến môi trường
require('dotenv').config()

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

REQUIRED_VARS.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`[Permind] ❌ Thiếu biến môi trường bắt buộc: ${varName}`)
    process.exit(1)
  }
})

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.log('[Permind] ℹ️ GEMINI_API_KEY chưa được cấu hình. Các tính năng AI sẽ chạy ở chế độ dự phòng (fallback).')
}

const LIVEKIT_CONFIGURED = Boolean(
  process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
)
if (!LIVEKIT_CONFIGURED) {
  console.log('[Permind] ℹ️ LiveKit chưa được cấu hình đầy đủ (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET). Endpoint cấp token sẽ thông báo cần cấu hình.')
}

module.exports = {
  PORT: process.env.PORT || 3001,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  MAX_ROOM_MEMBERS: parseInt(process.env.MAX_ROOM_MEMBERS || '50', 10),
  LIVEKIT_URL: process.env.LIVEKIT_URL || '',
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
  LIVEKIT_CONFIGURED,
}
