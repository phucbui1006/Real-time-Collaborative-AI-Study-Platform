// client/src/hooks/useLiveKitRoom.ts
// Quản lý toàn bộ Media (Camera, Micro, Màn hình) qua LiveKit SFU phục vụ tối đa 50 người
// Thay thế hoàn toàn WebRTC Mesh P2P và RTCPeerConnection thủ công

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client'
import {
  socket,
  toggleMedia,
  requestScreenShare,
  stopScreenShare as emitStopShare,
} from '../services/socket'
import { getApiUrl } from '../services/api'
import type { RoomMember } from '../types/classroom'

interface UseLiveKitRoomOptions {
  roomCode: string
  currentSocketId?: string
  userId?: string
  userName?: string
  members: RoomMember[]
  userRole?: 'host' | 'speaker' | 'viewer'
  onPermissionError?: (msg: string) => void
}

export function useLiveKitRoom({
  roomCode,
  currentSocketId,
  userId,
  userName,
  userRole,
  onPermissionError,
}: UseLiveKitRoomOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null)
  const [isMicOn, setIsMicOn] = useState(false)
  const [isCamOn, setIsCamOn] = useState(false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const roomRef = useRef<Room | null>(null)
  // Cờ một chiều: khi socket đã sẵn sàng một lần thì giữ nguyên, tránh ngắt LiveKit mỗi khi socket đổi ID
  const [socketReady, setSocketReady] = useState(Boolean(currentSocketId))
  // Khi vai trò đổi giữa Người xem <-> Diễn giả/Host, cần token mới để cập nhật quyền phát mic/cam
  const canPublishMedia = userRole !== 'viewer'
  useEffect(() => {
    if (currentSocketId) setSocketReady(true)
  }, [currentSocketId])
  useEffect(() => {
    setSocketReady(Boolean(socket.id))
  }, [roomCode])
  const screenStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const isUnmountedRef = useRef(false)

  // ─── 1. HÀM DỌN DẸP TOÀN BỘ THIẾT BỊ MEDIA & NGẮT KẾT NỐI SFU ────────────
  const stopAllMedia = useCallback(() => {
    console.log('[LiveKit SFU] Dừng toàn bộ thiết bị media và giải phóng kết nối...')
    isUnmountedRef.current = true

    if (roomRef.current) {
      const room = roomRef.current
      try {
        // Tắt camera & micro để tắt đèn webcam/mic ngay lập tức
        room.localParticipant.setCameraEnabled(false).catch(() => {})
        room.localParticipant.setMicrophoneEnabled(false).catch(() => {})
        room.localParticipant.setScreenShareEnabled(false).catch(() => {})

        // Dừng triệt để tất cả tracks cục bộ
        room.localParticipant.trackPublications.forEach((pub) => {
          if (pub.track) {
            try {
              pub.track.mediaStreamTrack.stop()
            } catch {}
          }
        })

        room.disconnect()
      } catch (e) {
        console.warn('[LiveKit SFU] Lỗi khi disconnect room:', e)
      }
      roomRef.current = null
    }

    if (localStream) {
      localStream.getTracks().forEach((t) => {
        try {
          t.stop()
        } catch {}
      })
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop()
        } catch {}
      })
      screenStreamRef.current = null
    } else if (screenStream) {
      screenStream.getTracks().forEach((t) => {
        try {
          t.stop()
        } catch {}
      })
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {})
      } catch {}
      audioContextRef.current = null
    }

    setLocalStream(null)
    setScreenStream(null)
    setRemoteStreams({})
    setRemoteScreenStream(null)
    setIsMicOn(false)
    setIsCamOn(false)
    setIsSharingScreen(false)
    setIsSpeaking(false)
    setIsLiveKitConnected(false)
    setIsReconnecting(false)
  }, [localStream, screenStream])

  // Tự động dọn dẹp khi tab bị đóng hoặc chuyển trang (beforeunload, pagehide)
  useEffect(() => {
    const handleBeforeUnload = () => stopAllMedia()
    const handlePageHide = () => stopAllMedia()

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [stopAllMedia])

  // ─── 2. KẾT NỐI TỚI LIVEKIT ROOM SFU ────────────────────────────────────
  useEffect(() => {
    // Chỉ kết nối khi socket đã sẵn sàng (đã vào phòng, có socket.id)
    if (!roomCode || !socketReady) return
    isUnmountedRef.current = false

    let activeRoom: Room | null = null
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    // Trả về true nếu kết thúc (thành công hoặc bị huỷ), false nếu cần thử lại
    async function attemptConnect(): Promise<boolean> {
      try {
        // Lấy token xác thực từ server
        const activeSocketId = socket.id || ''
        const res = await fetch(getApiUrl(`/api/rooms/${roomCode}/livekit-token`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            socketId: activeSocketId,
            userName: userName || 'Thành viên',
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          console.warn(`[LiveKit] Không thể lấy token (HTTP ${res.status}):`, errData.error)
          return false
        }

        const { token, url } = await res.json()
        if (isUnmountedRef.current || cancelled) return true

        // Khởi tạo LiveKit Room tối ưu cho 50 người: Dynacast + Adaptive Stream
        const room = new Room({
          dynacast: true,
          adaptiveStream: true,
        })
        activeRoom = room
        roomRef.current = room

        // Lắng nghe sự kiện kết nối lại (Auto Reconnect)
        room.on(RoomEvent.Reconnecting, () => {
          console.warn('🔄 [LiveKit SFU] Mạng gián đoạn, đang tự động kết nối lại...')
          setIsReconnecting(true)
        })

        room.on(RoomEvent.Reconnected, () => {
          console.log('✅ [LiveKit SFU] Đã khôi phục kết nối thành công!')
          setIsReconnecting(false)
        })

        room.on(RoomEvent.Disconnected, (reason) => {
          console.warn('⚠️ [LiveKit SFU] Room bị ngắt kết nối:', reason)
          setIsLiveKitConnected(false)
          setIsReconnecting(false)
          // Ngắt ngoài ý muốn (không phải do rời phòng / unmount) → tự kết nối lại
          if (!cancelled && !isUnmountedRef.current && roomRef.current === room) {
            roomRef.current = null
            retryTimer = setTimeout(() => {
              void connectWithRetry()
            }, 1500)
          }
        })

        // Lắng nghe nhận Track từ các thành viên khác trong phòng
        room.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            const participantKey = participant.identity
            console.log(`📡 [LiveKit] Nhận track ${track.kind} (${track.source}) từ ${participantKey}`)

            if (track.source === Track.Source.ScreenShare) {
              if (track.mediaStreamTrack) {
                setRemoteScreenStream(new MediaStream([track.mediaStreamTrack]))
              }
            } else if (track.mediaStreamTrack) {
              setRemoteStreams((prev) => {
                const existing = prev[participantKey]
                if (existing) {
                  // Thêm hoặc thay thế track tương ứng
                  const existingTracks = existing.getTracks().filter((t) => t.kind !== track.kind)
                  return {
                    ...prev,
                    [participantKey]: new MediaStream([...existingTracks, track.mediaStreamTrack]),
                  }
                }
                return {
                  ...prev,
                  [participantKey]: new MediaStream([track.mediaStreamTrack]),
                }
              })
            }
          }
        )

        // Lắng nghe khi thành viên hủy track
        room.on(
          RoomEvent.TrackUnsubscribed,
          (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.source === Track.Source.ScreenShare) {
              setRemoteScreenStream(null)
            } else {
              const participantKey = participant.identity
              setRemoteStreams((prev) => {
                const existing = prev[participantKey]
                if (!existing) return prev
                const remaining = existing.getTracks().filter((t) => t.id !== track.mediaStreamTrack?.id)
                if (remaining.length === 0) {
                  const next = { ...prev }
                  delete next[participantKey]
                  return next
                }
                return {
                  ...prev,
                  [participantKey]: new MediaStream(remaining),
                }
              })
            }
          }
        )

        // Lắng nghe khi track cục bộ được publish (đồng bộ luồng chia sẻ màn hình của bản thân)
        room.on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.source === Track.Source.ScreenShare && pub.track?.mediaStreamTrack) {
            const mTrack = pub.track.mediaStreamTrack
            const stream = new MediaStream([mTrack])
            screenStreamRef.current = stream
            setScreenStream(stream)
            setIsSharingScreen(true)
            mTrack.onended = () => {
              stopScreenShare()
            }
          }
        })

        // Lắng nghe khi track cục bộ bị unpublish
        room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
          if (pub.source === Track.Source.ScreenShare) {
            if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach((t) => {
                try {
                  t.stop()
                } catch {}
              })
              screenStreamRef.current = null
            }
            setScreenStream(null)
            setIsSharingScreen(false)
          }
        })

        // Kết nối phòng
        await room.connect(url, token)
        if (isUnmountedRef.current || cancelled) {
          room.disconnect()
          return true
        }

        setIsLiveKitConnected(true)
        console.log('🚀 [LiveKit SFU] Đã kết nối thành công tới phòng học!')
        return true
      } catch (err: any) {
        console.warn('⚠️ [LiveKit SFU] Lỗi kết nối LiveKit:', err?.message || err)
        if (activeRoom) {
          const failed = activeRoom
          if (roomRef.current === failed) roomRef.current = null
          activeRoom = null
          try {
            failed.disconnect()
          } catch {}
        }
        return false
      }
    }

    // Thử lại với backoff 1s, 2s, 4s... (tối đa 8 lần)
    async function connectWithRetry() {
      for (let attempt = 0; attempt < 8; attempt++) {
        if (cancelled || isUnmountedRef.current) return
        const done = await attemptConnect()
        if (done) return
        const delay = Math.min(1000 * 2 ** attempt, 8000)
        console.log(`[LiveKit] Thử kết nối lại lần ${attempt + 2} sau ${delay}ms...`)
        await new Promise<void>((resolve) => {
          retryTimer = setTimeout(resolve, delay)
        })
      }
      console.warn('[LiveKit] Đã thử nhiều lần nhưng không kết nối được SFU.')
    }

    // Chờ ~600ms để socket kịp gửi ROOM:JOIN rồi mới xin token lần đầu
    retryTimer = setTimeout(() => {
      void connectWithRetry()
    }, 600)

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      if (activeRoom) {
        if (roomRef.current === activeRoom) roomRef.current = null
        activeRoom.disconnect()
      }
    }
  }, [roomCode, userId, userName, socketReady, canPublishMedia])

  // ─── 3. ĐIỀU KHIỂN MICROPHONE (BẬT / TẮT) ───────────────────────────────
  const toggleMic = useCallback(async () => {
    if (userRole === 'viewer') {
      onPermissionError?.('Bạn đang là Người xem. Hãy bấm Giơ tay để xin quyền phát biểu.')
      return
    }

    const room = roomRef.current
    if (!room || room.state !== 'connected') {
      onPermissionError?.('Hệ thống SFU đang kết nối. Vui lòng thử lại sau vài giây.')
      return
    }

    try {
      const nextState = !isMicOn
      await room.localParticipant.setMicrophoneEnabled(nextState)
      setIsMicOn(nextState)

      // Cập nhật localStream
      const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack
      if (audioTrack) {
        setLocalStream((prev) => {
          const videoTrack = prev?.getVideoTracks()[0]
          return new MediaStream(videoTrack ? [videoTrack, audioTrack] : [audioTrack])
        })
      }

      toggleMedia(roomCode, nextState, isCamOn)
    } catch (err: any) {
      console.warn('[LiveKit] Lỗi truy cập Microphone:', err)
      onPermissionError?.('Không thể truy cập Microphone. Vui lòng kiểm tra quyền thiết bị.')
    }
  }, [isMicOn, isCamOn, roomCode, userRole, onPermissionError])

  // ─── 4. ĐIỀU KHIỂN CAMERA (BẬT / TẮT) ───────────────────────────────────
  const toggleCam = useCallback(async () => {
    if (userRole === 'viewer') {
      onPermissionError?.('Bạn đang là Người xem. Hãy bấm Giơ tay để xin quyền phát biểu.')
      return
    }

    const room = roomRef.current
    if (!room || room.state !== 'connected') {
      onPermissionError?.('Hệ thống SFU đang kết nối. Vui lòng thử lại sau vài giây.')
      return
    }

    try {
      const nextState = !isCamOn
      await room.localParticipant.setCameraEnabled(nextState)
      setIsCamOn(nextState)

      if (nextState) {
        // Lấy video track vừa bật
        const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack
        if (videoTrack) {
          setLocalStream((prev) => {
            const audioTrack = prev?.getAudioTracks()[0]
            return new MediaStream(audioTrack ? [videoTrack, audioTrack] : [videoTrack])
          })
        }
      } else {
        // Tắt camera: loại bỏ video track khỏi localStream
        setLocalStream((prev) => {
          if (!prev) return null
          const audioTrack = prev.getAudioTracks()[0]
          return audioTrack ? new MediaStream([audioTrack]) : null
        })
      }

      toggleMedia(roomCode, isMicOn, nextState)
    } catch (err: any) {
      console.warn('[LiveKit] Lỗi truy cập Camera:', err)
      onPermissionError?.('Không thể truy cập Camera. Vui lòng kiểm tra quyền thiết bị.')
    }
  }, [isCamOn, isMicOn, roomCode, userRole, onPermissionError])

  // ─── 5. CHIA SẺ MÀN HÌNH (BẬT / TẮT SFU CHUẨN ĐỘ PHÂN GIẢI GỐC) ─────────
  const stopScreenShare = useCallback(async () => {
    const room = roomRef.current
    if (room) {
      try {
        await room.localParticipant.setScreenShareEnabled(false)
      } catch (err) {
        console.warn('[LiveKit] Lỗi khi tắt chia sẻ màn hình:', err)
      }
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop()
        } catch {}
      })
      screenStreamRef.current = null
    }

    setScreenStream(null)
    setIsSharingScreen(false)
    emitStopShare(roomCode)
  }, [roomCode])

  const startScreenShare = useCallback(async () => {
    // Nếu SFU chưa sẵn sàng, chờ tối đa ~10s để kết nối xong rồi mới phát
    for (let i = 0; i < 20; i++) {
      if (roomRef.current && roomRef.current.state === 'connected') break
      await new Promise((r) => setTimeout(r, 500))
    }
    const room = roomRef.current
    if (!room || room.state !== 'connected') {
      onPermissionError?.('Hệ thống SFU đang kết nối. Vui lòng thử lại sau vài giây.')
      return
    }

    // Xin lượt chia sẻ từ server: mỗi phòng chỉ một người được chia sẻ tại một thời điểm
    const grant = await requestScreenShare(roomCode)
    if (!grant.ok) {
      onPermissionError?.(grant.message || 'Hiện không thể chia sẻ màn hình.')
      return
    }

    try {
      // Bật chia sẻ màn hình qua LiveKit SFU (không dùng simulcast cho screenshare để tương thích mọi trình duyệt)
      const pub = await room.localParticipant.setScreenShareEnabled(true, {
        audio: true, // Kèm âm thanh tab/hệ thống nếu người dùng chọn
      })

      setIsSharingScreen(true)

      // Lấy track màn hình từ publication vừa tạo hoặc qua getTrackPublication
      const trackPub = pub || room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = trackPub?.track?.mediaStreamTrack

      if (screenTrack) {
        const stream = new MediaStream([screenTrack])
        screenStreamRef.current = stream
        setScreenStream(stream)

        // Lắng nghe khi người dùng bấm "Dừng chia sẻ" trên thanh trình duyệt (Chrome/Edge/Firefox)
        screenTrack.onended = () => {
          stopScreenShare()
        }
      }
    } catch (err: any) {
      // Nhả lượt chia sẻ đã xin trước đó vì không phát được
      emitStopShare(roomCode)
      setIsSharingScreen(false)

      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        console.log('[LiveKit] Người dùng đã hủy chọn cửa sổ chia sẻ.')
        return
      }

      console.warn('[LiveKit] Lỗi chia sẻ màn hình:', err)
      const detail = err?.message ? `: ${err.message}` : ''
      onPermissionError?.(`Không thể chia sẻ màn hình${detail}. Vui lòng thử lại.`)
    }
  }, [roomCode, onPermissionError, stopScreenShare])

  // Lắng nghe sự kiện bị host tắt mic
  useEffect(() => {
    const handleMutedByHost = () => {
      if (roomRef.current) {
        roomRef.current.localParticipant.setMicrophoneEnabled(false).catch(() => {})
      }
      setIsMicOn(false)
      onPermissionError?.('Bạn đã bị Chủ phòng tắt micro.')
    }

    socket.on('ROOM:MUTED_BY_HOST', handleMutedByHost)
    return () => {
      socket.off('ROOM:MUTED_BY_HOST', handleMutedByHost)
    }
  }, [onPermissionError])

  return {
    localStream,
    screenStream,
    remoteStreams,
    remoteScreenStream,
    isMicOn,
    isCamOn,
    isSharingScreen,
    isSpeaking,
    isLiveKitConnected,
    isReconnecting,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    stopAllMedia,
  }
}
