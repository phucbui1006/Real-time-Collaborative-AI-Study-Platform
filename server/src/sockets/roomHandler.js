// server/src/sockets/roomHandler.js
// Quản lý vòng đời phòng học, phân quyền 3 vai trò (Host/Speaker/Viewer), kiểm tra mật khẩu & quyền sở hữu tài liệu

const { supabaseAdmin } = require('../config/supabase')
const { MAX_ROOM_MEMBERS } = require('../config/env')
const { verifyPassword } = require('../middlewares/authMiddleware')
const { loadRecentMessages } = require('./chatHandler')
const { deleteLiveKitRoom, removeParticipant, muteParticipantAudio } = require('../services/livekitService')

const MAX_PAGE_COUNT = 300
const MAX_PAGE_CHARS = 100000
const MAX_ANNOTATIONS_PER_PAGE = 500
const MAX_ANNOTATION_BYTES = 256 * 1024

// Bộ nhớ RAM lưu trữ trạng thái các phòng đang hoạt động
const activeRooms = new Map()
const docSaveTimers = new Map()
const annotationSaveTimers = new Map()
const roomCloseTimers = new Map()

function getActiveRooms() {
  return activeRooms
}

function findRoomBySocketId(socketId) {
  for (const [code, room] of activeRooms.entries()) {
    if (room.members.has(socketId)) {
      return { code, room }
    }
  }
  return null
}

function getMemberRole(room, socketId) {
  const member = room.members.get(socketId)
  if (!member) return null
  if (room.hostSocketId === socketId || (room.hostUserId && room.hostUserId === member.userId)) {
    return 'host'
  }
  return member.role || 'viewer'
}

function isHost(room, socketId) {
  return getMemberRole(room, socketId) === 'host'
}

function isHostOrSpeaker(room, socketId) {
  const role = getMemberRole(room, socketId)
  return role === 'host' || role === 'speaker'
}

/**
 * Cho phép Chủ phòng, Diễn giả, hoặc chính thành viên đang trình chiếu tài liệu đó điều khiển trang/chú thích/dừng chiếu
 */
function canControlDocument(room, socketId) {
  if (isHostOrSpeaker(room, socketId)) return true
  const member = room.members.get(socketId)
  if (!member || !room.activeDocument) return false
  if (room.activeDocument.presenterSocketId && room.activeDocument.presenterSocketId === socketId) {
    return true
  }
  if (
    room.activeDocument.presenterUserId &&
    member.userId &&
    room.activeDocument.presenterUserId === member.userId
  ) {
    return true
  }
  return false
}

/**
 * Chuẩn hóa pages_content từ DB hoặc payload client thành mảng chuỗi an toàn
 */
function normalizePagesArray(raw) {
  if (!raw) return []
  let arr = []
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        arr = parsed
      } else {
        arr = [trimmed]
      }
    } catch {
      arr = trimmed.includes('[[--PERMIND_PAGE_BREAK--]]')
        ? trimmed.split(/\[\[--PERMIND_PAGE_BREAK--\]\]/).map((p) => p.trim())
        : [trimmed]
    }
  }
  return arr
    .slice(0, MAX_PAGE_COUNT)
    .map((p) => String(p ?? '').slice(0, MAX_PAGE_CHARS))
}

