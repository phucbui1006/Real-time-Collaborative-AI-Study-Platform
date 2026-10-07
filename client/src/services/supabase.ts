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
 * Supabase client được dùng xuyên suốt ứng dụng.
 * Import client này thay vì tạo nhiều instance.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
