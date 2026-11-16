import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://ohcnczeeiypefwckidon.supabase.co'
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_m998xHVWzQwOJmyKjFIGpg_PYvNGHdm'

const REMEMBER_ME_KEY = 'permind_remember_me'

/**
 * Kiểm tra hoặc cập nhật chế độ "Ghi nhớ đăng nhập"
 * Mặc định: true (lưu trong localStorage để duy trì phiên qua các lần mở trình duyệt và OAuth redirect).
 * Nếu người dùng bỏ chọn "Ghi nhớ đăng nhập", lưu trong sessionStorage (đóng trình duyệt là đăng xuất).
 */
export function getRememberMePreference(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const val = window.localStorage.getItem(REMEMBER_ME_KEY)
    if (val === 'false') return false
    return true
  } catch {
    return true
  }
}

export function setRememberMePreference(remember: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false')
    if (!remember) {
      // Nếu người dùng chọn không ghi nhớ, dọn token cũ trong localStorage (nếu có)
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k))
    }
  } catch {}
}

/**
 * Custom storage adapter tự động đọc/ghi theo lựa chọn "Ghi nhớ đăng nhập"
 */
const adaptiveAuthStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
      const fromSession = window.sessionStorage.getItem(key)
      if (fromSession) return fromSession
      const fromLocal = window.localStorage.getItem(key)
      return fromLocal
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
      const remember = getRememberMePreference()
      if (remember) {
        window.localStorage.setItem(key, value)
        window.sessionStorage.removeItem(key)
      } else {
        window.sessionStorage.setItem(key, value)
        window.localStorage.removeItem(key)
      }
    } catch {}
  },
  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch {}
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? adaptiveAuthStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
