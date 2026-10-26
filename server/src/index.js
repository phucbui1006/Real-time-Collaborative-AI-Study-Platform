// server/src/index.js
// Điểm khởi chạy chính — Express Server & Socket.io Server

const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
require('dotenv').config()

const { initSockets } = require('./sockets/index')
const documentRoutes = require('./routes/documentRoutes')
const aiRoutes = require('./routes/aiRoutes')
const roomRoutes = require('./routes/roomRoutes')
const { errorHandler } = require('./middlewares/errorHandler')

const PORT = process.env.PORT || 3001

// ── Express App ──────────────────────────────────────────────────────────────
const app = express()

// Cấu hình CORS linh hoạt: chấp nhận localhost, tên miền Vercel và CLIENT_URL
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép tất cả các nguồn truy cập (đặc biệt là Vercel và localhost)
      callback(null, true)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

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
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

initSockets(io)

server.listen(PORT, () => {
  console.log(`🚀 PeerMind Server đang chạy tại http://localhost:${PORT}`)
})
