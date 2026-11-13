-- =============================================================================
-- PERMIND PERFORMANCE OPTIMIZATION & INDEXING SCRIPT
-- Chạy trên Supabase SQL Editor để tối ưu tốc độ truy vấn và RLS Policy
-- =============================================================================

BEGIN;

-- 1. Composite Indexes cho các truy vấn lọc + sắp xếp phổ biến nhất
CREATE INDEX IF NOT EXISTS idx_documents_owner_created
  ON public.documents (owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conv_doc_user_session_created
  ON public.ai_conversations (document_id, user_id, session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ai_conv_user_created
  ON public.ai_conversations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rooms_host_created
  ON public.rooms (host_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rooms_code_active
  ON public.rooms (code, is_active);

CREATE INDEX IF NOT EXISTS idx_room_members_room_role_joined
  ON public.room_members (room_id, role, joined_at ASC);

CREATE INDEX IF NOT EXISTS idx_room_members_user_id
  ON public.room_members (user_id);

-- 2. Tối ưu RLS Policy cho bảng ai_conversations:
-- Tránh việc ép kiểu ::text và JOIN sang bảng documents trên từng dòng khi SELECT/UPDATE/DELETE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_conversations'
  ) THEN
    DROP POLICY IF EXISTS "ai_conversations_select_own" ON public.ai_conversations;
    CREATE POLICY "ai_conversations_select_own"
      ON public.ai_conversations
      FOR SELECT
      TO authenticated
      USING (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "ai_conversations_update_own" ON public.ai_conversations;
    CREATE POLICY "ai_conversations_update_own"
      ON public.ai_conversations
      FOR UPDATE
      TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));

    DROP POLICY IF EXISTS "ai_conversations_delete_own" ON public.ai_conversations;
    CREATE POLICY "ai_conversations_delete_own"
      ON public.ai_conversations
      FOR DELETE
      TO authenticated
      USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;

COMMIT;