function formatRoomState(room) {
  const docMeta = room.activeDocument
    ? {
        id: room.activeDocument.id,
        originalDocumentId: room.activeDocument.originalDocumentId,
        title: room.activeDocument.title,
        totalPages:
          room.activeDocument.totalPages ||
          (room.activeDocument.pagesContent ? room.activeDocument.pagesContent.length : 1),
        pagesContent: Array.isArray(room.activeDocument.pagesContent)
          ? room.activeDocument.pagesContent
          : [],
        currentPage: room.activeDocument.currentPage || 0,
        updatedAt: room.activeDocument.updatedAt,
        presenterSocketId: room.activeDocument.presenterSocketId || null,
        presenterUserId: room.activeDocument.presenterUserId || null,
        presenterName: room.activeDocument.presenterName || '',
      }
    : null

  const annotationsSnapshot = room.annotationsByPage ? { ...room.annotationsByPage } : {}

  return {
    code: room.code,
    name: room.name,
    hostUserId: room.hostUserId,
    hostSocketId: room.hostSocketId,
    members: Array.from(room.members.values()),
    activeDocument: docMeta,
    annotationsByPage: annotationsSnapshot,
    screenSharerSocketId: room.screenSharerSocketId,
    allowMemberScreenShare: room.allowMemberScreenShare,
    maxMembers: room.maxMembers,
  }
}

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function roomHandler(io, socket) {
  const handleRoomJoin = async ({ roomCode, password, user } = {}) => {
    try {
      const userId = socket.user?.id
      if (!userId) {
        return socket.emit('ERROR', { message: 'Yêu cầu đăng nhập trước khi vào phòng.', code: 'UNAUTHORIZED' })
      }

      if (!roomCode) {
        return socket.emit('ERROR', { message: 'Thông tin tham gia phòng không hợp lệ.' })
      }

      const cleanCode = String(roomCode).trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
      if (!cleanCode) {
        return socket.emit('ERROR', { message: 'Mã phòng không hợp lệ.' })
      }

      const rawName =
        user?.name ||
        socket.user?.user_metadata?.full_name ||
        socket.user?.email?.split('@')[0] ||
        'Thành viên'
      const userName = String(rawName).trim().slice(0, 60) || 'Thành viên'
      const avatarColor =
        typeof user?.avatarColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(user.avatarColor)
          ? user.avatarColor
          : '#0ea5e9'

      if (roomCloseTimers.has(cleanCode)) {
        clearTimeout(roomCloseTimers.get(cleanCode))
        roomCloseTimers.delete(cleanCode)
      }

      const { data: dbRoom, error: dbError } = await supabaseAdmin
        .from('rooms')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle()

      if (dbError || !dbRoom) {
        return socket.emit('ERROR', { message: 'Phòng học không tồn tại.' })
      }

      if (!dbRoom.is_active) {
        const isHostUser = Boolean(dbRoom.host_user_id) && dbRoom.host_user_id === userId
        if (isHostUser) {
          try {
            await supabaseAdmin.from('rooms').update({ is_active: true }).eq('id', dbRoom.id)
            dbRoom.is_active = true
          } catch {}
        } else {
          return socket.emit('ERROR', { message: 'Phòng học không tồn tại hoặc đã kết thúc.' })
        }
      }

      let room = activeRooms.get(cleanCode)
      if (room?.kickedUserIds?.has(userId)) {
        return socket.emit('ERROR', {
          message: 'Bạn đã bị mời ra khỏi phòng học này.',
          code: 'ROOM_KICKED',
        })
      }

      // Kiểm tra mật khẩu phòng nếu không phải Chủ phòng (hoặc chưa từng là thành viên hợp lệ trong phiên)
      const isOriginalHost = Boolean(dbRoom.host_user_id) && dbRoom.host_user_id === userId
      if (dbRoom.password_hash && !isOriginalHost) {
        let alreadyVerifiedMember = false
        const { data: existingMember } = await supabaseAdmin
          .from('room_members')
          .select('role')
          .eq('room_id', dbRoom.id)
          .eq('user_id', userId)
          .maybeSingle()
        if (existingMember) {
          alreadyVerifiedMember = true
        }

        if (!alreadyVerifiedMember && !verifyPassword(String(password || ''), dbRoom.password_hash)) {
          return socket.emit('ERROR', {
            message: 'Mật khẩu phòng không chính xác hoặc chưa được xác thực.',
            code: 'INVALID_ROOM_PASSWORD',
          })
        }
      }

      if (!room) {
        const isHostUser = dbRoom.host_user_id ? dbRoom.host_user_id === userId : true
        room = {
          code: cleanCode,
          name: dbRoom.name || 'Phòng học nhóm',
          dbRoomId: dbRoom.id,
          hostUserId: dbRoom.host_user_id || userId,
          hostSocketId: isHostUser ? socket.id : null,
          maxMembers: dbRoom.max_members || MAX_ROOM_MEMBERS || 6,
          allowMemberScreenShare: true,
          screenSharerSocketId: null,
          members: new Map(),
          kickedUserIds: new Set(),
          activeDocument: null,
          annotationsByPage: {},
        }

        try {
          const { data: roomDoc } = await supabaseAdmin
            .from('room_documents')
            .select('*')
            .eq('room_id', dbRoom.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (roomDoc) {
            room.activeDocument = {
              id: roomDoc.id,
              originalDocumentId: roomDoc.original_document_id,
              title: roomDoc.title,
              totalPages: roomDoc.total_pages,
              pagesContent: Array.isArray(roomDoc.pages_content) ? roomDoc.pages_content : [],
              currentPage: dbRoom.current_page || 0,
              updatedAt: roomDoc.updated_at,
            }
          }
        } catch (docErr) {
          console.warn('Lỗi đọc tài liệu phòng ban đầu:', docErr.message)
        }

        activeRooms.set(cleanCode, room)
      }

      if (room.members.size >= room.maxMembers && !room.members.has(socket.id)) {
        return socket.emit('ERROR', {
          message: `Phòng học đã đầy (tối đa ${room.maxMembers} thành viên).`,
          code: 'ROOM_FULL',
        })
      }

      // Chỉ công nhận Host khi khớp chính xác hostUserId (KHÔNG dùng !room.hostSocketId để tránh cướp quyền Host)
      const isHostUser = Boolean(room.hostUserId) && room.hostUserId === userId
      if (isHostUser) {
        room.hostSocketId = socket.id
      }

      const member = {
        socketId: socket.id,
        userId,
        userName,
        role: isHostUser ? 'host' : 'viewer',
        avatarColor,
        isMicOn: false,
        isCamOn: false,
        isScreenSharing: false,
        isSpeaking: false,
        isHandRaised: false,
        joinedAt: Date.now(),
      }

      room.members.set(socket.id, member)
      socket.join(cleanCode)

      console.log(`👤 ${userName} (${member.role}) đã vào phòng ${cleanCode} [${room.members.size}/${room.maxMembers}]`)

      socket.to(cleanCode).emit('ROOM:MEMBER_JOINED', member)
      socket.emit('ROOM:STATE', formatRoomState(room))

      const recentMsgs = await loadRecentMessages(room.dbRoomId)
      socket.emit('CHAT:HISTORY', recentMsgs)

      if (room.dbRoomId && userId) {
        try {
          await supabaseAdmin.from('room_members').upsert({
            room_id: room.dbRoomId,
            user_id: userId,
            user_name: userName,
            role: member.role,
            avatar_color: avatarColor,
            is_online: true,
            is_hand_raised: false,
            joined_at: new Date(),
          })
        } catch {}
      }
    } catch (err) {
      console.error('Lỗi khi tham gia phòng:', err)
      socket.emit('ERROR', { message: 'Có lỗi xảy ra khi vào phòng học.' })
    }
  }

  socket.on('ROOM:JOIN', handleRoomJoin)

  const handleLeave = async (roomCode) => {
    let targetCode = roomCode
    let room = targetCode ? activeRooms.get(targetCode) : null

    if (!room) {
      const found = findRoomBySocketId(socket.id)
      if (found) {
        targetCode = found.code
        room = found.room
      }
    }

    if (!room || !room.members.has(socket.id)) return

    const leavingMember = room.members.get(socket.id)
    room.members.delete(socket.id)
    socket.leave(targetCode)

    console.log(`🚪 ${leavingMember.userName} đã rời phòng ${targetCode}`)

    if (room.screenSharerSocketId === socket.id) {
      room.screenSharerSocketId = null
    }

    io.to(targetCode).emit('ROOM:MEMBER_LEFT', {
      socketId: socket.id,
      userId: leavingMember.userId,
    })

    if (room.hostSocketId === socket.id) {
      if (room.members.size > 0) {
        const sortedMembers = Array.from(room.members.values()).sort((a, b) => a.joinedAt - b.joinedAt)
        const newHost = sortedMembers[0]
        newHost.role = 'host'
        room.hostSocketId = newHost.socketId
        room.hostUserId = newHost.userId

        io.to(targetCode).emit('ROOM:HOST_CHANGED', {
          newHostUserId: newHost.userId,
          newHostSocketId: newHost.socketId,
        })
        io.to(targetCode).emit('ROOM:MEMBER_UPDATED', {
          socketId: newHost.socketId,
          role: 'host',
        })
        io.to(targetCode).emit('ROOM:STATE', formatRoomState(room))

        if (room.dbRoomId) {
          try {
            await supabaseAdmin.from('rooms').update({ host_user_id: newHost.userId }).eq('id', room.dbRoomId)
            await supabaseAdmin
              .from('room_members')
              .update({ role: 'host' })
              .eq('room_id', room.dbRoomId)
              .eq('user_id', newHost.userId)
          } catch {}
        }
      } else {
        if (roomCloseTimers.has(targetCode)) {
          clearTimeout(roomCloseTimers.get(targetCode))
        }

        const closeTimer = setTimeout(async () => {
          const currRoom = activeRooms.get(targetCode)
          if (currRoom && currRoom.members.size === 0) {
            if (currRoom.dbRoomId) {
              try {
                await supabaseAdmin.from('rooms').update({ is_active: false }).eq('id', currRoom.dbRoomId)
              } catch {}
            }

            if (currRoom.activeDocument?.id) {
              const saveKey = `${targetCode}_${currRoom.activeDocument.id}`
              if (docSaveTimers.has(saveKey)) {
                clearTimeout(docSaveTimers.get(saveKey))
                docSaveTimers.delete(saveKey)
              }
            }

            activeRooms.delete(targetCode)
            deleteLiveKitRoom(targetCode)
          }
          roomCloseTimers.delete(targetCode)
        }, 30000)

        roomCloseTimers.set(targetCode, closeTimer)
      }
    }
  }

  socket.on('ROOM:LEAVE', ({ roomCode } = {}) => handleLeave(roomCode))
  socket.on('disconnect', () => handleLeave(null))

  socket.on('ROOM:MEDIA_TOGGLE', ({ roomCode, isMicOn, isCamOn } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id)) return

    const member = room.members.get(socket.id)

    if (isMicOn === true && !isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Bạn đang là Người xem (Viewer). Vui lòng giơ tay để Chủ phòng cấp quyền phát biểu.',
        code: 'FORBIDDEN',
      })
    }

    if (typeof isMicOn === 'boolean') member.isMicOn = isMicOn
    if (typeof isCamOn === 'boolean') member.isCamOn = isCamOn

    io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
      socketId: socket.id,
      isMicOn: member.isMicOn,
      isCamOn: member.isCamOn,
    })
  })

  socket.on('ROOM:SPEAKING_STATE', ({ roomCode, isSpeaking } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id)) return

    const member = room.members.get(socket.id)
    member.isSpeaking = Boolean(isSpeaking)

    io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
      socketId: socket.id,
      isSpeaking: member.isSpeaking,
    })
  })

  socket.on('ROOM:RAISE_HAND', ({ roomCode, isRaised } = {}) => {
    if (!roomCode) return
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id)) return

    const member = room.members.get(socket.id)
    member.isHandRaised = Boolean(isRaised)

    io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
      socketId: socket.id,
      isHandRaised: member.isHandRaised,
    })
  })

  socket.on('ROOM:SET_ROLE', async ({ roomCode, targetSocketId, role } = {}) => {
    try {
      if (!roomCode || !targetSocketId || !['speaker', 'viewer'].includes(role)) return
      const room = activeRooms.get(roomCode)
      if (!room || !room.members.has(socket.id)) return

      if (!isHost(room, socket.id)) {
        return socket.emit('ERROR', {
          message: 'Chỉ Chủ phòng mới có quyền phân vai trò thành viên.',
          code: 'FORBIDDEN',
        })
      }

      if (targetSocketId === socket.id) return
      const targetMember = room.members.get(targetSocketId)
      if (!targetMember) return

      targetMember.role = role

      if (role === 'viewer') {
        targetMember.isHandRaised = false
        if (targetMember.isMicOn || targetMember.isCamOn) {
          targetMember.isMicOn = false
          targetMember.isCamOn = false
          io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
            socketId: targetSocketId,
            isMicOn: false,
            isCamOn: false,
          })
          io.to(targetSocketId).emit('ROOM:MUTED_BY_HOST')
          muteParticipantAudio(roomCode, targetSocketId)
        }
        if (room.screenSharerSocketId === targetSocketId) {
          room.screenSharerSocketId = null
          targetMember.isScreenSharing = false
          io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
            socketId: targetSocketId,
            isScreenSharing: false,
          })
          io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
        }
      }

      io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
        socketId: targetSocketId,
        role: targetMember.role,
        isHandRaised: targetMember.isHandRaised,
      })
      io.to(roomCode).emit('ROOM:ROLE_CHANGED', {
        targetSocketId,
        role,
        targetUserName: targetMember.userName,
      })

      if (room.dbRoomId && targetMember.userId) {
        try {
          await supabaseAdmin
            .from('room_members')
            .update({ role })
            .eq('room_id', room.dbRoomId)
            .eq('user_id', targetMember.userId)
        } catch {}
      }
    } catch (err) {
      console.error('Lỗi ROOM:SET_ROLE:', err)
    }
  })

  socket.on('ROOM:SCREEN_SHARE_START', ({ roomCode } = {}, ack) => {
    const reply = (ok, message, code) => {
      if (typeof ack === 'function') {
        ack({ ok, message })
      } else if (!ok && message) {
        socket.emit('ERROR', { message, code })
      }
    }

    const room = activeRooms.get(roomCode)
    if (!room) return reply(false, 'Phòng học không tồn tại hoặc đã kết thúc.')

    let member = room.members.get(socket.id)
    if (!member && socket.user?.id) {
      const currentUserId = socket.user.id
      for (const m of room.members.values()) {
        if (m.userId === currentUserId) {
          room.members.delete(m.socketId)
          m.socketId = socket.id
          room.members.set(socket.id, m)
          member = m
          break
        }
      }
    }

    if (!member) return reply(false, 'Bạn chưa tham gia phòng học này.')

    if (member.role !== 'host' && !room.allowMemberScreenShare) {
      return reply(false, 'Chủ phòng đã tắt quyền chia sẻ màn hình của thành viên.', 'FORBIDDEN')
    }

    if (room.screenSharerSocketId && room.screenSharerSocketId !== socket.id) {
      const sharer = room.members.get(room.screenSharerSocketId)
      if (sharer) {
        return reply(false, `Hiện tại ${sharer.userName || 'thành viên khác'} đang chia sẻ màn hình.`)
      }
      room.screenSharerSocketId = null
    }

    room.screenSharerSocketId = socket.id
    member.isScreenSharing = true

    io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
      socketId: socket.id,
      isScreenSharing: true,
    })
    io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
    reply(true)
  })

  socket.on('ROOM:SCREEN_SHARE_STOP', ({ roomCode } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (room.screenSharerSocketId === socket.id) {
      room.screenSharerSocketId = null
      const member = room.members.get(socket.id)
      if (member) member.isScreenSharing = false

      io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
        socketId: socket.id,
        isScreenSharing: false,
      })
      io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
    }
  })

  socket.on('ROOM:MUTE_MEMBER', ({ roomCode, targetSocketId } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền tắt micro thành viên.',
        code: 'FORBIDDEN',
      })
    }

    const targetMember = room.members.get(targetSocketId)
    if (targetMember) {
      targetMember.isMicOn = false
      io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
        socketId: targetSocketId,
        isMicOn: false,
      })
      io.to(targetSocketId).emit('ROOM:MUTED_BY_HOST')
      muteParticipantAudio(roomCode, targetSocketId)
    }
  })

  socket.on('ROOM:KICK_MEMBER', async ({ roomCode, targetSocketId } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền mời thành viên ra khỏi phòng.',
        code: 'FORBIDDEN',
      })
    }

    if (!targetSocketId || targetSocketId === socket.id) return
    const targetMember = room.members.get(targetSocketId)
    if (!targetMember) return

    room.members.delete(targetSocketId)
    if (targetMember.userId) {
      room.kickedUserIds.add(targetMember.userId)
    }
    if (room.screenSharerSocketId === targetSocketId) {
      room.screenSharerSocketId = null
    }

    io.to(targetSocketId).emit('ROOM:KICKED', { reason: 'Chủ phòng đã mời bạn rời khỏi phòng học.' })

    // Đuổi thực sự socket ra khỏi room Socket.io
    const targetSocket = io.sockets.sockets.get(targetSocketId)
    if (targetSocket) {
      targetSocket.leave(roomCode)
    }

    // Ngắt participant khỏi LiveKit SFU
    removeParticipant(roomCode, targetSocketId)
    if (targetMember.userId) {
      removeParticipant(roomCode, targetMember.userId)
    }

    // Xóa bản ghi member khỏi DB để không xin lại được token LiveKit
    if (room.dbRoomId && targetMember.userId) {
      try {
        await supabaseAdmin
          .from('room_members')
          .delete()
          .eq('room_id', room.dbRoomId)
          .eq('user_id', targetMember.userId)
      } catch {}
    }

    io.to(roomCode).emit('ROOM:MEMBER_LEFT', {
      socketId: targetSocketId,
      userId: targetMember.userId,
      reason: 'kicked',
    })
  })

  socket.on('ROOM:TRANSFER_HOST', async ({ roomCode, targetSocketId } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền chuyển giao quyền Chủ phòng.',
        code: 'FORBIDDEN',
      })
    }

    if (!targetSocketId || targetSocketId === socket.id) return
    const targetMember = room.members.get(targetSocketId)
    if (targetMember) {
      const oldHost = room.members.get(socket.id)
      if (oldHost) oldHost.role = 'speaker'
      targetMember.role = 'host'
      room.hostSocketId = targetSocketId
      room.hostUserId = targetMember.userId

      io.to(roomCode).emit('ROOM:HOST_CHANGED', {
        newHostUserId: targetMember.userId,
        newHostSocketId: targetSocketId,
      })
      io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
        socketId: targetSocketId,
        role: 'host',
      })
      if (oldHost) {
        io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
          socketId: socket.id,
          role: 'speaker',
        })
      }
      io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))

      if (room.dbRoomId) {
        try {
          await supabaseAdmin.from('rooms').update({ host_user_id: targetMember.userId }).eq('id', room.dbRoomId)
          await supabaseAdmin
            .from('room_members')
            .update({ role: 'host' })
            .eq('room_id', room.dbRoomId)
            .eq('user_id', targetMember.userId)
        } catch {}
      }
    }
  })

  socket.on('ROOM:TOGGLE_SCREEN_PERMISSION', ({ roomCode, allow } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền điều chỉnh quyền chia sẻ.',
        code: 'FORBIDDEN',
      })
    }

    room.allowMemberScreenShare = Boolean(allow)
    io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
  })

  socket.on('ROOM:CLOSE', async ({ roomCode } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền đóng phòng học.',
        code: 'FORBIDDEN',
      })
    }

    console.log(`🔒 Chủ phòng đã đóng phòng ${roomCode}`)
    io.to(roomCode).emit('ROOM:CLOSED', { reason: 'Chủ phòng đã kết thúc buổi học.' })

    if (roomCloseTimers.has(roomCode)) {
      clearTimeout(roomCloseTimers.get(roomCode))
      roomCloseTimers.delete(roomCode)
    }
    for (const [key, timer] of docSaveTimers.entries()) {
      if (key.startsWith(`${roomCode}_`)) {
        clearTimeout(timer)
        docSaveTimers.delete(key)
      }
    }

    await deleteLiveKitRoom(roomCode)

    try {
      io.in(roomCode).socketsLeave(roomCode)
    } catch {}

    if (room.dbRoomId) {
      try {
        await supabaseAdmin.from('rooms').delete().eq('id', room.dbRoomId)
      } catch {
        try {
          await supabaseAdmin.from('rooms').update({ is_active: false }).eq('id', room.dbRoomId)
        } catch {}
      }
    }

    activeRooms.delete(roomCode)
  })

  socket.on('DOC:SELECT', async ({ roomCode, documentId, docData } = {}) => {
    try {
      const room = activeRooms.get(roomCode)
      if (!room) {
        return socket.emit('ERROR', { message: 'Phòng học không tồn tại.' })
      }

      // Cho phép cả Chủ phòng và bất kỳ thành viên nào đang trong phòng trình chiếu tài liệu
      let member = room.members.get(socket.id)
      if (!member && socket.user?.id) {
        for (const m of room.members.values()) {
          if (m.userId === socket.user.id) {
            room.members.delete(m.socketId)
            m.socketId = socket.id
            room.members.set(socket.id, m)
            member = m
            break
          }
        }
      }
      if (!member) {
        return socket.emit('ERROR', {
          message: 'Bạn cần tham gia phòng học để trình chiếu tài liệu.',
          code: 'FORBIDDEN',
        })
      }

      // 1. Ưu tiên nội dung trang do client gửi kèm (đã được nạp từ Thư viện hoặc tài liệu mẫu)
      const clientPages = docData ? normalizePagesArray(docData.pagesContent) : []
      let sourceDoc = null

      if (typeof documentId === 'number' && Number.isInteger(documentId) && documentId > 0) {
        const { data: foundDoc } = await supabaseAdmin
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .maybeSingle()

        if (foundDoc) {
          const isDocOwnerOrPublic =
            !foundDoc.owner_user_id || foundDoc.owner_user_id === socket.user?.id
          if (isDocOwnerOrPublic) {
            const dbPages = normalizePagesArray(foundDoc.pages_content)
            sourceDoc = {
              id: foundDoc.id,
              original_name:
                docData?.title || foundDoc.original_name || foundDoc.filename || 'Tài liệu bài giảng',
              filename: foundDoc.filename || docData?.title || 'Tài liệu bài giảng',
              total_pages:
                (clientPages.length > 0 ? clientPages.length : dbPages.length) ||
                foundDoc.total_pages ||
                1,
              pages_content: clientPages.length > 0 ? clientPages : dbPages,
            }
          }
        }
      }

      // 2. Fallback docData trực tiếp từ client (tài liệu mẫu hoặc tài liệu cục bộ)
      if (!sourceDoc && docData) {
        const fallbackPages =
          clientPages.length > 0
            ? clientPages
            : [`# ${String(docData.title || 'Tài liệu bài giảng').slice(0, 200)}\n\nNội dung tài liệu học tập.`]
        sourceDoc = {
          id: typeof documentId === 'number' ? documentId : Date.now(),
          original_name: String(docData.title || 'Tài liệu bài giảng').slice(0, 200),
          filename: String(docData.title || 'Tài liệu bài giảng').slice(0, 200),
          total_pages: fallbackPages.length || 1,
          pages_content: fallbackPages,
        }
      }

      if (!sourceDoc) {
        return socket.emit('ERROR', { message: 'Không tìm thấy tài liệu trong kho lưu trữ.' })
      }

      const pages = normalizePagesArray(sourceDoc.pages_content)
      const safePages =
        pages.length > 0
          ? pages
          : [`# ${sourceDoc.original_name || 'Tài liệu bài giảng'}\n\nNội dung tài liệu học tập.`]

      const presenterUserId = socket.user?.id || member.userId || null
      const presenterName = member.userName || 'Thành viên'

      let roomDocData = null
      if (room.dbRoomId) {
        try {
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from('room_documents')
            .insert({
              room_id: room.dbRoomId,
              original_document_id:
                typeof sourceDoc.id === 'number' && sourceDoc.id > 0 ? sourceDoc.id : null,
              title: sourceDoc.original_name || sourceDoc.filename || 'Tài liệu bài giảng',
              total_pages: safePages.length || sourceDoc.total_pages || 1,
              pages_content: safePages,
              updated_at: new Date(),
            })
            .select()
            .single()

          if (!insertError && inserted) {
            const insertedPages = normalizePagesArray(inserted.pages_content)
            roomDocData = {
              id: inserted.id,
              originalDocumentId: sourceDoc.id,
              title: inserted.title,
              totalPages: inserted.total_pages || safePages.length,
              pagesContent: insertedPages.length > 0 ? insertedPages : safePages,
              currentPage: 0,
              updatedAt: inserted.updated_at,
              presenterSocketId: socket.id,
              presenterUserId,
              presenterName,
            }
            // Đồng bộ current_document_id và current_page lên bảng rooms
            try {
              await supabaseAdmin
                .from('rooms')
                .update({ current_document_id: inserted.id, current_page: 0 })
                .eq('id', room.dbRoomId)
            } catch {}
          }
        } catch (dbErr) {
          console.warn('Không thể lưu room_documents vào DB:', dbErr.message)
        }
      }

      if (!roomDocData) {
        roomDocData = {
          id: typeof sourceDoc.id === 'number' ? sourceDoc.id : Date.now(),
          originalDocumentId: sourceDoc.id,
          title: sourceDoc.original_name || sourceDoc.filename || 'Tài liệu bài giảng',
          totalPages: safePages.length || sourceDoc.total_pages || 1,
          pagesContent: safePages,
          currentPage: 0,
          updatedAt: new Date().toISOString(),
          presenterSocketId: socket.id,
          presenterUserId,
          presenterName,
        }
      }

      room.activeDocument = roomDocData
      room.annotationsByPage = {}

      const stateSnapshot = formatRoomState(room)
      io.to(roomCode).emit('DOC:SYNC', stateSnapshot.activeDocument)
      io.to(roomCode).emit('ROOM:STATE', stateSnapshot)
    } catch (err) {
      console.error('Lỗi chọn tài liệu:', err)
      socket.emit('ERROR', { message: 'Không thể mở tài liệu trình chiếu.' })
    }
  })

  socket.on('DOC:STOP', ({ roomCode } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!canControlDocument(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng hoặc người đang trình chiếu mới có quyền dừng chiếu tài liệu.',
        code: 'FORBIDDEN',
      })
    }

    room.activeDocument = null
    room.annotationsByPage = {}
    io.to(roomCode).emit('DOC:SYNC', null)
    io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
  })

  socket.on('DOC:CHANGE_PAGE', ({ roomCode, pageIndex } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!canControlDocument(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng, Diễn giả hoặc người đang trình chiếu mới có quyền lật trang.',
        code: 'FORBIDDEN',
      })
    }

    if (!room.activeDocument) return

    const maxPage = Math.max(
      0,
      (room.activeDocument.totalPages || room.activeDocument.pagesContent?.length || 1) - 1
    )
    const numPage = Number(pageIndex)
    if (!Number.isInteger(numPage)) return
    const validPage = Math.max(0, Math.min(maxPage, numPage))

    room.activeDocument.currentPage = validPage

    io.to(roomCode).emit('DOC:PAGE_CHANGED', {
      pageIndex: validPage,
      by: socket.id,
    })

    if (room.dbRoomId) {
      supabaseAdmin.from('rooms').update({ current_page: validPage }).eq('id', room.dbRoomId).catch(() => {})
    }
  })

  socket.on('DOC:EDIT_PAGE', ({ roomCode, pageIndex, content } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!canControlDocument(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng, Diễn giả hoặc người đang trình chiếu mới có quyền chỉnh sửa tài liệu.',
        code: 'FORBIDDEN',
      })
    }

    if (!room.activeDocument || typeof content !== 'string') return

    const idx = Number(pageIndex)
    const maxPages = Math.max(room.activeDocument.totalPages || 1, room.activeDocument.pagesContent?.length || 1)
    if (!Number.isInteger(idx) || idx < 0 || idx >= Math.min(maxPages, MAX_PAGE_COUNT)) {
      return
    }
    if (content.length > MAX_PAGE_CHARS) {
      return socket.emit('ERROR', { message: 'Nội dung trang vượt quá độ dài cho phép.' })
    }

    if (!room.activeDocument.pagesContent) {
      room.activeDocument.pagesContent = []
    }
    room.activeDocument.pagesContent[idx] = content
    room.activeDocument.updatedAt = new Date().toISOString()

    io.to(roomCode).emit('DOC:PAGE_UPDATED', {
      pageIndex: idx,
      content,
      by: socket.id,
    })

    const saveKey = `${roomCode}_${room.activeDocument.id}`
    if (docSaveTimers.has(saveKey)) {
      clearTimeout(docSaveTimers.get(saveKey))
    }
    const timer = setTimeout(async () => {
      try {
        if (room.activeDocument?.id) {
          await supabaseAdmin
            .from('room_documents')
            .update({
              pages_content: room.activeDocument.pagesContent,
              updated_at: new Date(),
            })
            .eq('id', room.activeDocument.id)
        }
      } catch (err) {
        console.warn('Lỗi lưu trang tài liệu Supabase:', err.message)
      } finally {
        docSaveTimers.delete(saveKey)
      }
    }, 500)
    docSaveTimers.set(saveKey, timer)
  })

  socket.on('DOC:ANNOTATE', ({ roomCode, pageIndex, annotations } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!canControlDocument(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng, Diễn giả hoặc người đang trình chiếu mới có quyền chú thích lên tài liệu.',
        code: 'FORBIDDEN',
      })
    }

    const idx = Number(pageIndex)
    if (!Number.isInteger(idx) || idx < 0 || idx > MAX_PAGE_COUNT) return
    if (!Array.isArray(annotations) || annotations.length > MAX_ANNOTATIONS_PER_PAGE) return

    try {
      if (Buffer.byteLength(JSON.stringify(annotations), 'utf8') > MAX_ANNOTATION_BYTES) return
    } catch {
      return
    }

    if (!room.annotationsByPage) {
      room.annotationsByPage = {}
    }
    room.annotationsByPage[idx] = annotations

    io.to(roomCode).emit('DOC:ANNOTATE', {
      pageIndex: idx,
      annotations: room.annotationsByPage[idx],
      by: socket.id,
    })

    // Debounce ghi chú thích xuống Supabase 1.5s sau nét vẽ cuối cùng để tránh quá tải DB
    if (room.activeDocument?.id) {
      const annoKey = `${roomCode}_${room.activeDocument.id}_${idx}`
      if (annotationSaveTimers.has(annoKey)) {
        clearTimeout(annotationSaveTimers.get(annoKey))
      }
      const timer = setTimeout(async () => {
        try {
          if (room.activeDocument?.id && room.annotationsByPage?.[idx]) {
            await supabaseAdmin.from('room_annotations').upsert(
              {
                room_document_id: room.activeDocument.id,
                page_index: idx,
                annotations: room.annotationsByPage[idx],
                updated_at: new Date(),
              },
              { onConflict: 'room_document_id,page_index' }
            )
          }
        } catch {
          // Bỏ qua nếu bảng room_annotations không tồn tại hoặc lỗi tạm thời
        } finally {
          annotationSaveTimers.delete(annoKey)
        }
      }, 1500)
      annotationSaveTimers.set(annoKey, timer)
    }
  })

  socket.on('DOC:CLEAR_ANNOTATIONS', ({ roomCode, pageIndex } = {}) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!canControlDocument(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng, Diễn giả hoặc người đang trình chiếu mới có quyền xóa chú thích.',
        code: 'FORBIDDEN',
      })
    }

    if (!room.annotationsByPage) {
      room.annotationsByPage = {}
    }
    if (pageIndex !== undefined && pageIndex !== null) {
      const idx = Number(pageIndex)
      if (!Number.isInteger(idx) || idx < 0 || idx > MAX_PAGE_COUNT) return
      delete room.annotationsByPage[idx]
      io.to(roomCode).emit('DOC:CLEAR_ANNOTATIONS', { pageIndex: idx })
    } else {
      room.annotationsByPage = {}
      io.to(roomCode).emit('DOC:CLEAR_ANNOTATIONS', {})
    }
  })

  socket.on('JOIN_ROOM', (payload) => handleRoomJoin(payload))
}

module.exports = {
  roomHandler,
  getActiveRooms,
}
