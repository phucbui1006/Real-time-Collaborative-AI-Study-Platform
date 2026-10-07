import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { socket } from '../services/socket'
import type { Socket } from 'socket.io-client'

interface SocketContextValue {
  socket: Socket
  isConnected: boolean
}

const SocketContext = createContext<SocketContextValue | null>(null)

/**
 * SocketContext — Cung cấp socket instance cho toàn bộ cây component.
 *
 * Bất kỳ component nào cũng có thể gọi `useSocketContext()` để
 * gửi / lắng nghe tín hiệu Socket.io mà không phải tạo lại kết nối.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(socket.connected)

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    return () => {
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocketContext() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocketContext phải dùng bên trong <SocketProvider>')
  return ctx
}
