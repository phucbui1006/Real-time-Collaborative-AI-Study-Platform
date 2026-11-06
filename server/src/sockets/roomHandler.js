// server/src/sockets/roomHandler.js
// Quản lý toàn diện vòng đời phòng học, phân quyền 3 vai trò (Host/Speaker/Viewer),
// lazy load tài liệu và kiểm tra quyền server-side cho mọi hành động nhạy cảm

const { supabaseAdmin } = require('../config/supabase')
const { MAX_ROOM_MEMBERS } = require('../config/env')
const { loadRecentMessages } = require('./chatHandler')

// Bộ nhớ RAM lưu trữ trạng thái các phòng đang hoạt động
// Map<roomCode, RoomState>
const activeRooms = new Map()

// Quản lý debounce lưu DB khi sửa tài liệu
const docSaveTimers = new Map()

/**
 * Trả về danh sách activeRooms dùng chung cho các handler khác (WebRTC, Chat)
 */
function getActiveRooms() {
  return activeRooms
}

/**
 * Tìm phòng mà socket đang tham gia
 * @param {string} socketId 
 */
function findRoomBySocketId(socketId) {
  for (const [code, room] of activeRooms.entries()) {
    if (room.members.has(socketId)) {
      return { code, room }
    }
  }
  return null
}

/**
 * Lấy vai trò thực tế của socket trong phòng ('host' | 'speaker' | 'viewer')
 */
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
 * Lấy snapshot trạng thái phòng để gửi cho client
 * Tối ưu hóa: Chỉ gửi metadata của tài liệu và snapshot chú thích trang hiện tại
 * @param {any} room 
 */
