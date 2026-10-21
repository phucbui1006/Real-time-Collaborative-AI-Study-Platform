-- ==============================================================================
-- SUPABASE MIGRATION: PHÂN QUYỀN DỮ LIỆU RIÊNG TƯ THEO USER (USER-SCOPED DATA)
-- Chạy đoạn script này trong: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. BẢNG TÀI LIỆU (documents)
-- Thêm cột owner_user_id liên kết với tài khoản đăng nhập (auth.users)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tạo index để tăng tốc độ tìm kiếm tài liệu theo user
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_user_id);

-- Bật Row Level Security (RLS) cho documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ nếu có để tránh trùng lặp
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Policy: User chỉ xem tài liệu của mình (hoặc tài liệu mẫu hệ thống nếu owner_user_id IS NULL)
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = owner_user_id OR owner_user_id IS NULL);

-- Policy: User chỉ thêm tài liệu cho chính mình
CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

-- Policy: User chỉ sửa tài liệu của mình
CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = owner_user_id);

-- Policy: User chỉ xóa tài liệu của mình
CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = owner_user_id);


-- 2. BẢNG PHÒNG HỌC (rooms)
-- Thêm cột host_user_id liên kết với chủ phòng (auth.users)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_user_id);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active rooms or own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Hosts can update own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Hosts can delete own rooms" ON public.rooms;

-- Policy: Xem phòng đang hoạt động (để người khác có thể join bằng mã phòng) hoặc phòng do mình làm host
CREATE POLICY "Users can view active rooms or own rooms" ON public.rooms
  FOR SELECT USING (is_active = true OR auth.uid() = host_user_id);

-- Policy: Tạo phòng mới gán chủ phòng
CREATE POLICY "Users can insert own rooms" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = host_user_id OR host_user_id IS NULL);

-- Policy: Chỉ chủ phòng mới được sửa phòng (đổi slide, đổi trạng thái)
CREATE POLICY "Hosts can update own rooms" ON public.rooms
  FOR UPDATE USING (auth.uid() = host_user_id);

-- Policy: Chỉ chủ phòng mới được xóa hoặc đóng phòng
CREATE POLICY "Hosts can delete own rooms" ON public.rooms
  FOR DELETE USING (auth.uid() = host_user_id);


-- 3. BẢNG BỘ CÂU HỎI & BÀI KIỂM TRA (exam_sets)
CREATE TABLE IF NOT EXISTS public.exam_sets (
  id text PRIMARY KEY,
  creator_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  title text NOT NULL,
  minutes int DEFAULT 10,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_sets_creator ON public.exam_sets(creator_user_id);

ALTER TABLE public.exam_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exam sets" ON public.exam_sets;
DROP POLICY IF EXISTS "Users can insert own exam sets" ON public.exam_sets;
DROP POLICY IF EXISTS "Users can update own exam sets" ON public.exam_sets;
DROP POLICY IF EXISTS "Users can delete own exam sets" ON public.exam_sets;

CREATE POLICY "Users can view own exam sets" ON public.exam_sets
  FOR SELECT USING (auth.uid() = creator_user_id OR creator_user_id IS NULL);

CREATE POLICY "Users can insert own exam sets" ON public.exam_sets
  FOR INSERT WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Users can update own exam sets" ON public.exam_sets
  FOR UPDATE USING (auth.uid() = creator_user_id);

CREATE POLICY "Users can delete own exam sets" ON public.exam_sets
  FOR DELETE USING (auth.uid() = creator_user_id);


-- 4. BẢNG LỊCH SỬ THI ĐẤU (exam_history)
CREATE TABLE IF NOT EXISTS public.exam_history (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  score numeric(4,1) NOT NULL,
  rank int DEFAULT 1,
  of_total int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_history_user ON public.exam_history(user_id);

ALTER TABLE public.exam_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own exam history" ON public.exam_history;
DROP POLICY IF EXISTS "Users can insert own exam history" ON public.exam_history;

CREATE POLICY "Users can view own exam history" ON public.exam_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam history" ON public.exam_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
