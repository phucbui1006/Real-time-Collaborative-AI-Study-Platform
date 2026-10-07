// routes/aiRoutes.js — /api/ai

const express = require('express')
const router = express.Router()
const { generateQuiz, generateMindmap, chatRAG } = require('../controllers/aiController')

// POST /api/ai/generate-quiz    — Tạo bộ câu hỏi trắc nghiệm từ slide
router.post('/generate-quiz', generateQuiz)

// POST /api/ai/generate-mindmap — Tạo cấu trúc mindmap từ slide
router.post('/generate-mindmap', generateMindmap)

// POST /api/ai/chat             — Chat RAG với nội dung slide
router.post('/chat', chatRAG)

module.exports = router
