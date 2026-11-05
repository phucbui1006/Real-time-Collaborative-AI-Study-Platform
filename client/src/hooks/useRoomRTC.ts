// client/src/hooks/useRoomRTC.ts
// Custom hook quản lý WebRTC Mesh P2P: Perfect Negotiation, Micro, Camera, Screen Share và VAD (Voice Activity Detection)

import { useState, useEffect, useRef, useCallback } from 'react'
import { socket, toggleMedia, sendSpeakingState, startScreenShare as emitStartShare, stopScreenShare as emitStopShare } from '../services/socket'
import type { RoomMember } from '../types/classroom'

/**
 * Cấu hình ICE Servers (STUN & TURN)
 * - STUN: Sử dụng máy chủ công khai của Google để tìm Public IP/Port trong điều kiện NAT thông thường.
 * - TURN: Bắt buộc trong mạng trường học/ký túc xá (Symmetric NAT) hoặc 4G/5G khi P2P bị chặn trực tiếp.
 *   Khi đó dữ liệu media được chuyển tiếp relay qua TURN server (VITE_TURN_URL).
 */
const getIceServers = (): RTCConfiguration => {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]

  const turnUrl = import.meta.env.VITE_TURN_URL
  const turnUser = import.meta.env.VITE_TURN_USER
  const turnCred = import.meta.env.VITE_TURN_CRED

  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    })
  }

  return { iceServers }
}

/**
 * Helper tìm RTCRtpSender chịu trách nhiệm cho luồng Video trong RTCPeerConnection
 */
