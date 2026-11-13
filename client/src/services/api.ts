import axios from 'axios'
import { supabase } from './supabaseClient'

const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined
export const API_ORIGIN = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : ''

/**
 * Trả về URL đầy đủ cho một endpoint API.
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_ORIGIN ? `${API_ORIGIN}${normalizedPath}` : normalizedPath
}

/**
 * Lấy Access Token hiện tại của Supabase Auth (nếu đã đăng nhập)
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  } catch {
    return null
  }
}

/**
 * Wrapper cho fetch() tự động gắn Supabase Bearer Access Token
 */
export async function authFetch(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : getApiUrl(pathOrUrl)
  const token = await getAccessToken()
  const headers = new Headers(init.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(url, { ...init, headers })
}

/**
 * api — Axios instance đã được cấu hình sẵn cho Permind Backend (kèm JWT interceptor).
 */
export const api = axios.create({
  baseURL: API_ORIGIN ? `${API_ORIGIN}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
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
