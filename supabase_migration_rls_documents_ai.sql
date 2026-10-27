-- ==============================================================================
-- PERMIND SUPABASE MIGRATION: RLS HARDENING FOR DOCUMENTS & AI_CONVERSATIONS
-- Mục tiêu: Chỉ chủ sở hữu mới đọc/ghi được tài liệu và lịch sử chat của mình
-- Hỗ trợ: Quản lý nhiều phiên trò chuyện (Sessions) cho từng tài liệu
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> Dán toàn bộ nội dung này và bấm RUN
-- ==============================================================================

-- 1. BẢO ĐẢM CẤU TRÚC BẢNG VÀ KHÓA NGOẠI LIÊN KẾT AUTH.USERS
-- ------------------------------------------------------------------------------
-- 1.1. Thêm cột owner_user_id vào bảng documents nếu chưa có
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_user_id);

-- 1.2. Thêm cột user_id, session_id, session_title vào bảng ai_conversations
ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS session_id text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS session_title text DEFAULT 'Cuộc trò chuyện chính';

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_doc_session ON public.ai_conversations(document_id, session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_doc_user ON public.ai_conversations(document_id, user_id);


-- 2. THÊM RÀNG BUỘC CHECK GIỚI HẠN KÍCH THƯỚC VÀ SỐ TRANG CHO PAGES_CONTENT
-- ------------------------------------------------------------------------------
-- Giới hạn:
--  - Dung lượng mảng pages_content < 5,000,000 bytes (~5MB)
--  - Số trang tối đa: 500 trang
--  - Phải có định dạng jsonb array
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS chk_documents_pages_content_limits;

ALTER TABLE public.documents
  ADD CONSTRAINT chk_documents_pages_content_limits
  CHECK (
    pages_content IS NULL
    OR (
      jsonb_typeof(pages_content) = 'array'
      AND jsonb_array_length(pages_content) <= 500
      AND pg_column_size(pages_content) < 5000000
    )
  );


-- 3. HÀM KIỂM TRA QUYỀN TRUY CẬP TÀI LIỆU CHIA SẺ TRONG PHÒNG HỌC (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_shared_document(_document_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms r
    INNER JOIN public.room_members rm ON rm.room_id = r.id
    WHERE r.document_id = _document_id
      AND r.is_active = true
      AND rm.is_online = true
      AND (
        rm.user_name = COALESCE(auth.jwt() ->> 'email', auth.jwt() ->> 'sub', '')
        OR rm.user_name = (SELECT auth.uid())::text
      )
  );
$$;

-- Thu hồi quyền thực thi từ public và anon, chỉ cấp cho authenticated
REVOKE EXECUTE ON FUNCTION public.can_access_shared_document(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_document(bigint) TO authenticated;


-- 4. BẬT RLS VÀ THIẾT LẬP CHÍNH SÁCH BẢO MẬT CHO BẢNG DOCUMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read documents" ON public.documents;
DROP POLICY IF EXISTS "Public insert documents" ON public.documents;
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_anon_sample_read" ON public.documents;

-- 4.1. Policy SELECT: Chủ sở hữu đọc được tài liệu của mình, HOẶC thành viên phòng học được chia sẻ
CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR public.can_access_shared_document(id)
  );

-- 4.2. Policy INSERT: Chỉ chủ sở hữu được tạo tài liệu và WITH CHECK bắt buộc gán chính mình
CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
  );

-- 4.3. Policy UPDATE: Chỉ chủ sở hữu mới được sửa tài liệu của mình, WITH CHECK không cho đổi chủ
CREATE POLICY "documents_update_policy" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
  );

-- 4.4. Policy DELETE: Chỉ chủ sở hữu mới được xóa tài liệu
CREATE POLICY "documents_delete_policy" ON public.documents
  FOR DELETE TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
  );


-- 5. BẬT RLS VÀ THIẾT LẬP CHÍNH SÁCH BẢO MẬT CHO BẢNG AI_CONVERSATIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Public insert ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_select_policy" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_insert_policy" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_update_policy" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_delete_policy" ON public.ai_conversations;

-- 5.1. Policy SELECT: Chỉ chủ sở hữu câu chat ĐỒNG THỜI tài liệu đó phải thuộc về chính họ
CREATE POLICY "ai_conversations_select_policy" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  );

-- 5.2. Policy INSERT: Chỉ được thêm chat cho tài liệu của chính mình và user_id là chính mình
CREATE POLICY "ai_conversations_insert_policy" ON public.ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  );

-- 5.3. Policy UPDATE: Ngăn chặn sửa đổi tin nhắn nếu không phải chủ sở hữu
CREATE POLICY "ai_conversations_update_policy" ON public.ai_conversations
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  );

-- 5.4. Policy DELETE: Chỉ được xóa lịch sử chat của chính mình và trên tài liệu của mình
CREATE POLICY "ai_conversations_delete_policy" ON public.ai_conversations
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  );
