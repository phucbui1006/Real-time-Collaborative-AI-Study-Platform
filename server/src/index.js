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
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

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
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' },
})

initSockets(io)

server.listen(PORT, () => {
  console.log(`🚀 PeerMind Server đang chạy tại http://localhost:${PORT}`)
})
