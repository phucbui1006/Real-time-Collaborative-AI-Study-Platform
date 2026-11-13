// server/src/index.js
// Điểm khởi chạy chính — Express Server & Socket.io Server

const express = require('express')
const http = require('http')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { Server } = require('socket.io')
require('dotenv').config()

const { initSockets } = require('./sockets/index')
const { startRoomCleanupJob } = require('./services/roomCleanup')
const documentRoutes = require('./routes/documentRoutes')
const aiRoutes = require('./routes/aiRoutes')
const roomRoutes = require('./routes/roomRoutes')
const { errorHandler } = require('./middlewares/errorHandler')
const { CLIENT_URL } = require('./config/env')

const PORT = process.env.PORT || 3001

// Danh sách origin hợp lệ cho CORS (HTTP & Socket.io)
const STATIC_ALLOWED_ORIGINS = new Set(
  [
    CLIENT_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
    'https://permind.io.vn',
    'https://www.permind.io.vn',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
  ]
    .map((u) => (u || '').trim().replace(/\/$/, ''))
    .filter(Boolean)
)

function isAllowedOrigin(origin) {
  if (!origin) return true // Cho phép health check / request không phải từ browser cross-origin
  const normalized = origin.trim().replace(/\/$/, '')
  if (STATIC_ALLOWED_ORIGINS.has(normalized)) return true
  if (
    /^https:\/\/(?:permind|real-time-collaborative-ai-study(?:-[a-z0-9-]+)*)(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
      normalized
    )
  ) {
    return true
  }
  return false
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true)
    }
    const err = new Error('Origin không được phép truy cập bởi chính sách CORS.')
    err.statusCode = 403
    return callback(err)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

// ── Express App ──────────────────────────────────────────────────────────────
const app = express()
app.set('trust proxy', 1)

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)
app.use(cors(corsOptions))

// Giới hạn tốc độ chung cho toàn bộ REST API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.' },
})
app.use('/api', apiLimiter)

// Chỉ cho phép payload tối đa 15mb tại endpoint upload-images (các endpoint khác 2mb)
app.use('/api/documents/upload-images', express.json({ limit: '15mb' }))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ limit: '2mb', extended: true }))

// ── Routes REST API ───────────────────────────────────────────────────────────
app.use('/api/documents', documentRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/rooms', roomRoutes)

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }))

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler)

// ── HTTP + Socket.io Server ───────────────────────────────────────────────────
const server = http.createServer(app)
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 2 * 1024 * 1024, // Tối đa 2MB mỗi frame Socket.io
})

initSockets(io)

// Job dọn dẹp phòng không hoạt động quá lâu (tiết kiệm dung lượng DB)
startRoomCleanupJob()

server.listen(PORT, () => {
  console.log(`🚀 Permind Server đang chạy tại http://localhost:${PORT}`)
})
