// client/src/hooks/useLiveKitScreen.ts
// Hook quản lý luồng chia sẻ màn hình qua LiveKit SFU (Simulcast, Dynacast, Auto Reconnect & Fallback)

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client'

interface UseLiveKitScreenOptions {
  roomCode: string
  currentSocketId: string
  userId?: string
  userName?: string
  isSomeoneSharing: boolean
  isLocalSharing: boolean
  localScreenStream?: MediaStream | null
}

export function useLiveKitScreen({
  roomCode,
  currentSocketId,
  userId,
  userName,
  isSomeoneSharing,
  isLocalSharing,
  localScreenStream,
}: UseLiveKitScreenOptions) {
  const [liveKitScreenStream, setLiveKitScreenStream] = useState<MediaStream | null>(null)
  const [isLiveKitConnected, setIsLiveKitConnected] = useState<boolean>(false)
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false)
  const [liveKitError, setLiveKitError] = useState<string | null>(null)

  const roomRef = useRef<Room | null>(null)
  const publishedTrackRef = useRef<any>(null)

  // Hàm lấy token LiveKit từ server
  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/livekit-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          socketId: currentSocketId,
          userName: userName || 'Thành viên',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}: Không thể lấy token LiveKit`)
      }

      return await res.json()
    } catch (err: any) {
      console.warn('[LiveKit] Lỗi lấy token:', err.message)
      throw err
    }
  }, [roomCode, userId, currentSocketId, userName])

  // Dọn dẹp kết nối LiveKit hiện tại
  const disconnectRoom = useCallback(() => {
    if (publishedTrackRef.current) {
      try {
        roomRef.current?.localParticipant.unpublishTrack(publishedTrackRef.current)
      } catch {}
      publishedTrackRef.current = null
    }

    if (roomRef.current) {
      try {
        roomRef.current.disconnect()
      } catch {}
      roomRef.current = null
    }

    setLiveKitScreenStream(null)
    setIsLiveKitConnected(false)
    setIsReconnecting(false)
  }, [])

  // 1. NGƯỜI CHIA SẺ (PUBLISHER): Publish screen track lên LiveKit SFU khi isLocalSharing = true
  useEffect(() => {
    if (!isLocalSharing || !localScreenStream) return

    let isCancelled = false
    const videoTrack = localScreenStream.getVideoTracks()[0]
    if (!videoTrack) return

    async function startPublishing() {
      try {
        setLiveKitError(null)
        const { token, url } = await fetchToken()
        if (isCancelled) return

        // Khởi tạo Room với simulcast và dynacast bật sẵn
        const room = new Room({
          dynacast: true,
          adaptiveStream: true,
        })
        roomRef.current = room

        // Lắng nghe sự kiện Reconnection
        room.on(RoomEvent.Reconnecting, () => {
          console.warn('🔄 [LiveKit] Mạng gián đoạn, đang tự động kết nối lại...')
          setIsReconnecting(true)
        })

        room.on(RoomEvent.Reconnected, () => {
          console.log('✅ [LiveKit] Đã kết nối lại thành công!')
          setIsReconnecting(false)
        })

        room.on(RoomEvent.Disconnected, () => {
          setIsLiveKitConnected(false)
          setIsReconnecting(false)
        })

        await room.connect(url, token)
        if (isCancelled) {
          room.disconnect()
          return
        }

        setIsLiveKitConnected(true)

        // Publish màn hình với Simulcast bật sẵn (phục vụ đồng thời 50 người với các mức băng thông khác nhau)
        const publication = await room.localParticipant.publishTrack(videoTrack, {
          name: 'screen_share',
          source: Track.Source.ScreenShare,
          simulcast: true,
          videoCodec: 'vp8',
        })

        publishedTrackRef.current = publication
        console.log('📺 [LiveKit SFU] Đã publish luồng màn hình thành công lên LiveKit.')
      } catch (err: any) {
        console.warn('⚠️ [LiveKit SFU] Không thể kết nối SFU cho chia sẻ màn hình, dùng Mesh dự phòng:', err.message)
        setLiveKitError(err.message)
      }
    }

    startPublishing()

    return () => {
      isCancelled = true
      disconnectRoom()
    }
  }, [isLocalSharing, localScreenStream, fetchToken, disconnectRoom])

  // 2. NGƯỜI XEM (SUBSCRIBER): Tự động kết nối LiveKit và subscribe track màn hình của người đang chiếu
  useEffect(() => {
    // Nếu chính mình đang chia sẻ hoặc không có ai chia sẻ thì bỏ qua
    if (isLocalSharing || !isSomeoneSharing) {
      if (!isLocalSharing) {
        disconnectRoom()
      }
      return
    }

    let isCancelled = false

    async function startSubscribing() {
      try {
        setLiveKitError(null)
        const { token, url } = await fetchToken()
        if (isCancelled) return

        const room = new Room({
          dynacast: true,
          adaptiveStream: true,
        })
        roomRef.current = room

        // Lắng nghe sự kiện Reconnection
        room.on(RoomEvent.Reconnecting, () => {
          console.warn('🔄 [LiveKit Subscriber] Đang kết nối lại luồng màn hình...')
          setIsReconnecting(true)
        })

        room.on(RoomEvent.Reconnected, () => {
          console.log('✅ [LiveKit Subscriber] Đã khôi phục kết nối màn hình!')
          setIsReconnecting(false)
        })

        room.on(RoomEvent.Disconnected, () => {
          setLiveKitScreenStream(null)
          setIsLiveKitConnected(false)
          setIsReconnecting(false)
        })

        // Lắng nghe khi có Track mới được subscribe
        room.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            console.log(`📡 [LiveKit] Đã nhận Track từ ${participant.identity}:`, track.kind, track.source)
            if (track.kind === Track.Kind.Video && track.mediaStreamTrack) {
              const stream = new MediaStream([track.mediaStreamTrack])
              setLiveKitScreenStream(stream)
            }
          }
        )

        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Video) {
            setLiveKitScreenStream(null)
          }
        })

        await room.connect(url, token)
        if (isCancelled) {
          room.disconnect()
          return
        }

        setIsLiveKitConnected(true)

        // Kiểm tra xem đã có track màn hình nào được publish trước đó chưa
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track && pub.track.kind === Track.Kind.Video && pub.track.mediaStreamTrack) {
              setLiveKitScreenStream(new MediaStream([pub.track.mediaStreamTrack]))
            }
          })
        })
      } catch (err: any) {
        console.warn('⚠️ [LiveKit Subscriber] Không thể kết nối SFU, dùng Mesh fallback:', err.message)
        setLiveKitError(err.message)
      }
    }

    startSubscribing()

    return () => {
      isCancelled = true
      disconnectRoom()
    }
  }, [isLocalSharing, isSomeoneSharing, fetchToken, disconnectRoom])

  return {
    liveKitScreenStream,
    isLiveKitConnected,
    isReconnecting,
    liveKitError,
    disconnectRoom,
  }
}
