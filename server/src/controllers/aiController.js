// controllers/aiController.js — Xử lý Quiz, Mindmap, Chat RAG (có kiểm tra quyền thành viên & null safety)

const { generateQuizFromText, generateMindmapFromText } = require('../services/geminiService')
const { findRelevantChunks } = require('../services/ragService')
const { supabaseAdmin } = require('../config/supabase')
const { isUserAuthorizedInRoom } = require('./roomController')

async function loadAuthorizedRoomDocument(roomCode, userId) {
  const cleanCode = String(roomCode || '').trim()
  const authCheck = await isUserAuthorizedInRoom(cleanCode, userId)
  if (!authCheck.dbRoom) {
    return { errorStatus: 404, errorMsg: 'Không tìm thấy phòng học.' }
  }
  if (!authCheck.allowed) {
    return { errorStatus: 403, errorMsg: 'Bạn không có quyền truy cập AI cho phòng học này.' }
  }

  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('id, document_id, current_document_id')
    .eq('code', cleanCode)
    .maybeSingle()

  if (!room || (!room.document_id && !room.current_document_id)) {
    return { errorStatus: 404, errorMsg: 'Phòng học chưa có tài liệu để xử lý.' }
  }

  let doc = null
  if (room.document_id) {
    const { data: found } = await supabaseAdmin
      .from('documents')
      .select('pages_content')
      .eq('id', room.document_id)
      .maybeSingle()
    doc = found
  } else if (room.current_document_id) {
    const { data: foundRoomDoc } = await supabaseAdmin
      .from('room_documents')
      .select('pages_content')
      .eq('id', room.current_document_id)
      .maybeSingle()
    doc = foundRoomDoc
  }

  if (!doc || !Array.isArray(doc.pages_content) || doc.pages_content.length === 0) {
    return { errorStatus: 404, errorMsg: 'Không tìm thấy nội dung tài liệu.' }
  }

  return { pagesContent: doc.pages_content }
}

/** POST /api/ai/generate-quiz — Tạo bộ câu hỏi trắc nghiệm */
async function generateQuiz(req, res, next) {
  try {
    const { roomCode } = req.body || {}
    if (!roomCode) return res.status(400).json({ success: false, error: 'Thiếu roomCode.' })

    const loaded = await loadAuthorizedRoomDocument(roomCode, req.user?.id)
    if (loaded.errorStatus) {
      return res.status(loaded.errorStatus).json({ success: false, error: loaded.errorMsg })
    }

    const fullText = loaded.pagesContent.join('\n')
    const quiz = await generateQuizFromText(fullText)

    res.json({ success: true, quiz })
  } catch (err) {
    next(err)
  }
}

/** POST /api/ai/generate-mindmap — Tạo cấu trúc mindmap */
async function generateMindmap(req, res, next) {
  try {
    const { roomCode } = req.body || {}
    if (!roomCode) return res.status(400).json({ success: false, error: 'Thiếu roomCode.' })

    const loaded = await loadAuthorizedRoomDocument(roomCode, req.user?.id)
    if (loaded.errorStatus) {
      return res.status(loaded.errorStatus).json({ success: false, error: loaded.errorMsg })
    }

    const fullText = loaded.pagesContent.join('\n')
    const mindmap = await generateMindmapFromText(fullText)

    res.json({ success: true, mindmap })
  } catch (err) {
    next(err)
  }
}

/** POST /api/ai/chat — Chat RAG với nội dung slide */
async function chatRAG(req, res, next) {
  try {
    const { roomCode, question } = req.body || {}
    if (!roomCode || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Thiếu roomCode hoặc question.' })
    }

    const cleanQuestion = question.trim().slice(0, 1500)
    const loaded = await loadAuthorizedRoomDocument(roomCode, req.user?.id)
    if (loaded.errorStatus) {
      return res.status(loaded.errorStatus).json({ success: false, error: loaded.errorMsg })
    }

    const answer = await findRelevantChunks(loaded.pagesContent, cleanQuestion)
    res.json({ success: true, answer })
  } catch (err) {
    next(err)
  }
}

module.exports = { generateQuiz, generateMindmap, chatRAG }
