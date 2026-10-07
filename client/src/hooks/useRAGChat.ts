import { useState, useCallback } from 'react'
import axios from 'axios'

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

/**
 * useRAGChat — Hook quản lý hội thoại RAG với AI.
 *
 * Người dùng gửi câu hỏi → Backend tìm đoạn văn liên quan trong slide
 * → Gọi Gemini API → Trả về câu trả lời có dẫn nguồn trang cụ thể.
 *
 * Dùng trong component:
 * ```tsx
 * const { messages, sendMessage, isLoading } = useRAGChat(roomCode)
 * ```
 */
export function useRAGChat(roomCode: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (question: string) => {
    if (!roomCode || !question.trim()) return

    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setIsLoading(true)

    try {
      const { data } = await axios.post('/api/ai/chat', { roomCode, question })
      setMessages((prev) => [...prev, { role: 'ai', content: data.answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [roomCode])

  return { messages, sendMessage, isLoading }
}
