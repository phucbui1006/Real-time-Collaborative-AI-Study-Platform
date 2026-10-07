// services/geminiService.js — Gọi Gemini API với JSON Structured Output

const { geminiModel } = require('../config/gemini')

/**
 * generateQuizFromText
 * Gửi văn bản slide → Gemini trả về mảng câu hỏi JSON chuẩn.
 *
 * @param {string} text - Nội dung văn bản đã bóc tách từ slide
 * @returns {Promise<Array>} - Mảng câu hỏi trắc nghiệm
 */
async function generateQuizFromText(text) {
  const prompt = `
Bạn là một giáo viên chuyên nghiệp. Dựa vào nội dung slide học tập dưới đây,
hãy tạo ra 10 câu hỏi trắc nghiệm 4 đáp án (A, B, C, D).

Trả về JSON theo đúng schema sau, KHÔNG có văn bản ngoài JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "Câu hỏi?",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "A",
      "explanation": "Giải thích ngắn gọn."
    }
  ]
}

=== NỘI DUNG SLIDE ===
${text.slice(0, 8000)}
`

  const result = await geminiModel.generateContent(prompt)
  const json = JSON.parse(result.response.text())
  return json.questions
}

/**
 * generateMindmapFromText
 * Gửi văn bản slide → Gemini trả về cấu trúc cây cho React Flow.
 *
 * @param {string} text
 * @returns {Promise<{nodes: Array, edges: Array}>}
 */
async function generateMindmapFromText(text) {
  const prompt = `
Bạn là chuyên gia tóm tắt kiến thức. Từ nội dung slide dưới đây,
hãy tạo cấu trúc sơ đồ tư duy (mindmap) phân cấp.

Trả về JSON theo schema sau:
{
  "nodes": [
    { "id": "1", "data": { "label": "Chủ đề chính" }, "position": { "x": 0, "y": 0 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" }
  ]
}

=== NỘI DUNG SLIDE ===
${text.slice(0, 8000)}
`

  const result = await geminiModel.generateContent(prompt)
  return JSON.parse(result.response.text())
}

module.exports = { generateQuizFromText, generateMindmapFromText }
