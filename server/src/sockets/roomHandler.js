// server/src/sockets/roomHandler.js
// Quản lý toàn diện vòng đời phòng học, phân quyền Host/Member, trạng thái trình chiếu và tài liệu

const { supabaseAdmin } = require('../config/supabase')
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
 * Lấy snapshot trạng thái phòng để gửi cho client
 * @param {any} room 
 */
function formatRoomState(room) {
  return {
    code: room.code,
    name: room.name,
    hostUserId: room.hostUserId,
    hostSocketId: room.hostSocketId,
    members: Array.from(room.members.values()),
    activeDocument: room.activeDocument,
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
        const isHost = dbRoom.host_user_id ? dbRoom.host_user_id === userId : true
        room = {
          code: cleanCode,
          name: dbRoom.name || 'Phòng học nhóm',
          dbRoomId: dbRoom.id,
          hostUserId: dbRoom.host_user_id || userId,
          hostSocketId: isHost ? socket.id : null,
          maxMembers: dbRoom.max_members || 6,
          allowMemberScreenShare: true,
          screenSharerSocketId: null,
          members: new Map(),
          activeDocument: null,
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

      // Xác định vai trò: nếu là người tạo phòng hoặc hiện tại phòng chưa có host
      const isHost = room.hostUserId === userId || !room.hostSocketId
      if (isHost) {
        room.hostUserId = userId
        room.hostSocketId = socket.id
      }

      const member = {
        socketId: socket.id,
        userId,
        userName,
        role: isHost ? 'host' : 'member',
        avatarColor,
        isMicOn: false,
        isCamOn: false,
        isScreenSharing: false,
        isSpeaking: false,
        joinedAt: Date.now(),
      }

      room.members.set(socket.id, member)
      socket.join(cleanCode)

      console.log(`👤 ${userName} (${member.role}) đã vào phòng ${cleanCode} [${room.members.size}/${room.maxMembers}]`)

      // Thông báo cho các thành viên khác
      socket.to(cleanCode).emit('ROOM:MEMBER_JOINED', member)

      // Gửi toàn bộ trạng thái phòng cho thành viên mới
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
        // Tìm thành viên vào phòng sớm nhất còn lại
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
        activeRooms.delete(targetCode)
      }
    } else {
      // Nếu không còn ai trong phòng
      if (room.members.size === 0) {
        activeRooms.delete(targetCode)
      } else {
        io.to(targetCode).emit('ROOM:STATE', formatRoomState(room))
      }
    }
  }

  socket.on('ROOM:LEAVE', ({ roomCode }) => handleLeave(roomCode, true))
  socket.on('disconnect', () => handleLeave(null, false))

  // ─── 3. ĐIỀU KHIỂN MICRO / CAMERA / NÓI ─────────────────────────────────
  socket.on('ROOM:MEDIA_TOGGLE', ({ roomCode, isMicOn, isCamOn }) => {
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id)) return

    const member = room.members.get(socket.id)
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

  // ─── 4. CHIA SẺ MÀN HÌNH (SCREEN SHARE) ─────────────────────────────────
  socket.on('ROOM:SCREEN_SHARE_START', ({ roomCode }) => {
    const room = activeRooms.get(roomCode)
    if (!room || !room.members.has(socket.id)) return

    const member = room.members.get(socket.id)

    // Kiểm tra quyền: nếu không phải host và host tắt quyền chia sẻ của thành viên
    if (member.role !== 'host' && !room.allowMemberScreenShare) {
      return socket.emit('ERROR', { message: 'Chủ phòng đã tắt quyền chia sẻ màn hình của thành viên.' })
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
    if (!room || !room.members.has(socket.id)) return

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

  // ─── 5. QUYỀN HẠN CỦA CHỦ PHÒNG (HOST ACTIONS) ──────────────────────────
  // Mute mic thành viên
  socket.on('ROOM:MUTE_MEMBER', ({ roomCode, targetSocketId }) => {
    const room = activeRooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có quyền tắt tiếng thành viên.' })
    }

    const targetMember = room.members.get(targetSocketId)
    if (targetMember) {
      targetMember.isMicOn = false
      io.to(targetSocketId).emit('ROOM:MUTED_BY_HOST')
      io.to(roomCode).emit('ROOM:MEMBER_UPDATED', {
        socketId: targetSocketId,
        isMicOn: false,
      })
    }
  })

  // Kick thành viên ra khỏi phòng
  socket.on('ROOM:KICK_MEMBER', ({ roomCode, targetSocketId }) => {
    const room = activeRooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có quyền mời thành viên ra ngoài.' })
    }

    const targetSocket = io.sockets.sockets.get(targetSocketId)
    if (targetSocket) {
      targetSocket.emit('ROOM:KICKED', { reason: 'Chủ phòng đã mời bạn rời khỏi phòng học.' })
      targetSocket.leave(roomCode)
    }

    const targetMember = room.members.get(targetSocketId)
    room.members.delete(targetSocketId)
    if (room.screenSharerSocketId === targetSocketId) {
      room.screenSharerSocketId = null
    }

    io.to(roomCode).emit('ROOM:MEMBER_LEFT', {
      socketId: targetSocketId,
      userId: targetMember?.userId,
      reason: 'Bị mời ra',
    })
    io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
  })

  // Chuyển quyền chủ phòng thủ công
  socket.on('ROOM:TRANSFER_HOST', ({ roomCode, targetSocketId }) => {
    const room = activeRooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có thể nhượng quyền.' })
    }

    const currentHost = room.members.get(socket.id)
    const newHost = room.members.get(targetSocketId)

    if (currentHost && newHost) {
      currentHost.role = 'member'
      newHost.role = 'host'
      room.hostSocketId = targetSocketId
      room.hostUserId = newHost.userId

      io.to(roomCode).emit('ROOM:HOST_CHANGED', {
        newHostUserId: newHost.userId,
        newHostSocketId: newHost.socketId,
      })
      io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))

      if (room.dbRoomId) {
        supabaseAdmin.from('rooms').update({ host_user_id: newHost.userId }).eq('id', room.dbRoomId).catch(() => {})
      }
    }
  })

  // Bật/tắt quyền chia sẻ màn hình cho thành viên
  socket.on('ROOM:TOGGLE_SCREEN_PERMISSION', ({ roomCode, allow }) => {
    const room = activeRooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có quyền đổi cài đặt này.' })
    }

    room.allowMemberScreenShare = Boolean(allow)
    // Nếu tắt quyền mà đang có thành viên thường share thì dừng
    if (!room.allowMemberScreenShare && room.screenSharerSocketId && room.screenSharerSocketId !== room.hostSocketId) {
      const sharer = room.members.get(room.screenSharerSocketId)
      if (sharer) sharer.isScreenSharing = false
      room.screenSharerSocketId = null
    }

    io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
  })

  // Đóng phòng hoàn toàn
  socket.on('ROOM:CLOSE', async ({ roomCode }) => {
    const room = activeRooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có quyền đóng phòng.' })
    }

    io.to(roomCode).emit('ROOM:CLOSED', { reason: 'Chủ phòng đã kết thúc buổi học.' })

    if (room.dbRoomId) {
      try {
        await supabaseAdmin.from('rooms').update({ is_active: false }).eq('id', room.dbRoomId)
      } catch {}
    }

    activeRooms.delete(roomCode)
  })

  // ─── 6. TRÌNH CHIẾU TÀI LIỆU & ĐỒNG BỘ NỘI DUNG ─────────────────────────
  // Host chọn tài liệu để trình chiếu (sao chép sang room_documents)
  socket.on('DOC:SELECT', async ({ roomCode, documentId }) => {
    try {
      const room = activeRooms.get(roomCode)
      if (!room || room.hostSocketId !== socket.id) {
        return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có quyền chọn tài liệu trình chiếu.' })
      }

      // Tải tài liệu gốc từ bảng documents
      const { data: sourceDoc, error: docError } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (docError || !sourceDoc) {
        return socket.emit('ERROR', { message: 'Không tìm thấy tài liệu trong kho lưu trữ.' })
      }

      const pages = Array.isArray(sourceDoc.pages_content) ? sourceDoc.pages_content : []

      // Tạo bản sao trong bảng room_documents
      let roomDocData = null
      if (room.dbRoomId) {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('room_documents')
          .insert({
            room_id: room.dbRoomId,
            original_document_id: sourceDoc.id,
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
      }

      if (!roomDocData) {
        roomDocData = {
          id: Date.now(),
          originalDocumentId: sourceDoc.id,
          title: sourceDoc.original_name || sourceDoc.filename || 'Tài liệu bài giảng',
          totalPages: sourceDoc.total_pages || pages.length || 1,
          pagesContent: pages,
          currentPage: 0,
          updatedAt: new Date().toISOString(),
        }
      }

      room.activeDocument = roomDocData
      io.to(roomCode).emit('DOC:SYNC', roomDocData)
      io.to(roomCode).emit('ROOM:STATE', formatRoomState(room))
    } catch (err) {
      console.error('Lỗi chọn tài liệu:', err)
      socket.emit('ERROR', { message: 'Không thể mở tài liệu trình chiếu.' })
    }
  })

  // Host lật trang tài liệu
  socket.on('DOC:CHANGE_PAGE', ({ roomCode, pageIndex }) => {
    const room = activeRooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có quyền điều khiển trang.' })
    }
    if (!room.activeDocument) return

    const maxPage = Math.max(0, (room.activeDocument.totalPages || room.activeDocument.pagesContent.length) - 1)
    const validPage = Math.max(0, Math.min(maxPage, Number(pageIndex) || 0))

    room.activeDocument.currentPage = validPage

    io.to(roomCode).emit('DOC:PAGE_CHANGED', {
      pageIndex: validPage,
      by: socket.id,
    })

    if (room.dbRoomId) {
      supabaseAdmin.from('rooms').update({ current_page: validPage }).eq('id', room.dbRoomId).catch(() => {})
    }
  })

  // Host chỉnh sửa nội dung văn bản trang hiện tại
  socket.on('DOC:EDIT_PAGE', ({ roomCode, pageIndex, content }) => {
    const room = activeRooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) {
      return socket.emit('ERROR', { message: 'Chỉ chủ phòng mới có quyền chỉnh sửa tài liệu.' })
    }
    if (!room.activeDocument || typeof content !== 'string') return

    const idx = Number(pageIndex) || 0
    if (!room.activeDocument.pagesContent) {
      room.activeDocument.pagesContent = []
    }
    room.activeDocument.pagesContent[idx] = content
    room.activeDocument.updatedAt = new Date().toISOString()

    // Đồng bộ lập tức tới các thành viên
    io.to(roomCode).emit('DOC:PAGE_UPDATED', {
      pageIndex: idx,
      content,
      by: socket.id,
    })

    // Debounce 500ms lưu vào cơ sở dữ liệu Supabase room_documents
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

  // Hỗ trợ backward compatibility cho sự kiện cũ
  socket.on('JOIN_ROOM', ({ roomCode, user }) => {
    socket.emit('ROOM:JOIN', { roomCode, user })
  })
}

module.exports = {
  roomHandler,
  getActiveRooms,
}
