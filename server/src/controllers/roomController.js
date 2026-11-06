// controllers/roomController.js — Tạo & Kiểm tra phòng học

const { supabaseAdmin } = require('../config/supabase')
const { getActiveRooms } = require('../sockets/roomHandler')
const {
  MAX_ROOM_MEMBERS,
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_CONFIGURED,
} = require('../config/env')
const { AccessToken } = require('livekit-server-sdk')

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

/** POST /api/rooms/create — Tạo phòng học mới */
async function createRoom(req, res, next) {
  try {
    const { name, password, hostUserId, maxMembers } = req.body
    if (!name) return res.status(400).json({ error: 'Thiếu tên phòng.' })

    const code = await createUniqueCode()
    const payload = {
      name: name.trim(),
      code,
      password_hash: password ? String(password).trim() : null,
      is_active: true,
      max_members: Number(maxMembers) || MAX_ROOM_MEMBERS || 6,
    }
    if (hostUserId) {
      payload.host_user_id = hostUserId
    }

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert(payload)
      .select()
      .single()

    if (error) {
      // Fallback nếu schema cũ chưa có một số cột
      console.warn('Lỗi ghi database rooms, thử fallback cơ bản:', error.message)
      const fallbackPayload = {
        name: name.trim(),
        code,
        password_hash: password ? String(password).trim() : null,
        is_active: true,
        max_members: MAX_ROOM_MEMBERS || 6,
      }
      const { data: d2, error: e2 } = await supabaseAdmin
        .from('rooms')
        .insert(fallbackPayload)
        .select()
        .single()
      if (e2) throw e2
      return res.status(201).json({ success: true, room: d2 })
    }

    res.status(201).json({ success: true, room: data })
  } catch (err) {
    next(err)
  }
}

