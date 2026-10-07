import { useEffect } from 'react'
import { useSocketContext } from '../context/SocketContext'
import { useRoomContext } from '../context/RoomContext'

/**
 * useSocket — Hook đơn giản hóa việc lắng nghe sự kiện socket.
 *
 * Dùng trong component:
 * ```tsx
 * useSocket('SLIDE_CHANGED', (data) => setSlide(data.slideIndex))
 * ```
 */
export function useSocket<T = unknown>(event: string, handler: (data: T) => void) {
  const { socket } = useSocketContext()

  useEffect(() => {
    socket.on(event, handler)
    return () => { socket.off(event, handler) }
  }, [socket, event, handler])
}

/**
 * useSlideSync — Lắng nghe sự kiện SLIDE_CHANGED và cập nhật RoomContext.
 */
export function useSlideSync() {
  const { setCurrentSlide } = useRoomContext()

  useSocket<{ slideIndex: number }>('SLIDE_CHANGED', ({ slideIndex }) => {
    setCurrentSlide(slideIndex)
  })
}
