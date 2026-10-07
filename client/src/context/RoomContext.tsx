import { createContext, useContext, useState, ReactNode } from 'react'

interface RoomMember {
  id: string
  name: string
  isHost: boolean
}

interface RoomContextValue {
  roomCode: string | null
  hostId: string | null
  members: RoomMember[]
  currentSlide: number
  setRoomCode: (code: string | null) => void
  setHostId: (id: string | null) => void
  setMembers: (members: RoomMember[]) => void
  setCurrentSlide: (index: number) => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

/**
 * RoomContext — Lưu trữ thông tin phòng học hiện tại.
 *
 * Gồm: ai là Host, danh sách người dùng đang online,
 * trang slide hiện tại đang được chiếu.
 */
export function RoomProvider({ children }: { children: ReactNode }) {
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)

  return (
    <RoomContext.Provider
      value={{
        roomCode,
        hostId,
        members,
        currentSlide,
        setRoomCode,
        setHostId,
        setMembers,
        setCurrentSlide,
      }}
    >
      {children}
    </RoomContext.Provider>
  )
}

export function useRoomContext() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoomContext phải dùng bên trong <RoomProvider>')
  return ctx
}