/** POST /api/rooms/verify hoặc GET /api/rooms/verify/:code — Kiểm tra mã phòng & mật khẩu */
async function verifyRoom(req, res, next) {
  try {
    const code = req.params.code || req.body.code || req.query.code
    const password = req.body.password || req.query.password

    if (!code) return res.status(400).json({ success: false, error: 'Thiếu mã phòng.' })

    const cleanCode = String(code).trim()
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Mã phòng không tồn tại hoặc phòng đã đóng.' })
    }

    // Nếu phòng có đặt mật khẩu, kiểm tra mật khẩu
    if (data.password_hash) {
      if (!password || String(password).trim() !== String(data.password_hash).trim()) {
        return res.status(401).json({ success: false, error: 'Mật khẩu phòng không chính xác.' })
      }
    }

    // Kiểm tra xem phòng có đang đầy người trong RAM không
    const activeRooms = getActiveRooms()
    const memoryRoom = activeRooms.get(cleanCode)
    const max = data.max_members || 6
    if (memoryRoom && memoryRoom.members.size >= max) {
      return res.status(403).json({ success: false, error: `Phòng đã đủ sĩ số tối đa (${max} người).` })
    }

    res.json({ success: true, room: data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/rooms — Lấy danh sách phòng học */
async function getRooms(_req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ success: true, rooms: data })
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

/** GET /api/rooms/:code/document/page/:pageIndex — Lazy-load nội dung của một trang tài liệu cụ thể */
async function getDocumentPage(req, res, next) {
  try {
    const { code, pageIndex } = req.params
    const pageNum = parseInt(pageIndex, 10)
    if (isNaN(pageNum) || pageNum < 0) {
      return res.status(400).json({ success: false, error: 'Chỉ số trang không hợp lệ.' })
    }

    const cleanCode = String(code).trim()
    const activeRooms = getActiveRooms()
    const memoryRoom = activeRooms.get(cleanCode)

    // 1. Kiểm tra nhanh trong bộ nhớ RAM
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

    // 2. Dự phòng nạp từ database nếu phòng đang đóng hoặc RAM chưa nạp
    const { data: dbRoom } = await supabaseAdmin
      .from('rooms')
      .select('id, current_document_id')
      .eq('code', cleanCode)
      .maybeSingle()

    if (!dbRoom || !dbRoom.current_document_id) {
      return res.status(404).json({ success: false, error: 'Phòng hiện chưa chiếu tài liệu nào.' })
    }

    const { data: roomDoc } = await supabaseAdmin
      .from('room_documents')
      .select('*')
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

/** GET /api/rooms/:code/messages — Tải lịch sử tin nhắn trò chuyện phân trang */
async function getRoomMessages(req, res, next) {
  try {
    const { code } = req.params
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100)
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId, 10) : null

    const cleanCode = String(code).trim()
    const { data: dbRoom } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('code', cleanCode)
      .maybeSingle()

    if (!dbRoom) {
      return res.status(404).json({ success: false, error: 'Phòng không tồn tại.' })
    }

    let query = supabaseAdmin
      .from('room_messages')
      .select('id, sender_id, sender_name, message, created_at')
      .eq('room_id', dbRoom.id)
      .order('id', { ascending: false })
      .limit(limit)

    if (beforeId) {
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
 * Cấp token LiveKit cho thành viên hợp lệ trong phòng
 * Quyền publish phụ thuộc role: host/speaker được publish; viewer chỉ subscribe
 */
async function getLiveKitToken(req, res, next) {
  try {
    const { code } = req.params
    const { userId, socketId, userName } = req.body
    const cleanCode = String(code).trim()

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

    let memberRole = 'viewer'
    let isValidMember = false
    let participantName = userName || 'Thành viên'
    let participantIdentity = socketId || userId || `user_${Date.now()}`

    // 1. Kiểm tra thành viên trong activeRooms (RAM)
    if (activeRoom) {
      let foundMember = null
      if (socketId && activeRoom.members.has(socketId)) {
        foundMember = activeRoom.members.get(socketId)
      } else if (userId) {
        for (const m of activeRoom.members.values()) {
          if (m.userId === userId) {
            foundMember = m
            break
          }
        }
      }

      if (foundMember) {
        isValidMember = true
        memberRole = foundMember.role || 'viewer'
        participantName = foundMember.userName || participantName
        participantIdentity = foundMember.socketId || participantIdentity
      }
    }

    // 2. Nếu phòng chưa có trong RAM hoặc vừa vào, kiểm tra trong DB
    if (!isValidMember) {
      const { data: dbRoom } = await supabaseAdmin
        .from('rooms')
        .select('id, host_user_id, is_active')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle()

      if (dbRoom) {
        if (userId && dbRoom.host_user_id === userId) {
          isValidMember = true
          memberRole = 'host'
        } else if (userId) {
          const { data: dbMember } = await supabaseAdmin
            .from('room_members')
            .select('role')
            .eq('room_id', dbRoom.id)
            .eq('user_id', userId)
            .maybeSingle()

          if (dbMember) {
            isValidMember = true
            memberRole = dbMember.role || 'viewer'
          }
        }
      }
    }

    // Token chỉ cấp cho người đã là thành viên hợp lệ của phòng
    if (!isValidMember) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không phải là thành viên hợp lệ của phòng học này.',
      })
    }

    // Quyền publish: Host và Speaker được publish; Viewer chỉ subscribe
    const canPublish = memberRole === 'host' || memberRole === 'speaker'

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: String(participantIdentity),
      name: String(participantName),
      ttl: '1h', // Token thời hạn ngắn 1h
    })

    at.addGrant({
      room: cleanCode,
      roomJoin: true,
      canPublish: canPublish,
      canPublishData: true,
      canSubscribe: true,
    })

    const token = await at.toJwt()

    res.json({
      success: true,
      token,
      url: LIVEKIT_URL,
      roomName: cleanCode,
      role: memberRole,
      canPublish,
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
}
