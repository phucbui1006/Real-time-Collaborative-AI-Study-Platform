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

  // ─── 1. KHỞI TẠO LOCAL MEDIA STREAM (MIC + CAM BAN ĐẦU TẮT ĐỂ TIẾT KIỆM BĂNG THÔNG) ───
  const initLocalMedia = useCallback(async () => {
    try {
      // Yêu cầu quyền truy cập cơ bản (mặc định mic/cam tắt track để người dùng chủ động bật)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        },
      })

      // Mặc định ban đầu tắt track mic và cam
      stream.getAudioTracks().forEach((t) => (t.enabled = false))
      stream.getVideoTracks().forEach((t) => (t.enabled = false))

      localStreamRef.current = stream
      setLocalStream(stream)
      setIsMicOn(false)
      setIsCamOn(false)
      toggleMedia(roomCode, false, false)

      return stream
    } catch (err: any) {
      console.warn('Chưa cấp quyền truy cập camera/micro ban đầu:', err.name)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        onPermissionError?.('Bạn đã từ chối quyền Camera/Micro. Vui lòng nhấn vào biểu tượng ổ khóa trên thanh địa chỉ để cấp quyền.')
      } else if (err.name === 'NotFoundError') {
        onPermissionError?.('Không tìm thấy thiết bị Microphone hoặc Camera trên máy tính của bạn.')
      }
      return null
    }
  }, [roomCode, onPermissionError])

  useEffect(() => {
    initLocalMedia()
    return () => {
      // Dọn dẹp local streams khi component unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
      if (vadIntervalRef.current) {
        window.clearInterval(vadIntervalRef.current)
      }
    }
  }, [initLocalMedia])

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

      // Thêm local tracks vào kết nối
      const streamToAdd = localStreamRef.current
      if (streamToAdd) {
        streamToAdd.getTracks().forEach((track) => pc.addTrack(track, streamToAdd))
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

  // ─── 6. BẬT/TẮT MICRO VÀ CAMERA ──────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    let stream = localStreamRef.current
    if (!stream) {
      stream = await initLocalMedia()
      if (!stream) return
    }

    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      const nextState = !audioTrack.enabled
      audioTrack.enabled = nextState
      setIsMicOn(nextState)
      toggleMedia(roomCode, nextState, isCamOn)
    }
  }, [roomCode, isCamOn, initLocalMedia])

  const toggleCam = useCallback(async () => {
    let stream = localStreamRef.current
    if (!stream) {
      stream = await initLocalMedia()
      if (!stream) return
    }

    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      const nextState = !videoTrack.enabled
      videoTrack.enabled = nextState
      setIsCamOn(nextState)
      toggleMedia(roomCode, isMicOn, nextState)
    }
  }, [roomCode, isMicOn, initLocalMedia])

  // ─── 7. CHIA SẺ MÀN HÌNH (SCREEN SHARE) ──────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const sStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      })

      screenStreamRef.current = sStream
      setScreenStream(sStream)
      setIsSharingScreen(true)
      emitStartShare(roomCode)

      const screenVideoTrack = sStream.getVideoTracks()[0]

      // Thay thế hoặc thêm video track vào các peer connection hiện có
      peersRef.current.forEach((peer) => {
        const senders = peer.pc.getSenders()
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
        if (videoSender) {
          videoSender.replaceTrack(screenVideoTrack)
        } else {
          peer.pc.addTrack(screenVideoTrack, sStream)
        }
      })

      // Lắng nghe khi người dùng dừng chia sẻ từ thanh điều khiển của trình duyệt
      screenVideoTrack.onended = () => {
        stopScreenShare()
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Lỗi khi chia sẻ màn hình:', err)
      }
    }
  }, [roomCode])

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }

    setScreenStream(null)
    setIsSharingScreen(false)
    emitStopShare(roomCode)

    // Khôi phục lại video track từ Camera cho các peer
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null
    peersRef.current.forEach((peer) => {
      const videoSender = peer.pc.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack)
      }
    })
  }, [roomCode])

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
  }
}
