-- ==============================================================================
-- PERMIND SUPABASE SECURITY HARDENING MIGRATION
-- Tuân theo đặc tả bảo mật trong Security.md (Mục 2, 3, 4)
-- Hướng dẫn: Xem lại trước khi áp dụng. Chạy trong Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. BẬT RLS (ROW LEVEL SECURITY) TRÊN TẤT CẢ CÁC BẢNG TRONG SCHEMA PUBLIC
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mindmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exam_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. XÓA CÁC CHÍNH SÁCH CŨ QUÁ RỘNG (MỞ HOÀN TOÀN SELECT/INSERT TRUE)
DROP POLICY IF EXISTS "Public read documents" ON public.documents;
DROP POLICY IF EXISTS "Public insert documents" ON public.documents;
DROP POLICY IF EXISTS "Public read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Public insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Public read exams" ON public.exams;
DROP POLICY IF EXISTS "Public read questions" ON public.questions;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public read room_members" ON public.room_members;
DROP POLICY IF EXISTS "Public insert room_members" ON public.room_members;
DROP POLICY IF EXISTS "Public read room_messages" ON public.room_messages;
DROP POLICY IF EXISTS "Public insert room_messages" ON public.room_messages;
DROP POLICY IF EXISTS "Public read room_annotations" ON public.room_annotations;
DROP POLICY IF EXISTS "Public insert room_annotations" ON public.room_annotations;
DROP POLICY IF EXISTS "Public read ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Public insert ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Public read mindmaps" ON public.mindmaps;
DROP POLICY IF EXISTS "Public insert mindmaps" ON public.mindmaps;

-- 3. HÀM KIỂM TRA THÀNH VIÊN PHÒNG (SECURITY DEFINER + FIXED SEARCH PATH)
-- Giúp tránh đệ quy chính sách RLS khi kiểm tra quyền trong phòng học
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND (
      user_name = COALESCE(auth.jwt() ->> 'email', auth.jwt() ->> 'sub', '')
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_room_member(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(bigint) TO authenticated;

-- 4. CHÍNH SÁCH BẢO MẬT CHO TÀI LIỆU (DOCUMENTS)
-- Đảm bảo có cột owner_user_id
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_user_id);

DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;

CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()) OR owner_user_id IS NULL);

CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "documents_update_policy" ON public.documents
  FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "documents_delete_policy" ON public.documents
  FOR DELETE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- Cho phép anon đọc tài liệu mẫu hệ thống (owner_user_id IS NULL)
CREATE POLICY "documents_anon_sample_read" ON public.documents
  FOR SELECT TO anon
  USING (owner_user_id IS NULL);

-- 5. CHÍNH SÁCH BẢO MẬT CHO PHÒNG HỌC (ROOMS)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_user_id);

DROP POLICY IF EXISTS "rooms_select_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete_policy" ON public.rooms;

CREATE POLICY "rooms_select_policy" ON public.rooms
  FOR SELECT TO authenticated, anon
  USING (is_active = true OR host_user_id = (SELECT auth.uid()));

CREATE POLICY "rooms_insert_policy" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (host_user_id = (SELECT auth.uid()) OR host_user_id IS NULL);

CREATE POLICY "rooms_update_policy" ON public.rooms
  FOR UPDATE TO authenticated
  USING (host_user_id = (SELECT auth.uid()))
  WITH CHECK (host_user_id = (SELECT auth.uid()));

CREATE POLICY "rooms_delete_policy" ON public.rooms
  FOR DELETE TO authenticated
  USING (host_user_id = (SELECT auth.uid()));

-- 6. CHÍNH SÁCH BẢO MẬT CHO HỒ SƠ NGƯỜI DÙNG (PROFILES)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- 7. CHÍNH SÁCH BẢO MẬT CHO BỘ ĐỀ VÀ LỊCH SỬ THI
DROP POLICY IF EXISTS "exam_sets_select_policy" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_insert_policy" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_update_policy" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_delete_policy" ON public.exam_sets;

CREATE POLICY "exam_sets_select_policy" ON public.exam_sets
  FOR SELECT TO authenticated, anon
  USING (creator_user_id = (SELECT auth.uid()) OR creator_user_id IS NULL);

CREATE POLICY "exam_sets_insert_policy" ON public.exam_sets
  FOR INSERT TO authenticated
  WITH CHECK (creator_user_id = (SELECT auth.uid()));

CREATE POLICY "exam_sets_update_policy" ON public.exam_sets
  FOR UPDATE TO authenticated
  USING (creator_user_id = (SELECT auth.uid()));

CREATE POLICY "exam_sets_delete_policy" ON public.exam_sets
  FOR DELETE TO authenticated
  USING (creator_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "exam_history_select_policy" ON public.exam_history;
DROP POLICY IF EXISTS "exam_history_insert_policy" ON public.exam_history;

CREATE POLICY "exam_history_select_policy" ON public.exam_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "exam_history_insert_policy" ON public.exam_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 8. THIẾT LẬP SUPABASE STORAGE CHO BUCKET DOCUMENTS (CHẾ ĐỘ PRIVATE)
-- Tạo bucket documents nếu chưa có (mặc định private: public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  20971520, -- 20 MB (20 * 1024 * 1024)
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg'];

-- Chính sách truy cập storage: chỉ truy cập folder mang user_id của chính mình
DROP POLICY IF EXISTS "documents_bucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_delete_own" ON storage.objects;

CREATE POLICY "documents_bucket_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "documents_bucket_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "documents_bucket_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
