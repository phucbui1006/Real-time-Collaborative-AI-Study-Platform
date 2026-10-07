// services/ragService.js — Trích xuất đoạn văn bản phục vụ RAG Chat

const { supabaseAdmin } = require('../config/supabase')
const { geminiModel } = require('../config/gemini')

/**
 * findRelevantChunks
 * RAG (Retrieval-Augmented Generation) đơn giản:
 * 1. Lấy nội dung slide của phòng từ DB
 * 2. Tìm các trang có nội dung liên quan đến câu hỏi (keyword matching)
 * 3. Đưa context + câu hỏi cho Gemini → nhận câu trả lời
 *
 * @param {string} roomCode
 * @param {string} question
 * @returns {Promise<string>}
 */
async function findRelevantChunks(roomCode, question) {
  // Lấy nội dung slide của phòng
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

  const pages = doc.pages_content

  // Tìm các trang liên quan (đơn giản: chứa từ khóa của câu hỏi)
  const keywords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  const relevantPages = pages
    .map((text, index) => ({ text, page: index + 1 }))
    .filter(({ text }) => keywords.some((kw) => text.toLowerCase().includes(kw)))
    .slice(0, 3) // Tối đa 3 trang context

  const context = relevantPages.length > 0
    ? relevantPages.map(({ text, page }) => `[Trang ${page}]: ${text}`).join('\n\n')
    : pages.slice(0, 3).join('\n\n')

  const prompt = `
Bạn là trợ lý học tập thông minh. Dựa vào nội dung tài liệu dưới đây,
hãy trả lời câu hỏi của học sinh một cách ngắn gọn, chính xác và dễ hiểu.
Nếu câu trả lời không có trong tài liệu, hãy nói rõ điều đó.

=== NỘI DUNG TÀI LIỆU ===
${context}

=== CÂU HỎI ===
${question}

Trả lời bằng tiếng Việt, ngắn gọn trong 2-4 câu.
`

  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

module.exports = { findRelevantChunks }
