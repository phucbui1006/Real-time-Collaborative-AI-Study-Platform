import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://ohcnczeeiypefwckidon.supabase.co'
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_m998xHVWzQwOJmyKjFIGpg_PYvNGHdm'

/**
 * supabase — Client singleton dùng xuyên suốt toàn bộ ứng dụng.
 * Import từ file này thay vì tạo nhiều instance.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
