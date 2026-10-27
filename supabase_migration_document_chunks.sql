-- ==============================================================================
-- PEERMIND SUPABASE MIGRATION: THÊM CỘT CHUNKS CHO BẢNG DOCUMENTS
-- Mục tiêu:
--  1. Thêm cột chunks (JSONB) lưu các đoạn văn bản ~1.500 ký tự dùng cho AI RAG
--  2. Mỗi chunk bắt buộc có trường page là số trang thật chứa đoạn đó
--  3. Ràng buộc kiểm tra cấu trúc JSONB mảng và giới hạn dung lượng an toàn (< 5MB)
-- ==============================================================================

-- 1. Thêm cột chunks vào bảng documents nếu chưa có
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS chunks JSONB;

-- 2. Đặt ràng buộc kiểm tra kiểu JSONB mảng và dung lượng
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS chk_documents_chunks_limits;

ALTER TABLE public.documents
  ADD CONSTRAINT chk_documents_chunks_limits
  CHECK (
    chunks IS NULL
    OR (
      jsonb_typeof(chunks) = 'array'
      AND pg_column_size(chunks) < 5000000
    )
  );

-- 3. Tạo comment tài liệu hóa
COMMENT ON COLUMN public.documents.chunks IS 'Danh sách các đoạn văn bản ~1.500 ký tự dùng cho AI RAG, mỗi phần tử có dạng {"page": N, "text": "..."} với N là trang thật';

-- 4. Đảm bảo cấu trúc total_pages và pages_content đúng chuẩn
COMMENT ON COLUMN public.documents.total_pages IS 'Tổng số trang thật của tài liệu (1 trang PDF = 1 trang, 1 slide PPTX = 1 trang, 1 trang Word = 1 trang)';
COMMENT ON COLUMN public.documents.pages_content IS 'Danh sách các trang thật của tài liệu dạng [{"page": 1, "text": "..."}, ...]';
