// server/src/services/livekitService.js
// Tiện ích quản trị phòng LiveKit SFU phía server (đóng phòng để giải phóng tài nguyên)

const { RoomServiceClient } = require('livekit-server-sdk')
const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_CONFIGURED } = require('../config/env')

let client = null

function getClient() {
  if (!LIVEKIT_CONFIGURED) return null
  if (!client) {
    // RoomServiceClient dùng giao thức HTTP(S) thay vì WS(S)
    const httpUrl = LIVEKIT_URL.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:')
    client = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  }
  return client
}

/**
 * Xóa phòng LiveKit: ngắt toàn bộ người tham gia và giải phóng tài nguyên SFU ngay lập tức.
 * Không ném lỗi nếu phòng không tồn tại hoặc LiveKit chưa được cấu hình.
 * @param {string} roomName mã phòng
 */
async function deleteLiveKitRoom(roomName) {
  const c = getClient()
  if (!c) return false
  try {
    await c.deleteRoom(String(roomName))
    console.log(`🧹 [LiveKit] Đã xóa phòng SFU ${roomName}`)
    return true
  } catch (err) {
    console.warn(`[LiveKit] Không xóa được phòng ${roomName}:`, err?.message || err)
    return false
  }
}

/**
 * Ngắt kết nối một thành viên khỏi phòng LiveKit SFU ngay lập tức (khi bị Host kick)
 * @param {string} roomName
 * @param {string} identity
 */
async function removeParticipant(roomName, identity) {
  const c = getClient()
  if (!c || !roomName || !identity) return false
  try {
    await c.removeParticipant(String(roomName), String(identity))
    console.log(`🚫 [LiveKit] Đã ngắt participant ${identity} khỏi phòng ${roomName}`)
    return true
  } catch (err) {
    console.warn(`[LiveKit] Không xóa được participant ${identity}:`, err?.message || err)
    return false
  }
}

/**
 * Cưỡng chế tắt các audio track đang phát của participant trên LiveKit SFU khi hạ xuống Viewer / Mute
 * @param {string} roomName
 * @param {string} identity
 */
async function muteParticipantAudio(roomName, identity) {
  const c = getClient()
  if (!c || !roomName || !identity) return false
  try {
    const participant = await c.getParticipant(String(roomName), String(identity))
    const tracks = participant?.tracks || []
    for (const track of tracks) {
      if (track.type === 0 || String(track.source).toUpperCase().includes('MICROPHONE')) {
        await c.mutePublishedTrack(String(roomName), String(identity), track.sid, true).catch(() => {})
      }
    }
    return true
  } catch {
    return false
  }
}

module.exports = { deleteLiveKitRoom, removeParticipant, muteParticipantAudio }
