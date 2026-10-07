import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[PeerMind] Thiếu biến môi trường Supabase. ' +
    'Sao chép .env.example thành .env và điền thông tin của bạn.'
  )
}

/**
 * supabase — Client singleton dùng xuyên suốt toàn bộ ứng dụng.
 * Import từ file này thay vì tạo nhiều instance.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
