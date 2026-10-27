-- ==============================================================================
-- PERMIND SUPABASE MIGRATION: CẤP QUYỀN LƯU ẢNH TRANG VÀO STORAGE BUCKET 'SLIDES'
-- Mục tiêu: Cho phép lưu ảnh chụp từng trang PDF và tài liệu lên Supabase Storage
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> Dán toàn bộ nội dung này và bấm RUN
-- ==============================================================================

-- 1. Đảm bảo bucket 'slides' là public và cho phép các định dạng ảnh phổ biến
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slides',
  'slides',
  true,
  20971520, -- 20 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- 2. Thiết lập RLS policies cho bảng storage.objects đối với bucket 'slides'
DROP POLICY IF EXISTS "slides_public_select" ON storage.objects;
DROP POLICY IF EXISTS "slides_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "slides_public_update" ON storage.objects;

-- Cho phép đọc công khai tất cả ảnh trong bucket slides
CREATE POLICY "slides_public_select" ON storage.objects
  FOR SELECT TO public, anon, authenticated
  USING (bucket_id = 'slides');

-- Cho phép người dùng (cả khách và thành viên) tải ảnh trang tài liệu lên
CREATE POLICY "slides_public_insert" ON storage.objects
  FOR INSERT TO public, anon, authenticated
  WITH CHECK (bucket_id = 'slides');

CREATE POLICY "slides_public_update" ON storage.objects
  FOR UPDATE TO public, anon, authenticated
  USING (bucket_id = 'slides')
  WITH CHECK (bucket_id = 'slides');
