// config/env.js — Đọc và kiểm tra biến môi trường bắt buộc

require('dotenv').config()

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
]

REQUIRED_VARS.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`[PeerMind] ❌ Thiếu biến môi trường: ${varName}`)
    process.exit(1)
  }
})

module.exports = {
  PORT: process.env.PORT || 3001,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
}
