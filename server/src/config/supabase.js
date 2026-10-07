// config/supabase.js — Khởi tạo Supabase Admin Client (Service Role)
// Dùng Service Role Key để có quyền đọc/ghi Storage và Database không bị hạn chế RLS

const { createClient } = require('@supabase/supabase-js')
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./env')

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

module.exports = { supabaseAdmin }
