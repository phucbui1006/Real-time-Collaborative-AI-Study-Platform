// controllers/aiController.js — Xử lý Quiz, Mindmap, Chat RAG

const { generateQuizFromText } = require('../services/geminiService')
const { generateMindmapFromText } = require('../services/geminiService')
const { findRelevantChunks } = require('../services/ragService')
const { supabaseAdmin } = require('../config/supabase')

/** POST /api/ai/generate-quiz — Tạo bộ câu hỏi trắc nghiệm */
async function generateQuiz(req, res, next) {
  try {
    const { roomCode } = req.body
    if (!roomCode) return res.status(400).json({ error: 'Thiếu roomCode.' })

    // Lấy nội dung slide của phòng từ DB
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('document_id')
      .eq('code', roomCode)
      .single()

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('pages_content')
      .eq('id', room.document_id)
      .single()

    const fullText = doc.pages_content.join('\n')
    const quiz = await generateQuizFromText(fullText)

    res.json({ success: true, quiz })
  } catch (err) {
    next(err)
  }
}

/** POST /api/ai/generate-mindmap — Tạo cấu trúc mindmap */
async function generateMindmap(req, res, next) {
  try {
    const { roomCode } = req.body
    if (!roomCode) return res.status(400).json({ error: 'Thiếu roomCode.' })

    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('document_id')
      .eq('code', roomCode)
      .single()

    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('pages_content')
      .eq('id', room.document_id)
      .single()

    const fullText = doc.pages_content.join('\n')
    const mindmap = await generateMindmapFromText(fullText)

    res.json({ success: true, mindmap })
  } catch (err) {
    next(err)
  }
}

/** POST /api/ai/chat — Chat RAG với nội dung slide */
async function chatRAG(req, res, next) {
  try {
    const { roomCode, question } = req.body
    if (!roomCode || !question) return res.status(400).json({ error: 'Thiếu roomCode hoặc question.' })

    const answer = await findRelevantChunks(roomCode, question)
    res.json({ success: true, answer })
  } catch (err) {
    next(err)
  }
}

module.exports = { generateQuiz, generateMindmap, chatRAG }
