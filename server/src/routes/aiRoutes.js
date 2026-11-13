// routes/aiRoutes.js — /api/ai

const express = require('express')
const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = rateLimit
const router = express.Router()
const { requireAuth } = require('../middlewares/authMiddleware')
const { generateQuiz, generateMindmap, chatRAG } = require('../controllers/aiController')

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip || 'unknown'),
  message: { success: false, error: 'Bạn đã vượt quá giới hạn sử dụng AI, vui lòng thử lại sau.' },
})

router.use(requireAuth, aiLimiter)

// POST /api/ai/generate-quiz    — Tạo bộ câu hỏi trắc nghiệm từ slide
router.post('/generate-quiz', generateQuiz)

// POST /api/ai/generate-mindmap — Tạo cấu trúc mindmap từ slide
router.post('/generate-mindmap', generateMindmap)

// POST /api/ai/chat             — Chat RAG với nội dung slide
router.post('/chat', chatRAG)

module.exports = router
