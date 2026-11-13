// controllers/roomController.js — Tạo, xác thực & quản trị phòng học an toàn (JWT, hashed password, membership check)

const { supabaseAdmin } = require('../config/supabase')
const { getActiveRooms } = require('../sockets/roomHandler')
const {
  hashPassword,
  verifyPassword,
  sanitizeRoom,
} = require('../middlewares/authMiddleware')
const {
  MAX_ROOM_MEMBERS,
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_CONFIGURED,
} = require('../config/env')
const { AccessToken, TrackSource } = require('livekit-server-sdk')

/** Tạo mã phòng 6 số chưa tồn tại trong DB */
async function createUniqueCode() {
  let code
  let exists = true
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString()
    const { data } = await supabaseAdmin.from('rooms').select('code').eq('code', code).maybeSingle()
    exists = !!data
  }
  return code
}

/**
 * Kiểm tra người dùng hiện tại có phải Host hoặc thành viên hợp lệ của phòng không
 */
async function isUserAuthorizedInRoom(cleanCode, userId) {
  if (!cleanCode || !userId) return { allowed: false, dbRoom: null, role: null }

  const activeRooms = getActiveRooms()
  const activeRoom = activeRooms.get(cleanCode)
  if (activeRoom) {
    if (activeRoom.kickedUserIds?.has(userId)) {
      return { allowed: false, dbRoom: null, role: null }
    }
    if (activeRoom.hostUserId === userId) {
      return { allowed: true, dbRoom: { id: activeRoom.dbRoomId, host_user_id: activeRoom.hostUserId }, role: 'host' }
    }
    for (const m of activeRoom.members.values()) {
      if (m.userId === userId) {
        return { allowed: true, dbRoom: { id: activeRoom.dbRoomId, host_user_id: activeRoom.hostUserId }, role: m.role || 'viewer' }
      }
    }
  }

  const { data: dbRoom } = await supabaseAdmin
    .from('rooms')
    .select('id, host_user_id, is_active, current_document_id')
    .eq('code', cleanCode)
    .maybeSingle()

  if (!dbRoom) return { allowed: false, dbRoom: null, role: null }

  if (dbRoom.host_user_id && dbRoom.host_user_id === userId) {
    return { allowed: true, dbRoom, role: 'host' }
  }

  const { data: dbMember } = await supabaseAdmin
    .from('room_members')
    .select('role')
    .eq('room_id', dbRoom.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (dbMember) {
    return { allowed: true, dbRoom, role: dbMember.role || 'viewer' }
  }

  // Cho phép với phòng mẫu hệ thống (host_user_id IS NULL)
  if (!dbRoom.host_user_id) {
    return { allowed: true, dbRoom, role: 'viewer' }
  }

  return { allowed: false, dbRoom, role: null }
}

/** POST /api/rooms/create — Tạo phòng học mới (luôn lấy host_user_id từ JWT, băm mật khẩu scrypt) */
async function createRoom(req, res, next) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập để tạo phòng.' })
    }

    const { name, password, maxMembers, code: requestedCode } = req.body || {}
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Thiếu tên phòng.' })
    }

    const cleanName = name.trim().slice(0, 120)
    const cleanPassword = password ? String(password).trim().slice(0, 128) : ''
    const safeMaxMembers = Math.min(Math.max(Number(maxMembers) || MAX_ROOM_MEMBERS || 6, 2), MAX_ROOM_MEMBERS || 50)

    let code = null
    if (requestedCode && /^\d{6}$/.test(String(requestedCode).trim())) {
      const candidate = String(requestedCode).trim()
      const { data: existing } = await supabaseAdmin.from('rooms').select('id').eq('code', candidate).maybeSingle()
      if (!existing) {
        code = candidate
      }
    }
    if (!code) {
      code = await createUniqueCode()
    }

    const payload = {
      name: cleanName,
      code,
      password_hash: cleanPassword ? hashPassword(cleanPassword) : null,
      host_user_id: userId,
      is_active: true,
      max_members: safeMaxMembers,
    }

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert(payload)
      .select('id, name, code, document_id, is_active, max_members, created_at, host_user_id, password_hash')
      .single()

    if (error) throw error

    res.status(201).json({ success: true, room: sanitizeRoom(data) })
  } catch (err) {
    next(err)
  }
}