const findVideoSender = (pc: RTCPeerConnection): RTCRtpSender | undefined => {
  if (typeof pc.getTransceivers === 'function') {
    const videoTransceiver = pc.getTransceivers().find(
      (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
    )
    if (videoTransceiver) return videoTransceiver.sender
  }
  return pc.getSenders().find((s) => s.track && s.track.kind === 'video')
}

interface PeerItem {
  pc: RTCPeerConnection
  makingOffer: boolean
  ignoreOffer: boolean
  isPolite: boolean
  iceCandidateQueue: RTCIceCandidateInit[]
}

interface UseRoomRTCOptions {
  roomCode: string
  currentSocketId?: string
  members: RoomMember[]
  onPermissionError?: (msg: string) => void
}

export function useRoomRTC({ roomCode, currentSocketId, members, onPermissionError }: UseRoomRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [isMicOn, setIsMicOn] = useState(false)
  const [isCamOn, setIsCamOn] = useState(false)
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const peersRef = useRef<Map<string, PeerItem>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const vadIntervalRef = useRef<number | null>(null)
  const isUnmountedRef = useRef(false)

  // ─── 0. HÀM DỌN DẸP TOÀN DIỆN MỌI THIẾT BỊ MEDIA & KẾT NỐI WEBRTC ──────────
  const stopAllMedia = useCallback(() => {
    console.log('[WebRTC] Dừng toàn bộ thiết bị media và giải phóng kết nối...')
    isUnmountedRef.current = true

    // 1. Dừng triệt để tất cả tracks của local stream (Camera, Mic)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
          console.log(`[WebRTC] Đã stop local track: ${track.kind}`)
        } catch (e) {
          console.warn('[WebRTC] Lỗi khi stop local track:', e)
        }
      })
      localStreamRef.current = null
    }
    setLocalStream(null)

    // 2. Dừng triệt để tất cả tracks của screen stream (Chia sẻ màn hình)
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
          console.log(`[WebRTC] Đã stop screen track: ${track.kind}`)
        } catch (e) {
          console.warn('[WebRTC] Lỗi khi stop screen track:', e)
        }
      })
      screenStreamRef.current = null
    }
    setScreenStream(null)

    // 3. Đóng tất cả RTCPeerConnection Mesh
    peersRef.current.forEach((peer, peerId) => {
      try {
        peer.pc.close()
        console.log(`[WebRTC] Đã đóng RTCPeerConnection với ${peerId}`)
      } catch (e) {
        console.warn(`[WebRTC] Lỗi khi đóng RTCPeerConnection với ${peerId}:`, e)
      }
    })
    peersRef.current.clear()

    // 4. Dừng VAD và đóng AudioContext
    if (vadIntervalRef.current) {
      window.clearInterval(vadIntervalRef.current)
      vadIntervalRef.current = null
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {})
      } catch {}
      audioContextRef.current = null
    }

    setIsMicOn(false)
    setIsCamOn(false)
    setIsSharingScreen(false)
    setIsSpeaking(false)
  }, [])

  // ─── 1. KHỞI TẠO LOCAL MEDIA STREAM BAN ĐẦU (CHỈ AUDIO, TUYỆT ĐỐI KHÔNG BẬT CAM PHẦN CỨNG) ───
  const initLocalMedia = useCallback(async () => {
    if (isUnmountedRef.current) return null
    try {
      // Chỉ xin Audio ban đầu, video = false để webcam không khởi động và đèn LED camera KHÔNG sáng
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      if (isUnmountedRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return null
      }

      // Mặc định ban đầu tắt micro (người dùng bấm bật mic mới mở)
      stream.getAudioTracks().forEach((t) => (t.enabled = false))

      localStreamRef.current = stream
      setLocalStream(stream)
      setIsMicOn(false)
      setIsCamOn(false)
      toggleMedia(roomCode, false, false)

      return stream
    } catch (err: any) {
      if (isUnmountedRef.current) return null
      console.warn('[WebRTC] Khởi tạo audio ban đầu không thành công hoặc không có mic:', err.name)
      // Tạo empty stream dự phòng để không crash
      const emptyStream = new MediaStream()
      localStreamRef.current = emptyStream
      setLocalStream(emptyStream)
      setIsMicOn(false)
      setIsCamOn(false)
      toggleMedia(roomCode, false, false)
      return emptyStream
    }
  }, [roomCode])

  useEffect(() => {
    isUnmountedRef.current = false
    initLocalMedia()

    // Bắt sự kiện người dùng đóng tab, reload hoặc chuyển hướng URL
    const handleBeforeUnload = () => {
      stopAllMedia()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      stopAllMedia()
    }
  }, [initLocalMedia, stopAllMedia])

  // ─── 2. THIẾT LẬP PERFECT NEGOTIATION CHO MỖI PEER (MESH P2P) ────────────
  const createPeer = useCallback(
    (targetSocketId: string, polite: boolean): PeerItem => {
      const pc = new RTCPeerConnection(getIceServers())
      const peerItem: PeerItem = {
        pc,
        makingOffer: false,
        ignoreOffer: false,
        isPolite: polite,
        iceCandidateQueue: [],
      }

      // Thêm local tracks hiện có vào kết nối
      const streamToAdd = localStreamRef.current
      if (streamToAdd) {
        streamToAdd.getTracks().forEach((track) => pc.addTrack(track, streamToAdd))
      }

      // Thêm sẵn video transceiver để sau này replaceTrack khi bật cam/share màn hình không cần renegotiate lại
      const hasVideoTrack = streamToAdd && streamToAdd.getVideoTracks().length > 0
      if (!hasVideoTrack) {
        try {
          pc.addTransceiver('video', { direction: 'sendrecv' })
        } catch (e) {
          console.warn('[WebRTC] Không thể thêm video transceiver trước:', e)
        }
      }

      // Xử lý ICE Candidate
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('WEBRTC:ICE', {
            roomCode,
            targetSocketId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      // Xử lý nhận Remote Track
      pc.ontrack = (event) => {
        const [incomingStream] = event.streams
        if (incomingStream) {
          setRemoteStreams((prev) => ({
            ...prev,
            [targetSocketId]: incomingStream,
          }))
        } else if (event.track) {
          setRemoteStreams((prev) => {
            const existing = prev[targetSocketId] || new MediaStream()
            existing.addTrack(event.track)
            return {
              ...prev,
              [targetSocketId]: existing,
            }
          })
        }
      }

      // Tự động khôi phục ICE nếu rớt mạng
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.warn(`[WebRTC] ICE thất bại với ${targetSocketId}, tiến hành ICE Restart...`)
          pc.restartIce()
        }
      }

      // Perfect Negotiation: onnegotiationneeded
      pc.onnegotiationneeded = async () => {
        try {
          peerItem.makingOffer = true
          await pc.setLocalDescription()
          if (pc.localDescription) {
            socket.emit('WEBRTC:OFFER', {
              roomCode,
              targetSocketId,
              offer: pc.localDescription,
            })
          }
        } catch (err) {
          console.error('[WebRTC] Lỗi tạo offer:', err)
        } finally {
          peerItem.makingOffer = false
        }
      }

      peersRef.current.set(targetSocketId, peerItem)
      return peerItem
    },
    [roomCode]
  )

  // ─── 3. ĐỒNG BỘ PEER CONNECTIONS THEO DANH SÁCH THÀNH VIÊN TRONG PHÒNG ──
  useEffect(() => {
    if (!currentSocketId) return

    const activeSocketIds = new Set(members.map((m) => m.socketId).filter((id) => id !== currentSocketId))

    // Tạo kết nối với thành viên mới
    activeSocketIds.forEach((remoteSocketId) => {
      if (!peersRef.current.has(remoteSocketId)) {
        // Quy tắc xác định polite peer tránh xung đột glare: socketId nhỏ hơn là polite
        const isPolite = currentSocketId < remoteSocketId
        createPeer(remoteSocketId, isPolite)
      }
    })

    // Dọn dẹp kết nối với thành viên đã rời phòng
    peersRef.current.forEach((peer, remoteSocketId) => {
      if (!activeSocketIds.has(remoteSocketId)) {
        peer.pc.close()
        peersRef.current.delete(remoteSocketId)
        setRemoteStreams((prev) => {
          const next = { ...prev }
          delete next[remoteSocketId]
          return next
        })
      }
    })
  }, [members, currentSocketId, createPeer])

  // ─── 4. LẮNG NGHE SIGNALING TỪ SOCKET.IO SERVER ──────────────────────────
  useEffect(() => {
    const handleOffer = async ({ fromSocketId, offer }: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => {
      let peer = peersRef.current.get(fromSocketId)
      if (!peer && currentSocketId) {
        const isPolite = currentSocketId < fromSocketId
        peer = createPeer(fromSocketId, isPolite)
      }
      if (!peer) return

      const { pc, isPolite } = peer

      const readyForOffer = !peer.makingOffer && (pc.signalingState === 'stable' || peer.isPolite)
      const offerCollision = !readyForOffer

      peer.ignoreOffer = !isPolite && offerCollision
      if (peer.ignoreOffer) {
        console.warn(`[WebRTC] Bỏ qua Offer do va chạm glare từ ${fromSocketId} (Impolite peer)`)
        return
      }

      try {
        await pc.setRemoteDescription(offer)
        // Xử lý hàng đợi ICE candidate đã nhận trước khi có remote description
        while (peer.iceCandidateQueue.length > 0) {
          const cand = peer.iceCandidateQueue.shift()
          if (cand) await pc.addIceCandidate(cand)
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('WEBRTC:ANSWER', {
          roomCode,
          targetSocketId: fromSocketId,
          answer: pc.localDescription!,
        })
      } catch (err) {
        console.error('[WebRTC] Lỗi xử lý Offer:', err)
      }
    }

    const handleAnswer = async ({ fromSocketId, answer }: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => {
      const peer = peersRef.current.get(fromSocketId)
      if (!peer) return

      try {
        await peer.pc.setRemoteDescription(answer)
        while (peer.iceCandidateQueue.length > 0) {
          const cand = peer.iceCandidateQueue.shift()
          if (cand) await peer.pc.addIceCandidate(cand)
        }
      } catch (err) {
        console.error('[WebRTC] Lỗi xử lý Answer:', err)
      }
    }

    const handleIceCandidate = async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const peer = peersRef.current.get(fromSocketId)
      if (!peer) return

      try {
        if (peer.pc.remoteDescription && peer.pc.remoteDescription.type) {
          await peer.pc.addIceCandidate(candidate)
        } else {
          // Lưu tạm vào hàng đợi nếu remote description chưa sẵn sàng
          peer.iceCandidateQueue.push(candidate)
        }
      } catch (err) {
        if (!peer.ignoreOffer) {
          console.error('[WebRTC] Lỗi thêm ICE candidate:', err)
        }
      }
    }

    socket.on('WEBRTC:OFFER', handleOffer)
    socket.on('WEBRTC:ANSWER', handleAnswer)
    socket.on('WEBRTC:ICE', handleIceCandidate)

    return () => {
      socket.off('WEBRTC:OFFER', handleOffer)
      socket.off('WEBRTC:ANSWER', handleAnswer)
      socket.off('WEBRTC:ICE', handleIceCandidate)
    }
  }, [roomCode, currentSocketId, createPeer])

  // ─── 5. PHÁT HIỆN ÂM THANH NÓI (VOICE ACTIVITY DETECTION - VAD) ───────────
  useEffect(() => {
    if (!isMicOn || !localStream) {
      setIsSpeaking(false)
      sendSpeakingState(roomCode, false)
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)
      return
    }

    const audioTrack = localStream.getAudioTracks()[0]
    if (!audioTrack || !audioTrack.enabled) return

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]))
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)

      const buffer = new Uint8Array(analyser.frequencyBinCount)
      let speakingFrames = 0

      vadIntervalRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(buffer)
        let sum = 0
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i]
        }
        const average = sum / buffer.length

        // Ngưỡng âm lượng phát hiện giọng nói
        const nowSpeaking = average > 25
        if (nowSpeaking) {
          speakingFrames = 5
        } else if (speakingFrames > 0) {
          speakingFrames--
        }

        const finalSpeaking = speakingFrames > 0
        setIsSpeaking((prev) => {
          if (prev !== finalSpeaking) {
            sendSpeakingState(roomCode, finalSpeaking)
          }
          return finalSpeaking
        })
      }, 100)
    } catch (e) {
      console.warn('Không thể khởi tạo AudioContext Analyser:', e)
    }

    return () => {
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [isMicOn, localStream, roomCode])

  // ─── 6. BẬT/TẮT MICRO VÀ CAMERA (ON-DEMAND HARDWARE: TẮT LÀ TẮT ĐÈN NGAY) ─
  const toggleMic = useCallback(async () => {
    let stream = localStreamRef.current
    let audioTrack = stream?.getAudioTracks()[0]

    // Nếu chưa có audio track (do ban đầu bị chặn hoặc chưa cấp)
    if (!audioTrack) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        })

        if (isUnmountedRef.current) {
          audioStream.getTracks().forEach((t) => t.stop())
          return
        }

        audioTrack = audioStream.getAudioTracks()[0]
        if (audioTrack) {
          if (!stream) {
            stream = new MediaStream()
            localStreamRef.current = stream
          }
          stream.addTrack(audioTrack)
          setLocalStream(new MediaStream(stream.getTracks()))

          // Gắn vào các peer
          peersRef.current.forEach((peer) => {
            const sender = peer.pc.getSenders().find((s) => s.track && s.track.kind === 'audio')
            if (sender) {
              sender.replaceTrack(audioTrack!)
            } else {
              peer.pc.addTrack(audioTrack!, stream!)
            }
          })
        }
      } catch (err: any) {
        console.warn('[WebRTC] Lỗi truy cập Microphone:', err)
        onPermissionError?.('Không thể truy cập Microphone. Vui lòng cấp quyền trên trình duyệt.')
        return
      }
    }

    if (audioTrack) {
      const nextState = !audioTrack.enabled
      audioTrack.enabled = nextState
      setIsMicOn(nextState)
      toggleMedia(roomCode, nextState, isCamOn)
    }
  }, [roomCode, isCamOn, onPermissionError])

  const toggleCam = useCallback(async () => {
    if (isCamOn) {
      // ─── TẮT CAMERA: DỪNG TRACK HOÀN TOÀN → ĐÈN WEBCAM TẮT NGAY LẬP TỨC ───
      console.log('[WebRTC] Tắt camera: Stop video track để ngắt phần cứng')
      const stream = localStreamRef.current
      if (stream) {
        const videoTracks = stream.getVideoTracks()
        videoTracks.forEach((track) => {
          try {
            track.stop() // TẮT PHẦN CỨNG CAMERA
            console.log('[WebRTC] Camera track đã stop thành công.')
          } catch (e) {
            console.warn('[WebRTC] Lỗi khi stop camera track:', e)
          }
          stream.removeTrack(track)
        })
        setLocalStream(new MediaStream(stream.getTracks()))
      }

      // Thông báo cho các Peer thay thế video sender thành null (không phát hình)
      peersRef.current.forEach((peer) => {
        const sender = findVideoSender(peer.pc)
        if (sender) {
          sender.replaceTrack(null).catch(() => {})
        }
      })

      setIsCamOn(false)
      toggleMedia(roomCode, isMicOn, false)
    } else {
      // ─── BẬT CAMERA: GỌI getUserMedia ĐỂ MỞ PHẦN CỨNG VÀ BẬT ĐÈN WEBCAM ───
      console.log('[WebRTC] Bật camera: Khởi tạo luồng video từ webcam')
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: false,
        })

        if (isUnmountedRef.current) {
          camStream.getTracks().forEach((t) => t.stop())
          return
        }

        const videoTrack = camStream.getVideoTracks()[0]
        if (!videoTrack) return

        let stream = localStreamRef.current
        if (!stream) {
          stream = new MediaStream()
          localStreamRef.current = stream
        }

        stream.addTrack(videoTrack)
        setLocalStream(new MediaStream(stream.getTracks()))

        // Cập nhật cho các Peer
        peersRef.current.forEach((peer) => {
          const sender = findVideoSender(peer.pc)
          if (sender) {
            sender.replaceTrack(videoTrack).catch((e) => console.warn('[WebRTC] replaceTrack error:', e))
          } else {
            peer.pc.addTrack(videoTrack, stream!)
          }
        })

        // Bắt sự kiện camera bị ngắt bất ngờ (rút webcam hoặc OS thu hồi quyền)
        videoTrack.onended = () => {
          console.log('[WebRTC] Video track onended được kích hoạt')
          if (localStreamRef.current) {
            localStreamRef.current.removeTrack(videoTrack)
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
          }
          setIsCamOn(false)
          toggleMedia(roomCode, isMicOn, false)
        }

        setIsCamOn(true)
        toggleMedia(roomCode, isMicOn, true)
      } catch (err: any) {
        if (isUnmountedRef.current) return
        console.warn('[WebRTC] Lỗi khi bật Camera:', err)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          onPermissionError?.('Bạn đã từ chối quyền truy cập Camera. Vui lòng cấp quyền trên trình duyệt để sử dụng.')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          onPermissionError?.('Không tìm thấy thiết bị Camera trên máy tính của bạn.')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          onPermissionError?.('Camera đang bị ứng dụng khác (Zoom, Teams, v.v.) chiếm dụng. Vui lòng đóng ứng dụng đó và thử lại.')
        } else {
          onPermissionError?.(`Không thể mở Camera: ${err.message || 'Lỗi thiết bị'}`)
        }
      }
    }
  }, [isCamOn, isMicOn, roomCode, onPermissionError])

  // ─── 7. CHIA SẺ MÀN HÌNH (SCREEN SHARE) ──────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      console.log('[WebRTC] Bắt đầu gọi getDisplayMedia để chia sẻ màn hình...')
      const sStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      })

      console.log('[WebRTC] Đã nhận được screen stream:', sStream.id, sStream.getTracks().map(t => `${t.kind}:${t.readyState}`))
      screenStreamRef.current = sStream
      setScreenStream(sStream)
      setIsSharingScreen(true)
      emitStartShare(roomCode)

      const screenVideoTrack = sStream.getVideoTracks()[0]
      if (screenVideoTrack) {
        // Thay thế hoặc thêm video track vào các peer connection hiện có
        peersRef.current.forEach((peer, targetSocketId) => {
          const videoSender = findVideoSender(peer.pc)
          if (videoSender) {
            console.log(`[WebRTC] Thay thế track video sang screen cho peer ${targetSocketId}`)
            videoSender.replaceTrack(screenVideoTrack)
          } else {
            console.log(`[WebRTC] Thêm track màn hình mới cho peer ${targetSocketId}`)
            peer.pc.addTrack(screenVideoTrack, sStream)
          }
        })

        // Lắng nghe khi người dùng dừng chia sẻ từ thanh điều khiển của trình duyệt
        screenVideoTrack.onended = () => {
          console.log('[WebRTC] Người dùng bấm dừng chia sẻ từ thanh trình duyệt')
          stopScreenShare()
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.info('[WebRTC] Người dùng đã từ chối/hủy chia sẻ màn hình.')
      } else if (err.name === 'AbortError') {
        console.info('[WebRTC] Thao tác chia sẻ màn hình bị hủy.')
      } else {
        console.error('[WebRTC] Lỗi khi chia sẻ màn hình:', err)
        onPermissionError?.(`Không thể chia sẻ màn hình: ${err.message || 'Lỗi không xác định'}`)
      }
    }
  }, [roomCode, onPermissionError])

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }

    setScreenStream(null)
    setIsSharingScreen(false)
    emitStopShare(roomCode)

    // Khôi phục lại video track từ Camera cho các peer (nếu camera đang bật)
    const cameraTrack = isCamOn ? (localStreamRef.current?.getVideoTracks()[0] || null) : null
    peersRef.current.forEach((peer) => {
      const videoSender = findVideoSender(peer.pc)
      if (videoSender) {
        videoSender.replaceTrack(cameraTrack).catch(() => {})
      }
    })
  }, [roomCode, isCamOn])

  // Lắng nghe khi bị host tắt mic
  useEffect(() => {
    const handleMutedByHost = () => {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0]
        if (audioTrack) audioTrack.enabled = false
      }
      setIsMicOn(false)
      onPermissionError?.('Bạn đã bị chủ phòng tắt micro.')
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
    isMicOn,
    isCamOn,
    isSharingScreen,
    isSpeaking,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    stopAllMedia,
  }
}
