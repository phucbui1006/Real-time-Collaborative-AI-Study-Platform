/**
 * utils/index.ts — Các hàm tiện ích dùng chung trong PeerMind
 */

/** Format giây thành MM:SS (VD: 75 → "01:15") */
export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Tính điểm quiz dựa trên độ chính xác và tốc độ trả lời.
 * @param isCorrect  - Đáp án có đúng không
 * @param timeLeft   - Thời gian còn lại (giây)
 * @param totalTime  - Tổng thời gian cho phép (giây)
 */
export function calcScore(isCorrect: boolean, timeLeft: number, totalTime: number): number {
  if (!isCorrect) return 0
  const BASE = 1000
  const speedBonus = Math.round(BASE * (timeLeft / totalTime) * 0.5)
  return BASE + speedBonus
}

/** Tạo mã phòng học 6 chữ số ngẫu nhiên */
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/** Kiểm tra định dạng email hợp lệ */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Rút gọn tên file dài (VD: "Toán_cao_cấp_chương_4_rất_dài.pdf" → "Toán_cao_cấp_chươ...pdf") */
export function truncateFilename(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name
  const ext = name.split('.').pop() ?? ''
  return `${name.slice(0, maxLength - ext.length - 4)}...${ext}`
}