/** POST /api/rooms/verify hoặc GET /api/rooms/verify/:code — Kiểm tra mã phòng & mật khẩu (không trả password_hash) */
async function verifyRoom(req, res, next) {
  try {
    const code = req.params.code || req.body?.code || req.query?.code
    const password = req.body?.password || req.query?.password

    if (!code) return res.status(400).json({ success: false, error: 'Thiếu mã phòng.' })

    const cleanCode = String(code).trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('id, name, code, document_id, is_active, max_members, host_user_id, password_hash, created_at')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Mã phòng không tồn tại hoặc phòng đã đóng.' })
    }

    // Kiểm tra người dùng có bị kick khỏi phòng đang chạy không
    const activeRooms = getActiveRooms()
    const memoryRoom = activeRooms.get(cleanCode)
    if (memoryRoom?.kickedUserIds?.has(req.user?.id)) {
      return res.status(403).json({ success: false, error: 'Bạn đã bị mời ra khỏi phòng học này.' })
    }

    // Nếu phòng có đặt mật khẩu, kiểm tra mật khẩu (Chủ phòng hoặc nhập đúng mật khẩu)
    const isHostUser = Boolean(req.user?.id && data.host_user_id === req.user.id)
    if (data.password_hash && !isHostUser) {
      if (!password || !verifyPassword(String(password), data.password_hash)) {
        return res.status(401).json({ success: false, error: 'Mật khẩu phòng không chính xác.' })
      }
    }

    const max = data.max_members || 6
    if (memoryRoom && memoryRoom.members.size >= max) {
      return res.status(403).json({ success: false, error: `Phòng đã đủ sĩ số tối đa (${max} người).` })
    }

    res.json({ success: true, room: sanitizeRoom(data) })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms — Lấy danh sách phòng học của chính người dùng hoặc phòng mẫu (ẩn password_hash) */
async function getRooms(req, res, next) {
  try {
    const userId = req.user?.id
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('id, name, code, document_id, is_active, max_members, host_user_id, password_hash, created_at')
      .eq('is_active', true)
      .or(`host_user_id.eq.${userId},host_user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ success: true, rooms: (data || []).map(sanitizeRoom) })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms/active-counts — Lấy số lượng người đang online thực tế trong các phòng từ RAM */
async function getActiveCounts(_req, res, next) {
  try {
    const activeRooms = getActiveRooms()
    const counts = {}
    if (activeRooms) {
      for (const [code, room] of activeRooms.entries()) {
        counts[code] = room.members ? room.members.size : 0
      }
    }
    res.json({ success: true, counts })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms/:code/document/page/:pageIndex — Lazy-load nội dung 1 trang (kiểm tra tư cách thành viên phòng) */
async function getDocumentPage(req, res, next) {
  try {
    const { code, pageIndex } = req.params
    const pageNum = parseInt(pageIndex, 10)
    if (!Number.isInteger(pageNum) || pageNum < 0 || pageNum > 2000) {
      return res.status(400).json({ success: false, error: 'Chỉ số trang không hợp lệ.' })
    }

    const cleanCode = String(code || '').trim()
    const authCheck = await isUserAuthorizedInRoom(cleanCode, req.user?.id)
    if (!authCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Bạn cần tham gia phòng học hợp lệ để xem nội dung tài liệu.',
      })
    }

    const activeRooms = getActiveRooms()
    const memoryRoom = activeRooms.get(cleanCode)

    if (memoryRoom && memoryRoom.activeDocument) {
      const doc = memoryRoom.activeDocument
      const content = (doc.pagesContent && doc.pagesContent[pageNum]) || ''
      return res.json({
        success: true,
        documentId: doc.id,
        title: doc.title,
        pageIndex: pageNum,
        totalPages: doc.totalPages || (doc.pagesContent ? doc.pagesContent.length : 1),
        content,
      })
    }

    const dbRoom = authCheck.dbRoom
    if (!dbRoom || !dbRoom.current_document_id) {
      return res.status(404).json({ success: false, error: 'Phòng hiện chưa chiếu tài liệu nào.' })
    }

    const { data: roomDoc } = await supabaseAdmin
      .from('room_documents')
      .select('id, title, total_pages, pages_content')
      .eq('id', dbRoom.current_document_id)
      .maybeSingle()

    if (!roomDoc) {
      return res.status(404).json({ success: false, error: 'Tài liệu không tồn tại.' })
    }

    const pages = Array.isArray(roomDoc.pages_content) ? roomDoc.pages_content : []
    const content = pages[pageNum] || ''

    res.json({
      success: true,
      documentId: roomDoc.id,
      title: roomDoc.title,
      pageIndex: pageNum,
      totalPages: roomDoc.total_pages || pages.length,
      content,
    })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms/:code/messages — Tải lịch sử tin nhắn (kiểm tra tư cách thành viên phòng) */
async function getRoomMessages(req, res, next) {
  try {
    const { code } = req.params
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100)
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : null

    const cleanCode = String(code || '').trim()
    const authCheck = await isUserAuthorizedInRoom(cleanCode, req.user?.id)
    if (!authCheck.dbRoom) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại.' })
    }
    if (!authCheck.allowed) {
      return res.status(403).json({ success: false, error: 'Bạn không phải là thành viên của phòng này.' })
    }

    let query = supabaseAdmin
      .from('room_messages')
      .select('id, sender_id, sender_name, message, created_at')
      .eq('room_id', authCheck.dbRoom.id)
      .order('id', { ascending: false })
      .limit(limit)

    if (beforeId && Number.isInteger(beforeId)) {
      query = query.lt('id', beforeId)
    }

    const { data, error } = await query
    if (error) throw error

    const messages = (data || []).reverse().map((m) => {
      let time = ''
      try {
        time = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      } catch {
        time = 'Gần đây'
      }
      return {
        id: String(m.id),
        senderId: m.sender_id,
        senderName: m.sender_name,
        text: m.message,
        time,
      }
    })

    res.json({
      success: true,
      messages,
      hasMore: data && data.length === limit,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/rooms/:code/livekit-token
 * Cấp token LiveKit cho thành viên đã xác thực JWT (KHÔNG tin userId giả từ body)
 */
async function getLiveKitToken(req, res, next) {
  try {
    const verifiedUserId = req.user?.id
    if (!verifiedUserId) {
      return res.status(401).json({ success: false, error: 'Yêu cầu đăng nhập để lấy token phòng học.' })
    }

    const { code } = req.params
    const { socketId, userName } = req.body || {}
    const cleanCode = String(code || '').trim()

    if (!cleanCode) {
      return res.status(400).json({ success: false, error: 'Thiếu mã phòng.' })
    }

    if (!LIVEKIT_CONFIGURED) {
      return res.status(503).json({
        success: false,
        error: 'LiveKit SFU chưa được cấu hình trên server (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).',
      })
    }

    const activeRooms = getActiveRooms()
    const activeRoom = activeRooms.get(cleanCode)

    if (activeRoom?.kickedUserIds?.has(verifiedUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Bạn đã bị mời ra khỏi phòng học này.',
      })
    }

    let memberRole = 'viewer'
    let isValidMember = false
    let participantName =
      String(userName || req.user?.user_metadata?.full_name || 'Thành viên').trim().slice(0, 60)
    let participantIdentity = verifiedUserId

    // 1. Kiểm tra thành viên trong activeRooms (RAM) khớp đúng req.user.id đã xác thực JWT
    if (activeRoom) {
      let foundMember = null
      if (socketId && activeRoom.members.has(socketId)) {
        const candidate = activeRoom.members.get(socketId)
        if (candidate && candidate.userId === verifiedUserId) {
          foundMember = candidate
        }
      }
      if (!foundMember) {
        for (const m of activeRoom.members.values()) {
          if (m.userId === verifiedUserId) {
            foundMember = m
            break
          }
        }
      }

      if (foundMember) {
        isValidMember = true
        memberRole = foundMember.role || 'viewer'
        participantName = foundMember.userName || participantName
        participantIdentity = foundMember.socketId || verifiedUserId
      }
    }

    // 2. Dự phòng kiểm tra DB nếu socket vừa kết nối lại
    if (!isValidMember) {
      const { data: dbRoom } = await supabaseAdmin
        .from('rooms')
        .select('id, host_user_id, is_active')
        .eq('code', cleanCode)
        .maybeSingle()

      if (dbRoom) {
        if (!dbRoom.is_active && dbRoom.host_user_id === verifiedUserId) {
          try {
            await supabaseAdmin.from('rooms').update({ is_active: true }).eq('id', dbRoom.id)
            dbRoom.is_active = true
          } catch {}
        }

        if (dbRoom.is_active) {
          if (dbRoom.host_user_id === verifiedUserId) {
            isValidMember = true
            memberRole = 'host'
          } else {
            const { data: dbMember } = await supabaseAdmin
              .from('room_members')
              .select('role')
              .eq('room_id', dbRoom.id)
              .eq('user_id', verifiedUserId)
              .maybeSingle()

            if (dbMember) {
              isValidMember = true
              memberRole = dbMember.role || 'viewer'
            }
          }
        }
      }
    }

    if (!isValidMember) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không phải là thành viên hợp lệ của phòng học này.',
      })
    }

    const canPublishMedia = memberRole === 'host' || memberRole === 'speaker'

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: String(participantIdentity),
      name: String(participantName),
      ttl: '1h',
    })

    const grant = {
      room: cleanCode,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    }
    if (!canPublishMedia) {
      grant.canPublishSources = [TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
    }
    at.addGrant(grant)

    const token = await at.toJwt()

    res.json({
      success: true,
      token,
      url: LIVEKIT_URL,
      roomName: cleanCode,
      role: memberRole,
      canPublish: canPublishMedia,
      canShareScreen: true,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createRoom,
  verifyRoom,
  getRooms,
  getActiveCounts,
  getDocumentPage,
  getRoomMessages,
  getLiveKitToken,
  isUserAuthorizedInRoom,
}