function formatRoomState(room) {
  // Chỉ gửi metadata của tài liệu, TUYỆT ĐỐI không gửi mảng pagesContent qua socket
  const docMeta = room.activeDocument
    ? {
        id: room.activeDocument.id,
        originalDocumentId: room.activeDocument.originalDocumentId,
        title: room.activeDocument.title,
        totalPages: room.activeDocument.totalPages || (room.activeDocument.pagesContent ? room.activeDocument.pagesContent.length : 1),
        currentPage: room.activeDocument.currentPage || 0,
        updatedAt: room.activeDocument.updatedAt,
      }
    : null

  // Người mới vào chỉ nhận snapshot chú thích của trang hiện tại đang chiếu
  const currPage = room.activeDocument ? (room.activeDocument.currentPage || 0) : 0
  const annotationsSnapshot = room.annotationsByPage && room.annotationsByPage[currPage]
    ? { [currPage]: room.annotationsByPage[currPage] }
    : {}

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
 * Đăng ký các sự kiện quản lý phòng học
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
function roomHandler(io, socket) {
  // ─── 1. THAM GIA PHÒNG HỌC (ROOM:JOIN) ──────────────────────────────────
  socket.on('ROOM:JOIN', async ({ roomCode, user }) => {
    try {
      if (!roomCode || !user) {
        return socket.emit('ERROR', { message: 'Thông tin tham gia phòng không hợp lệ.' })
      }

      const cleanCode = String(roomCode).trim()
      const userId = socket.user?.id || user.id
      const userName = user.name || socket.user?.user_metadata?.full_name || socket.user?.email || 'Thành viên'
      const avatarColor = user.avatarColor || '#0ea5e9'

      // Kiểm tra trong database
      const { data: dbRoom, error: dbError } = await supabaseAdmin
        .from('rooms')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle()

      if (dbError || !dbRoom) {
        return socket.emit('ERROR', { message: 'Phòng học không tồn tại hoặc đã kết thúc.' })
      }

      let room = activeRooms.get(cleanCode)

      // Khởi tạo phòng trong RAM nếu người đầu tiên vào
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
          activeDocument: null,
          annotationsByPage: {},
        }

        // Tải tài liệu của phòng nếu đã có sẵn trong DB (bảng room_documents)
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

      // Kiểm tra sĩ số phòng
      if (room.members.size >= room.maxMembers && !room.members.has(socket.id)) {
        return socket.emit('ERROR', {
          message: `Phòng học đã đầy (tối đa ${room.maxMembers} thành viên).`,
          code: 'ROOM_FULL',
        })
      }

      // Xác định vai trò: người tạo phòng là 'host', thành viên vào sau là 'viewer'
      const isHostUser = room.hostUserId === userId || !room.hostSocketId
      if (isHostUser) {
        room.hostUserId = userId
        room.hostSocketId = socket.id
      }

      const member = {
        socketId: socket.id,
        userId,
        userName,
        role: isHostUser ? 'host' : 'viewer', // 3 vai trò: host | speaker | viewer
        avatarColor,
        isMicOn: false,
        isCamOn: false,
        isScreenSharing: false,
        isSpeaking: false,
        isHandRaised: false, // Quản lý trạng thái giơ tay
        joinedAt: Date.now(),
      }

      room.members.set(socket.id, member)
      socket.join(cleanCode)

      console.log(`👤 ${userName} (${member.role}) đã vào phòng ${cleanCode} [${room.members.size}/${room.maxMembers}]`)

      // Thông báo cho các thành viên khác
      socket.to(cleanCode).emit('ROOM:MEMBER_JOINED', member)

      // Gửi snapshot trạng thái phòng (metadata tài liệu + snapshot annotation trang hiện tại)
      socket.emit('ROOM:STATE', formatRoomState(room))

      // Gửi lịch sử tin nhắn
      const recentMsgs = await loadRecentMessages(room.dbRoomId)
      socket.emit('CHAT:HISTORY', recentMsgs)

      // Đồng bộ thông tin thành viên vào bảng room_members
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
  })

  // ─── 2. RỜI PHÒNG HỌC HOẶC MẤT KẾT NỐI ─────────────────────────────────
  const handleLeave = async (roomCode, explicit = false) => {
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

    // Nếu người rời đang chia sẻ màn hình thì hủy share
    if (room.screenSharerSocketId === socket.id) {
      room.screenSharerSocketId = null
    }

    // Thông báo cho mọi người thành viên đã rời
    io.to(targetCode).emit('ROOM:MEMBER_LEFT', {
      socketId: socket.id,
      userId: leavingMember.userId,
    })

    // Xử lý chính sách chuyển giao Host khi chủ phòng rời (HOST_LEAVE_POLICY: transfer_to_oldest)
    if (room.hostSocketId === socket.id) {
      if (room.members.size > 0) {
        // Tìm thành viên vào phòng sớm nhất còn lại để kế vị Host
        const sortedMembers = Array.from(room.members.values()).sort((a, b) => a.joinedAt - b.joinedAt)
        const newHost = sortedMembers[0]
        newHost.role = 'host'
        room.hostSocketId = newHost.socketId
        room.hostUserId = newHost.userId

        console.log(`👑 Tự động chuyển quyền Chủ phòng cho: ${newHost.userName}`)

        io.to(targetCode).emit('ROOM:HOST_CHANGED', {
          newHostUserId: newHost.userId,
          newHostSocketId: newHost.socketId,
        })
        io.to(targetCode).emit('ROOM:MEMBER_UPDATED', {
          socketId: newHost.socketId,
          role: 'host',
        })
        io.to(targetCode).emit('ROOM:STATE', formatRoomState(room))

        // Cập nhật DB
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
        // Không còn ai trong phòng: đóng phòng và giải phóng bộ nhớ
        console.log(`🧹 Phòng ${targetCode} không còn thành viên, tự động đóng phòng.`)
        if (room.dbRoomId) {
          try {
            await supabaseAdmin.from('rooms').update({ is_active: false }).eq('id', room.dbRoomId)
          } catch {}
        }

        // Dọn dẹp debounce lưu tài liệu nếu có
        if (room.activeDocument?.id) {
          const saveKey = `${targetCode}_${room.activeDocument.id}`
          if (docSaveTimers.has(saveKey)) {
            clearTimeout(docSaveTimers.get(saveKey))
            docSaveTimers.delete(saveKey)
          }
        }

        activeRooms.delete(targetCode)
      }
    }
  }

  socket.on('ROOM:LEAVE', ({ roomCode }) => handleLeave(roomCode, true))
  socket.on('disconnect', () => handleLeave(null, false))

  // ─── 3. ĐIỀU KHIỂN MICRO / CAMERA / NÓI (SERVER-SIDE ENFORCEMENT) ─────────
  socket.on('ROOM:MEDIA_TOGGLE', ({ roomCode, isMicOn, isCamOn }) => {
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id)) return

    const member = room.members.get(socket.id)

    // KIỂM TRA QUYỀN: Chỉ Host hoặc Speaker mới được bật Micro
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

  socket.on('ROOM:SPEAKING_STATE', ({ roomCode, isSpeaking }) => {
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id)) return

    const member = room.members.get(socket.id)
    member.isSpeaking = Boolean(isSpeaking)

    io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
      socketId: socket.id,
      isSpeaking: member.isSpeaking,
    })
  })

  // ─── 4. GIƠ TAY PHÁT BIỂU (ROOM:RAISE_HAND) ──────────────────────────────
  socket.on('ROOM:RAISE_HAND', ({ roomCode, isRaised }) => {
    try {
      if (!roomCode) return
      const room = activeRooms.get(roomCode)
      if (!room || !room.members.has(socket.id)) return

      const member = room.members.get(socket.id)
      member.isHandRaised = Boolean(isRaised)

      console.log(`✋ ${member.userName} ${member.isHandRaised ? 'đã giơ tay' : 'đã hạ tay'}`)

      io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
        socketId: socket.id,
        isHandRaised: member.isHandRaised,
      })
    } catch (err) {
      console.error('Lỗi ROOM:RAISE_HAND:', err)
    }
  })

  // ─── 5. PHÂN VAI TRÒ THÀNH VIÊN (ROOM:SET_ROLE - HOST ONLY) ──────────────
  socket.on('ROOM:SET_ROLE', async ({ roomCode, targetSocketId, role }) => {
    try {
      if (!roomCode || !targetSocketId || !['speaker', 'viewer'].includes(role)) return
      const room = activeRooms.get(roomCode)
      if (!room || !room.members.has(socket.id)) return

      // Chỉ Chủ phòng mới có quyền cấp hoặc hạ quyền
      if (!isHost(room, socket.id)) {
        return socket.emit('ERROR', {
          message: 'Chỉ Chủ phòng mới có quyền phân vai trò thành viên.',
          code: 'FORBIDDEN',
        })
      }

      const targetMember = room.members.get(targetSocketId)
      if (!targetMember) return

      targetMember.role = role

      // Nếu hạ xuống Viewer: tự động hạ tay và cưỡng chế tắt Mic / Screen share nếu đang bật
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

      console.log(`🎖️ ${targetMember.userName} đã được đặt vai trò: ${role}`)

      // Thông báo cập nhật vai trò cho toàn phòng
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

      // Cập nhật DB
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

  // ─── 6. CHIA SẺ MÀN HÌNH (SCREEN SHARE) ─────────────────────────────────
  socket.on('ROOM:SCREEN_SHARE_START', ({ roomCode }) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    let member = room.members.get(socket.id)
    if (!member) {
      const currentUserId = socket.user?.id || socket.id
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

    if (!member) return

    // KIỂM TRA QUYỀN: Chỉ Host hoặc Speaker mới được chia sẻ màn hình
    if (!isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng và Diễn giả (Speaker) mới được chia sẻ màn hình.',
        code: 'FORBIDDEN',
      })
    }

    if (member.role !== 'host' && !room.allowMemberScreenShare) {
      return socket.emit('ERROR', {
        message: 'Chủ phòng đã tắt quyền chia sẻ màn hình của thành viên.',
        code: 'FORBIDDEN',
      })
    }

    // Mỗi thời điểm chỉ một người được chia sẻ
    if (room.screenSharerSocketId && room.screenSharerSocketId !== socket.id) {
      const sharer = room.members.get(room.screenSharerSocketId)
      return socket.emit('ERROR', {
        message: `Hiện tại ${sharer?.userName || 'thành viên khác'} đang chia sẻ màn hình.`,
      })
    }

    room.screenSharerSocketId = socket.id
    member.isScreenSharing = true

    io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
      socketId: socket.id,
      isScreenSharing: true,
    })
    io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
  })

  socket.on('ROOM:SCREEN_SHARE_STOP', ({ roomCode }) => {
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

  // ─── 7. QUYỀN HẠN CỦA CHỦ PHÒNG (HOST ACTIONS) ──────────────────────────
  socket.on('ROOM:MUTE_MEMBER', ({ roomCode, targetSocketId }) => {
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
    }
  })

  socket.on('ROOM:KICK_MEMBER', ({ roomCode, targetSocketId }) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền mời thành viên ra khỏi phòng.',
        code: 'FORBIDDEN',
      })
    }

    const targetMember = room.members.get(targetSocketId)
    if (targetMember) {
      room.members.delete(targetSocketId)
      io.to(targetSocketId).emit('ROOM:KICKED', { reason: 'Chủ phòng đã mời bạn rời khỏi phòng học.' })
      io.to(roomCode).emit('ROOM:MEMBER_LEFT', {
        socketId: targetSocketId,
        userId: targetMember.userId,
        reason: 'kicked',
      })
    }
  })

  socket.on('ROOM:TRANSFER_HOST', async ({ roomCode, targetSocketId }) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền chuyển giao quyền Chủ phòng.',
        code: 'FORBIDDEN',
      })
    }

    const targetMember = room.members.get(targetSocketId)
    if (targetMember) {
      const oldHost = room.members.get(socket.id)
      if (oldHost) oldHost.role = 'speaker' // Chủ phòng cũ được giữ vai trò Speaker
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
          await supabaseAdmin.from('room_members').update({ role: 'host' }).eq('room_id', room.dbRoomId).eq('user_id', targetMember.userId)
        } catch {}
      }
    }
  })

  socket.on('ROOM:TOGGLE_SCREEN_PERMISSION', ({ roomCode, allow }) => {
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

  socket.on('ROOM:CLOSE', async ({ roomCode }) => {
    const room = activeRooms.get(roomCode)
    if (!room || !isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền đóng phòng học.',
        code: 'FORBIDDEN',
      })
    }

    console.log(`🔒 Chủ phòng đã đóng phòng ${roomCode}`)
    io.to(roomCode).emit('ROOM:CLOSED', { reason: 'Chủ phòng đã kết thúc buổi học.' })

    if (room.dbRoomId) {
      try {
        await supabaseAdmin.from('rooms').update({ is_active: false }).eq('id', room.dbRoomId)
      } catch {}
    }

    activeRooms.delete(roomCode)
  })

  // ─── 8. TRÌNH CHIẾU TÀI LIỆU & ĐỒNG BỘ NỘI DUNG (LAZY LOAD + ENFORCEMENT) ─
  // Chỉ Chủ phòng mới được chọn tài liệu chiếu
  socket.on('DOC:SELECT', async ({ roomCode, documentId, docData }) => {
    try {
      const room = activeRooms.get(roomCode)
      if (!room) {
        return socket.emit('ERROR', { message: 'Phòng học không tồn tại.' })
      }

      if (!isHost(room, socket.id)) {
        return socket.emit('ERROR', {
          message: 'Chỉ Chủ phòng mới có quyền chọn tài liệu trình chiếu.',
          code: 'FORBIDDEN',
        })
      }
      room.hostSocketId = socket.id

      // 1. Tìm tài liệu từ database
      let sourceDoc = null
      if (typeof documentId === 'number' && documentId > 0) {
        const { data: foundDoc } = await supabaseAdmin
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .maybeSingle()
        if (foundDoc) {
          sourceDoc = foundDoc
        }
      }

      // 2. Nếu không tìm thấy trong DB nhưng client gửi kèm docData
      if (!sourceDoc && docData && Array.isArray(docData.pagesContent)) {
        sourceDoc = {
          id: documentId,
          original_name: docData.title,
          filename: docData.title,
          total_pages: docData.totalPages || docData.pagesContent.length || 1,
          pages_content: docData.pagesContent,
        }
      }

      if (!sourceDoc) {
        return socket.emit('ERROR', { message: 'Không tìm thấy tài liệu trong kho lưu trữ.' })
      }

      const pages = Array.isArray(sourceDoc.pages_content) ? sourceDoc.pages_content : []

      // Tạo bản sao trong bảng room_documents
      let roomDocData = null
      if (room.dbRoomId) {
        try {
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from('room_documents')
            .insert({
              room_id: room.dbRoomId,
              original_document_id: typeof sourceDoc.id === 'number' && sourceDoc.id > 0 ? sourceDoc.id : null,
              title: sourceDoc.original_name || sourceDoc.filename || 'Tài liệu bài giảng',
              total_pages: sourceDoc.total_pages || pages.length || 1,
              pages_content: pages,
              updated_at: new Date(),
            })
            .select()
            .single()

          if (!insertError && inserted) {
            roomDocData = {
              id: inserted.id,
              originalDocumentId: sourceDoc.id,
              title: inserted.title,
              totalPages: inserted.total_pages,
              pagesContent: Array.isArray(inserted.pages_content) ? inserted.pages_content : pages,
              currentPage: 0,
              updatedAt: inserted.updated_at,
            }
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
          totalPages: sourceDoc.total_pages || pages.length || 1,
          pagesContent: pages,
          currentPage: 0,
          updatedAt: new Date().toISOString(),
        }
      }

      // Lưu trữ toàn bộ nội dung trong RAM server, nhưng phát qua socket CHỈ GỬI METADATA
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

  // Chỉ Chủ phòng mới được dừng trình chiếu
  socket.on('DOC:STOP', ({ roomCode }) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!isHost(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng mới có quyền dừng trình chiếu tài liệu.',
        code: 'FORBIDDEN',
      })
    }

    room.activeDocument = null
    room.annotationsByPage = {}
    io.to(roomCode).emit('DOC:SYNC', null)
    io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
  })

  // Chỉ Host hoặc Speaker mới được lật trang tài liệu
  socket.on('DOC:CHANGE_PAGE', ({ roomCode, pageIndex }) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng và Diễn giả mới có quyền điều khiển trang tài liệu.',
        code: 'FORBIDDEN',
      })
    }

    if (!room.activeDocument) return

    const maxPage = Math.max(0, (room.activeDocument.totalPages || room.activeDocument.pagesContent?.length || 1) - 1)
    const validPage = Math.max(0, Math.min(maxPage, Number(pageIndex) || 0))

    room.activeDocument.currentPage = validPage

    // Phát sự kiện chuyển trang (chỉ gửi index số trang, không gửi pages_content)
    io.to(roomCode).emit('DOC:PAGE_CHANGED', {
      pageIndex: validPage,
      by: socket.id,
    })

    if (room.dbRoomId) {
      supabaseAdmin.from('rooms').update({ current_page: validPage }).eq('id', room.dbRoomId).catch(() => {})
    }
  })

  // Chỉ Host hoặc Speaker mới được chỉnh sửa nội dung văn bản trang
  socket.on('DOC:EDIT_PAGE', ({ roomCode, pageIndex, content }) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng và Diễn giả mới có quyền chỉnh sửa tài liệu.',
        code: 'FORBIDDEN',
      })
    }

    if (!room.activeDocument || typeof content !== 'string') return

    const idx = Number(pageIndex) || 0
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

    // Debounce 500ms lưu vào DB
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

  // Chỉ Host hoặc Speaker mới được vẽ chú thích lên trang
  socket.on('DOC:ANNOTATE', ({ roomCode, pageIndex, annotations }) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng và Diễn giả mới có quyền chú thích lên tài liệu.',
        code: 'FORBIDDEN',
      })
    }

    if (!room.annotationsByPage) {
      room.annotationsByPage = {}
    }
    const idx = Number(pageIndex) || 0
    room.annotationsByPage[idx] = Array.isArray(annotations) ? annotations : []

    // Đồng bộ tức thì tới tất cả thành viên trong phòng
    io.to(roomCode).emit('DOC:ANNOTATE', {
      pageIndex: idx,
      annotations: room.annotationsByPage[idx],
      by: socket.id,
    })
  })

  // Chỉ Host hoặc Speaker mới được xóa chú thích
  socket.on('DOC:CLEAR_ANNOTATIONS', ({ roomCode, pageIndex }) => {
    const room = activeRooms.get(roomCode)
    if (!room) return

    if (!isHostOrSpeaker(room, socket.id)) {
      return socket.emit('ERROR', {
        message: 'Chỉ Chủ phòng và Diễn giả mới có quyền xóa chú thích.',
        code: 'FORBIDDEN',
      })
    }

    if (!room.annotationsByPage) {
      room.annotationsByPage = {}
    }
    if (pageIndex !== undefined && pageIndex !== null) {
      delete room.annotationsByPage[Number(pageIndex)]
      io.to(roomCode).emit('DOC:CLEAR_ANNOTATIONS', { pageIndex: Number(pageIndex) })
    } else {
      room.annotationsByPage = {}
      io.to(roomCode).emit('DOC:CLEAR_ANNOTATIONS', {})
    }
  })

  // Hỗ trợ backward compatibility cho sự kiện cũ
  socket.on('JOIN_ROOM', ({ roomCode, user }) => {
    socket.emit('ROOM:JOIN', { roomCode, user })
  })
}

module.exports = {
  roomHandler,
  getActiveRooms,
}