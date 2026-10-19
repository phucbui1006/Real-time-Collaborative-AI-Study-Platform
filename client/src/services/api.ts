import axios from 'axios'

/**
 * api — Axios instance đã được cấu hình sẵn cho PeerMind Backend.
 *
 * Tất cả request đến /api/* sẽ được Vite proxy chuyển đến server:3001
 * (cấu hình trong vite.config.ts).
 *
 * Dùng trong services hoặc hooks:
 * ```ts
 * import { api } from './api'
 * const { data } = await api.post('/ai/generate-quiz', { roomCode })
 * ```
 */
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Documents ────────────────────────────────────────────────────────────────

/** Upload slide PDF lên server (multipart/form-data) */
export async function uploadDocument(file: File, subject?: string) {
  const form = new FormData()
  form.append('file', file)
  if (subject) {
    form.append('subject', subject)
  }
  return api.post('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** Lấy danh sách tài liệu của user */
export async function getDocuments() {
  return api.get('/documents')
}

/** Xóa tài liệu theo ID */
export async function deleteDocument(id: number) {
  return api.delete(`/documents/${id}`)
}

// ─── AI ───────────────────────────────────────────────────────────────────────

/** Tạo bộ câu hỏi quiz từ nội dung slide */
export async function generateQuiz(roomCode: string) {
  return api.post('/ai/generate-quiz', { roomCode })
}

/** Tạo cấu trúc mindmap từ nội dung slide */
export async function generateMindmap(roomCode: string) {
  return api.post('/ai/generate-mindmap', { roomCode })
}

/** Gửi câu hỏi RAG, nhận câu trả lời từ AI */
export async function chatRAG(roomCode: string, question: string) {
  return api.post('/ai/chat', { roomCode, question })
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

/** Lấy danh sách phòng học gần đây */
export async function getRooms() {
  return api.get('/rooms')
}

/** Tạo phòng học mới, nhận mã 6 số */
export async function createRoom(name: string, password?: string) {
  return api.post('/rooms/create', { name, password })
}

/** Kiểm tra mã phòng và mật khẩu phòng */
export async function verifyRoom(roomCode: string, password?: string) {
  return api.post('/rooms/verify', { code: roomCode, password })
}
