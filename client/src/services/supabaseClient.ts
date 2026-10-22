import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://ohcnczeeiypefwckidon.supabase.co'
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_m998xHVWzQwOJmyKjFIGpg_PYvNGHdm'

/**
 * 1. Khởi động: Xóa các khóa localStorage bắt đầu bằng "sb-" và kết thúc bằng "-auth-token"
 * để đảm bảo không còn token cũ lưu trữ vĩnh viễn trên máy người dùng.
 */
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  } catch (err) {
    console.warn('Lỗi khi dọn dẹp localStorage auth token:', err)
  }
}

/**
 * 2. Khởi tạo client với auth.storage = window.sessionStorage
 * (persistSession: true, autoRefreshToken: true)
 * để khi người dùng đóng tab hoặc trình duyệt, họ bắt buộc phải đăng nhập lại.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

