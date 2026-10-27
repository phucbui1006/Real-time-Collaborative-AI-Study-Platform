// services/geminiService.js — Gọi Gemini API với JSON Structured Output & Fallback
const { geminiModel } = require('../config/gemini')

/**
 * generateQuizFromText
 * Gửi văn bản slide → Gemini trả về mảng câu hỏi JSON chuẩn.
 *
 * @param {string} text - Nội dung văn bản đã bóc tách từ slide
 * @returns {Promise<Array>} - Mảng câu hỏi trắc nghiệm
 */
async function generateQuizFromText(text) {
  if (!geminiModel) {
    return [
      {
        id: 1,
        question: "Dự án Permind sử dụng công nghệ nào để đồng bộ thời gian thực?",
        options: { A: "Socket.io", B: "FTP", C: "Email", D: "SMS" },
        correctAnswer: "A",
        explanation: "Permind sử dụng Socket.io và WebSockets để đồng bộ lật slide và làm bài thi thời gian thực."
      },
      {
        id: 2,
        question: "Cơ sở dữ liệu đám mây nào đang được Permind tích hợp?",
        options: { A: "Supabase (PostgreSQL)", B: "Access", C: "SQLite cục bộ", D: "Excel" },
        correctAnswer: "A",
        explanation: "Dự án lưu trữ tài khoản, phòng học và tài liệu qua hệ thống Supabase Cloud."
      }
    ]
  }

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
  if (!geminiModel) {
    return {
      nodes: [
        { id: "1", data: { label: "Nội dung ôn tập" }, position: { x: 250, y: 50 } },
        { id: "2", data: { label: "Khái niệm chính" }, position: { x: 100, y: 150 } },
        { id: "3", data: { label: "Bài tập vận dụng" }, position: { x: 400, y: 150 } }
      ],
      edges: [
        { id: "e1-2", source: "1", target: "2" },
        { id: "e1-3", source: "1", target: "3" }
      ]
    }
  }

  const prompt = `
Bạn là chuyên gia tóm tắt kiến thức. Từ nội dung slide dưới đây,
hãy tạo cấu trúc sơ đồ tư duy (mindmap) phân cấp.

Trả về JSON theo schema sau:
{
  "nodes": [
    { "id": "1", data: { "label": "Chủ đề chính" }, "position": { "x": 0, "y": 0 } }
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
