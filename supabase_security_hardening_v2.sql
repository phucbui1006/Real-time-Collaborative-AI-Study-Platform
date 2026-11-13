-- ==============================================================================
-- PERMIND SUPABASE SECURITY HARDENING MIGRATION (V2)
-- Hợp nhất và siết chặt bảo mật: RLS toàn diện, chống lộ password_hash,
-- chống lộ đáp án bài thi, Storage path isolation và RPC SECURITY DEFINER.
--
-- Hướng dẫn chạy:
--   Mở Supabase Dashboard -> SQL Editor -> New Query -> Dán toàn bộ -> Run.
-- ==============================================================================

-- 1. KÍCH HOẠT EXTENSION MÃ HÓA
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ĐẢM BẢO CÁC CỘT PHÂN QUYỀN TỒN TẠI TRƯỚC KHI ÁP DỤNG POLICY
ALTER TABLE IF EXISTS public.documents
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.rooms
  ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_document_id BIGINT,
  ADD COLUMN IF NOT EXISTS current_page INT DEFAULT 0;

ALTER TABLE IF EXISTS public.room_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_hand_raised BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS public.ai_conversations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS session_id TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS session_title TEXT DEFAULT 'Cuộc trò chuyện chính';

ALTER TABLE IF EXISTS public.exam_submissions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Cho phép đầy đủ các role hợp lệ trong room_members (kể cả exam_participant)
ALTER TABLE IF EXISTS public.room_members
  DROP CONSTRAINT IF EXISTS check_room_member_role;

ALTER TABLE IF EXISTS public.room_members
  ADD CONSTRAINT check_room_member_role
  CHECK (role IN ('host', 'speaker', 'viewer', 'member', 'exam_participant'));

-- 3. CHẶN TUYỆT ĐỐI ĐỌC TRỰC TIẾP CỘT rooms.password_hash TỪ BROWSER
--    Browser chỉ được SELECT các cột an toàn; mật khẩu chỉ được kiểm tra qua Server hoặc RPC.
REVOKE SELECT ON public.rooms FROM anon, authenticated;
GRANT SELECT (
  id,
  name,
  code,
  document_id,
  is_active,
  max_members,
  current_document_id,
  current_page,
  created_at,
  host_user_id
) ON public.rooms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rooms TO authenticated;

-- 4. BẬT ROW LEVEL SECURITY CHO TOÀN BỘ BẢNG TRONG SCHEMA PUBLIC
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_documents ENABLE ROW LEVEL SECURITY;
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

-- 5. CÁC HÀM HELPER PHÂN QUYỀN (SECURITY DEFINER, KHÔNG BỊ ĐỆ QUY RLS)
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = _room_id
      AND (
        r.host_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.room_members rm
          WHERE rm.room_id = _room_id
            AND rm.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_room_participant(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_room_participant(bigint) TO authenticated;

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
    WHERE (r.document_id = _document_id OR r.current_document_id = _document_id)
      AND r.is_active = true
      AND (
        r.host_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.room_members rm
          WHERE rm.room_id = r.id
            AND rm.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_shared_document(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_access_shared_document(bigint) TO authenticated;

-- 6. GỠ BỎ TOÀN BỘ POLICY CÔNG KHAI CŨ VÀ ÁP DỤNG POLICY MỚI

-- 6.1 DOCUMENTS
DROP POLICY IF EXISTS "Public read documents" ON public.documents;
DROP POLICY IF EXISTS "Public insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_anon_sample_read" ON public.documents;

CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR owner_user_id IS NULL
    OR public.can_access_shared_document(id)
  );

CREATE POLICY "documents_anon_sample_read" ON public.documents
  FOR SELECT TO anon
  USING (owner_user_id IS NULL);

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

-- 6.2 AI_CONVERSATIONS
DROP POLICY IF EXISTS "Public read ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Public insert ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_select_policy" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_insert_policy" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_update_policy" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conversations_delete_policy" ON public.ai_conversations;

CREATE POLICY "ai_conversations_select_policy" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND (d.owner_user_id = (SELECT auth.uid()) OR d.owner_user_id IS NULL)
    )
  );

CREATE POLICY "ai_conversations_insert_policy" ON public.ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND (d.owner_user_id = (SELECT auth.uid()) OR d.owner_user_id IS NULL)
    )
  );

CREATE POLICY "ai_conversations_update_policy" ON public.ai_conversations
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND (d.owner_user_id = (SELECT auth.uid()) OR d.owner_user_id IS NULL)
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND (d.owner_user_id = (SELECT auth.uid()) OR d.owner_user_id IS NULL)
    )
  );

CREATE POLICY "ai_conversations_delete_policy" ON public.ai_conversations
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ai_conversations.document_id
        AND (d.owner_user_id = (SELECT auth.uid()) OR d.owner_user_id IS NULL)
    )
  );

-- 6.3 MINDMAPS
DROP POLICY IF EXISTS "Public read mindmaps" ON public.mindmaps;
DROP POLICY IF EXISTS "Public insert mindmaps" ON public.mindmaps;
DROP POLICY IF EXISTS "mindmaps_select_policy" ON public.mindmaps;
DROP POLICY IF EXISTS "mindmaps_insert_policy" ON public.mindmaps;
DROP POLICY IF EXISTS "mindmaps_update_policy" ON public.mindmaps;
DROP POLICY IF EXISTS "mindmaps_delete_policy" ON public.mindmaps;

CREATE POLICY "mindmaps_select_policy" ON public.mindmaps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = mindmaps.document_id
        AND (
          d.owner_user_id = (SELECT auth.uid())
          OR d.owner_user_id IS NULL
          OR public.can_access_shared_document(d.id)
        )
    )
  );

CREATE POLICY "mindmaps_insert_policy" ON public.mindmaps
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = mindmaps.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "mindmaps_update_policy" ON public.mindmaps
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = mindmaps.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = mindmaps.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "mindmaps_delete_policy" ON public.mindmaps
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = mindmaps.document_id
        AND d.owner_user_id = (SELECT auth.uid())
    )
  );

-- 6.4 ROOMS
DROP POLICY IF EXISTS "Public read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Public insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view active rooms or own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can insert own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Hosts can update own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Hosts can delete own rooms" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_anon_sample_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_policy" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete_policy" ON public.rooms;

CREATE POLICY "rooms_select_policy" ON public.rooms
  FOR SELECT TO authenticated
  USING (
    host_user_id = (SELECT auth.uid())
    OR public.is_room_participant(id)
    OR is_active = true
  );

CREATE POLICY "rooms_anon_sample_select" ON public.rooms
  FOR SELECT TO anon
  USING (host_user_id IS NULL AND is_active = true);

CREATE POLICY "rooms_insert_policy" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (host_user_id = (SELECT auth.uid()));

CREATE POLICY "rooms_update_policy" ON public.rooms
  FOR UPDATE TO authenticated
  USING (host_user_id = (SELECT auth.uid()))
  WITH CHECK (host_user_id = (SELECT auth.uid()));

CREATE POLICY "rooms_delete_policy" ON public.rooms
  FOR DELETE TO authenticated
  USING (host_user_id = (SELECT auth.uid()));

-- 6.5 ROOM_MEMBERS (Không cho phép tự nâng role lên 'host' hoặc 'speaker')
DROP POLICY IF EXISTS "Public read room_members" ON public.room_members;
DROP POLICY IF EXISTS "Public insert room_members" ON public.room_members;
DROP POLICY IF EXISTS "room_members_select_policy" ON public.room_members;
DROP POLICY IF EXISTS "room_members_insert_policy" ON public.room_members;
DROP POLICY IF EXISTS "room_members_update_policy" ON public.room_members;
DROP POLICY IF EXISTS "room_members_delete_policy" ON public.room_members;

CREATE POLICY "room_members_select_policy" ON public.room_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_room_participant(room_id)
  );

CREATE POLICY "room_members_insert_policy" ON public.room_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      role IN ('viewer', 'member', 'exam_participant')
      OR (
        role = 'host'
        AND EXISTS (
          SELECT 1 FROM public.rooms r
          WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY "room_members_update_policy" ON public.room_members
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
    )
    OR (
      user_id = (SELECT auth.uid())
      AND role IN ('viewer', 'member', 'exam_participant')
    )
  );

CREATE POLICY "room_members_delete_policy" ON public.room_members
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
    )
  );

-- 6.6 ROOM_MESSAGES & ROOM_ANNOTATIONS
DROP POLICY IF EXISTS "Public read room_messages" ON public.room_messages;
DROP POLICY IF EXISTS "Public insert room_messages" ON public.room_messages;
DROP POLICY IF EXISTS "room_messages_select_policy" ON public.room_messages;
DROP POLICY IF EXISTS "room_messages_insert_policy" ON public.room_messages;

CREATE POLICY "room_messages_select_policy" ON public.room_messages
  FOR SELECT TO authenticated
  USING (public.is_room_participant(room_id));

CREATE POLICY "room_messages_insert_policy" ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_room_participant(room_id)
    AND sender_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Public read room_annotations" ON public.room_annotations;
DROP POLICY IF EXISTS "Public insert room_annotations" ON public.room_annotations;
DROP POLICY IF EXISTS "room_annotations_select_policy" ON public.room_annotations;
DROP POLICY IF EXISTS "room_annotations_write_policy" ON public.room_annotations;

CREATE POLICY "room_annotations_select_policy" ON public.room_annotations
  FOR SELECT TO authenticated
  USING (public.is_room_participant(room_id));

CREATE POLICY "room_annotations_write_policy" ON public.room_annotations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_id
        AND rm.user_id = (SELECT auth.uid())
        AND rm.role IN ('host', 'speaker')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_id
        AND rm.user_id = (SELECT auth.uid())
        AND rm.role IN ('host', 'speaker')
    )
  );

-- 6.7 EXAMS, QUESTIONS, EXAM_SUBMISSIONS, EXAM_SETS, EXAM_HISTORY, PROFILES
DROP POLICY IF EXISTS "Public read exams" ON public.exams;
DROP POLICY IF EXISTS "Public read questions" ON public.questions;
DROP POLICY IF EXISTS "exams_select_policy" ON public.exams;
DROP POLICY IF EXISTS "questions_blocked_direct_select" ON public.questions;
DROP POLICY IF EXISTS "exam_submissions_select_own" ON public.exam_submissions;
DROP POLICY IF EXISTS "exam_submissions_insert_own" ON public.exam_submissions;

CREATE POLICY "exams_select_policy" ON public.exams
  FOR SELECT TO authenticated
  USING (true);

-- Chặn đọc trực tiếp questions.answer_idx qua REST API
CREATE POLICY "questions_blocked_direct_select" ON public.questions
  FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY "exam_submissions_select_own" ON public.exam_submissions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "exam_submissions_insert_own" ON public.exam_submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own exam sets" ON public.exam_sets;
DROP POLICY IF EXISTS "Users can insert own exam sets" ON public.exam_sets;
DROP POLICY IF EXISTS "Users can update own exam sets" ON public.exam_sets;
DROP POLICY IF EXISTS "Users can delete own exam sets" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_select_policy" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_insert_policy" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_update_policy" ON public.exam_sets;
DROP POLICY IF EXISTS "exam_sets_delete_policy" ON public.exam_sets;

CREATE POLICY "exam_sets_select_policy" ON public.exam_sets
  FOR SELECT TO authenticated
  USING (creator_user_id = (SELECT auth.uid()));

CREATE POLICY "exam_sets_insert_policy" ON public.exam_sets
  FOR INSERT TO authenticated
  WITH CHECK (creator_user_id = (SELECT auth.uid()));

CREATE POLICY "exam_sets_update_policy" ON public.exam_sets
  FOR UPDATE TO authenticated
  USING (creator_user_id = (SELECT auth.uid()))
  WITH CHECK (creator_user_id = (SELECT auth.uid()));

CREATE POLICY "exam_sets_delete_policy" ON public.exam_sets
  FOR DELETE TO authenticated
  USING (creator_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own exam history" ON public.exam_history;
DROP POLICY IF EXISTS "Users can insert own exam history" ON public.exam_history;
DROP POLICY IF EXISTS "exam_history_select_policy" ON public.exam_history;
DROP POLICY IF EXISTS "exam_history_insert_policy" ON public.exam_history;
DROP POLICY IF EXISTS "exam_history_delete_policy" ON public.exam_history;

CREATE POLICY "exam_history_select_policy" ON public.exam_history
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "exam_history_insert_policy" ON public.exam_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "exam_history_delete_policy" ON public.exam_history
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.room_members rm1
      JOIN public.room_members rm2 ON rm1.room_id = rm2.room_id
      WHERE rm1.user_id = (SELECT auth.uid())
        AND rm2.user_id = profiles.id
    )
  );

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));


-- 7. BẢNG ĐỀ THI TRỰC TUYẾN & CHẤM ĐIỂM PHÍA SERVER (CHỐNG LỘ ĐÁP ÁN)
CREATE TABLE IF NOT EXISTS public.live_exams (
  code VARCHAR(12) PRIMARY KEY,
  room_id BIGINT REFERENCES public.rooms(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_payload JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.live_exam_submissions (
  id BIGSERIAL PRIMARY KEY,
  exam_code VARCHAR(12) NOT NULL REFERENCES public.live_exams(code) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  answered INT NOT NULL DEFAULT 0,
  correct INT NOT NULL DEFAULT 0,
  score NUMERIC(4, 1) NOT NULL DEFAULT 0,
  done BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (exam_code, user_id)
);

ALTER TABLE public.live_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_exam_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_exams_host_only" ON public.live_exams;
CREATE POLICY "live_exams_host_only" ON public.live_exams
  FOR ALL TO authenticated
  USING (host_user_id = (SELECT auth.uid()))
  WITH CHECK (host_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "live_exam_submissions_select_policy" ON public.live_exam_submissions;
CREATE POLICY "live_exam_submissions_select_policy" ON public.live_exam_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.live_exams le
      WHERE le.code = live_exam_submissions.exam_code
        AND le.host_user_id = (SELECT auth.uid())
    )
    OR (user_id = (SELECT auth.uid()) AND done = true)
  );


-- 8. CÁC HÀM RPC BẢO MẬT (PHÒNG HỌC & BÀI KIỂM TRA)

-- 8.1 Tạo phòng an toàn với bcrypt hash trong Postgres
CREATE OR REPLACE FUNCTION public.create_room_secure(
  p_name text,
  p_code varchar DEFAULT NULL,
  p_password text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  name text,
  code varchar,
  is_active boolean,
  host_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code varchar(6);
  v_hash text := NULL;
  v_room public.rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Bạn cần đăng nhập để tạo phòng học.';
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Tên phòng không được để trống.';
  END IF;

  IF p_code IS NOT NULL AND BTRIM(p_code) ~ '^\d{6}$' THEN
    IF EXISTS (SELECT 1 FROM public.rooms r WHERE r.code = BTRIM(p_code)) THEN
      RAISE EXCEPTION 'Mã phòng đã tồn tại.';
    END IF;
    v_code := BTRIM(p_code);
  ELSE
    LOOP
      v_code := LPAD(FLOOR(100000 + RANDOM() * 900000)::text, 6, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.code = v_code);
    END LOOP;
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_password, '')), '') IS NOT NULL THEN
    v_hash := crypt(BTRIM(p_password), gen_salt('bf', 10));
  END IF;

  INSERT INTO public.rooms (name, code, password_hash, host_user_id, is_active)
  VALUES (LEFT(BTRIM(p_name), 120), v_code, v_hash, v_uid, true)
  RETURNING * INTO v_room;

  INSERT INTO public.room_members (room_id, user_id, user_name, role, is_online)
  VALUES (
    v_room.id,
    v_uid,
    COALESCE(NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), auth.jwt() ->> 'email', 'Chủ phòng'),
    'host',
    true
  )
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_room.id, v_room.name, v_room.code, v_room.is_active, v_room.host_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_room_secure(text, varchar, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_room_secure(text, varchar, text) TO authenticated;

-- 8.2 Kiểm tra mật khẩu phòng và ghi nhận quyền thành viên
CREATE OR REPLACE FUNCTION public.verify_room_access(
  p_code varchar,
  p_password text DEFAULT ''
)
RETURNS TABLE (
  id bigint,
  name text,
  code varchar,
  document_id bigint,
  is_active boolean,
  host_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_room public.rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Bạn cần đăng nhập để tham gia phòng học.';
  END IF;

  SELECT r.* INTO v_room
  FROM public.rooms r
  WHERE r.code = BTRIM(COALESCE(p_code, ''))
    AND r.is_active = true
  LIMIT 1;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy phòng học đang hoạt động với mã này.';
  END IF;

  IF v_room.host_user_id IS DISTINCT FROM v_uid
     AND v_room.password_hash IS NOT NULL
     AND LENGTH(v_room.password_hash) > 0 THEN
    IF COALESCE(p_password, '') = '' THEN
      RAISE EXCEPTION 'Mật khẩu phòng không chính xác.';
    END IF;

    IF v_room.password_hash LIKE '$2%' THEN
      IF crypt(p_password, v_room.password_hash) <> v_room.password_hash THEN
        RAISE EXCEPTION 'Mật khẩu phòng không chính xác.';
      END IF;
    ELSE
      -- Hỗ trợ nếu hash được tạo từ backend Node.js bằng scrypt -> yêu cầu đi qua /api/rooms/verify
      RAISE EXCEPTION 'Phòng này yêu cầu xác thực qua máy chủ Realtime.';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = v_room.id AND rm.user_id = v_uid
  ) THEN
    INSERT INTO public.room_members (room_id, user_id, user_name, role, is_online)
    VALUES (
      v_room.id,
      v_uid,
      COALESCE(NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), auth.jwt() ->> 'email', 'Thành viên'),
      CASE WHEN v_room.host_user_id = v_uid THEN 'host' ELSE 'viewer' END,
      true
    );
  END IF;

  RETURN QUERY SELECT v_room.id, v_room.name, v_room.code, v_room.document_id, v_room.is_active, v_room.host_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_room_access(varchar, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.verify_room_access(varchar, text) TO authenticated;

-- 8.3 Xuất bản bài kiểm tra trực tuyến (tách riêng answer_key khỏi payload công khai)
CREATE OR REPLACE FUNCTION public.publish_live_exam(
  p_code varchar,
  p_public_payload jsonb,
  p_answer_key jsonb,
  p_end_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code varchar(12) := BTRIM(COALESCE(p_code, ''));
  v_room_id bigint;
  v_existing_host uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Bạn cần đăng nhập để mở phòng thi.';
  END IF;

  IF v_clean_code = '' THEN
    RAISE EXCEPTION 'Mã phòng thi không hợp lệ.';
  END IF;

  SELECT le.host_user_id INTO v_existing_host
  FROM public.live_exams le
  WHERE le.code = v_clean_code
  LIMIT 1;

  IF v_existing_host IS NOT NULL AND v_existing_host IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Mã phòng thi này đang thuộc sở hữu của người dùng khác.';
  END IF;

  UPDATE public.rooms
  SET is_active = false
  WHERE code = v_clean_code
    AND (host_user_id = v_uid OR host_user_id IS NULL);

  INSERT INTO public.rooms (name, code, is_active, host_user_id)
  VALUES (p_public_payload::text, v_clean_code, true, v_uid)
  ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        is_active = true,
        host_user_id = v_uid
    WHERE public.rooms.host_user_id = v_uid
       OR (public.rooms.host_user_id IS NULL AND public.rooms.is_active = false)
  RETURNING id INTO v_room_id;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Không thể cấp phòng với mã này vì đã có người sở hữu.';
  END IF;

  DELETE FROM public.live_exam_submissions WHERE exam_code = v_clean_code;

  INSERT INTO public.live_exams (code, room_id, host_user_id, public_payload, answer_key, is_active, end_at)
  VALUES (v_clean_code, v_room_id, v_uid, p_public_payload, COALESCE(p_answer_key, '{}'::jsonb), true, p_end_at)
  ON CONFLICT (code) DO UPDATE
    SET room_id = EXCLUDED.room_id,
        public_payload = EXCLUDED.public_payload,
        answer_key = EXCLUDED.answer_key,
        is_active = true,
        end_at = EXCLUDED.end_at;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_live_exam(varchar, jsonb, jsonb, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.publish_live_exam(varchar, jsonb, jsonb, timestamptz) TO authenticated;

-- 8.4 Lấy đề thi công khai (KHÔNG bao gồm answer_key)
CREATE OR REPLACE FUNCTION public.get_live_exam_public(
  p_code varchar,
  p_active_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_code varchar(12) := BTRIM(COALESCE(p_code, ''));
  v_le public.live_exams%ROWTYPE;
BEGIN
  IF v_clean_code = '' THEN
    RETURN NULL;
  END IF;

  SELECT le.* INTO v_le
  FROM public.live_exams le
  WHERE le.code = v_clean_code
    AND (NOT p_active_only OR le.is_active = true)
  LIMIT 1;

  IF v_le.code IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'room_id', v_le.room_id,
    'public_payload', v_le.public_payload,
    'is_active', v_le.is_active,
    'end_at', v_le.end_at,
    'host_user_id', v_le.host_user_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_live_exam_public(varchar, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.get_live_exam_public(varchar, boolean) TO authenticated, anon;

-- 8.5 Nộp bài & chấm điểm trực tiếp trong PostgreSQL
CREATE OR REPLACE FUNCTION public.submit_live_exam_answers(
  p_code varchar,
  p_participant_name text,
  p_answers jsonb,
  p_question_order text[],
  p_done boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code varchar(12) := BTRIM(COALESCE(p_code, ''));
  v_le public.live_exams%ROWTYPE;
  v_total int := 0;
  v_answered int := 0;
  v_correct int := 0;
  v_score numeric(4, 1) := 0;
  v_per_q jsonb := '[]'::jsonb;
  v_qid text;
  v_submitted_val text;
  v_key_val text;
  v_allow_retake boolean := true;
  v_prev_done boolean := false;
  v_safe_name text := LEFT(COALESCE(NULLIF(BTRIM(p_participant_name), ''), 'Thí sinh'), 80);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Bạn cần đăng nhập để nộp bài thi.';
  END IF;

  SELECT le.* INTO v_le
  FROM public.live_exams le
  WHERE le.code = v_clean_code
  LIMIT 1;

  IF v_le.code IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy bài thi.';
  END IF;

  IF NOT v_le.is_active AND NOT p_done THEN
    RAISE EXCEPTION 'Phòng thi đã kết thúc.';
  END IF;

  IF NOW() > v_le.end_at + INTERVAL '60 seconds' AND NOT p_done THEN
    RAISE EXCEPTION 'Đã hết thời gian làm bài.';
  END IF;

  v_allow_retake := COALESCE((v_le.public_payload -> 'exam' ->> 'allowRetake')::boolean, true);

  SELECT les.done INTO v_prev_done
  FROM public.live_exam_submissions les
  WHERE les.exam_code = v_clean_code AND les.user_id = v_uid;

  IF COALESCE(v_prev_done, false) AND NOT v_allow_retake THEN
    RAISE EXCEPTION 'Bạn đã hoàn thành bài thi và chủ phòng không cho phép làm lại.';
  END IF;

  -- Duyệt theo answer_key để đếm tổng số câu & số câu đúng
  SELECT COUNT(*) INTO v_total FROM jsonb_object_keys(v_le.answer_key);

  IF p_question_order IS NOT NULL AND array_length(p_question_order, 1) > 0 THEN
    FOREACH v_qid IN ARRAY p_question_order LOOP
      v_submitted_val := p_answers ->> v_qid;
      v_key_val := v_le.answer_key ->> v_qid;

      IF v_submitted_val IS NULL THEN
        v_per_q := v_per_q || 'null'::jsonb;
      ELSE
        v_answered := v_answered + 1;
        IF v_key_val IS NOT NULL AND v_submitted_val = v_key_val THEN
          v_correct := v_correct + 1;
          v_per_q := v_per_q || 'true'::jsonb;
        ELSE
          v_per_q := v_per_q || 'false'::jsonb;
        END IF;
      END IF;
    END LOOP;
  ELSE
    SELECT
      COUNT(*) FILTER (WHERE p_answers ? k),
      COUNT(*) FILTER (WHERE (p_answers ->> k) = (v_le.answer_key ->> k))
    INTO v_answered, v_correct
    FROM jsonb_object_keys(v_le.answer_key) AS k;
  END IF;

  v_score := CASE WHEN v_total > 0 THEN ROUND((v_correct::numeric / v_total::numeric) * 10, 1) ELSE 0 END;

  INSERT INTO public.live_exam_submissions (
    exam_code, user_id, participant_name, answers, answered, correct, score, done, updated_at
  )
  VALUES (
    v_clean_code, v_uid, v_safe_name, COALESCE(p_answers, '{}'::jsonb), v_answered, v_correct, v_score, p_done, NOW()
  )
  ON CONFLICT (exam_code, user_id) DO UPDATE
    SET participant_name = EXCLUDED.participant_name,
        answers = EXCLUDED.answers,
        answered = EXCLUDED.answered,
        correct = EXCLUDED.correct,
        score = EXCLUDED.score,
        done = EXCLUDED.done,
        updated_at = NOW();

  -- Ghi tóm tắt sang room_members để tương thích UI (chỉ giữ 1 bản ghi mỗi thí sinh; ẩn correct/score khi chưa nộp)
  IF v_le.room_id IS NOT NULL THEN
    DELETE FROM public.room_members
    WHERE room_id = v_le.room_id
      AND user_id = v_uid
      AND role = 'exam_participant';

    INSERT INTO public.room_members (room_id, user_id, user_name, role, avatar_color, is_online)
    VALUES (
      v_le.room_id,
      v_uid,
      v_safe_name,
      'exam_participant',
      jsonb_build_object(
        'id', v_uid::text,
        'name', v_safe_name,
        'answered', v_answered,
        'correct', CASE WHEN p_done THEN v_correct ELSE 0 END,
        'score', CASE WHEN p_done THEN v_score ELSE 0 END,
        'done', p_done,
        'timestamp', FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)
      )::text,
      true
    );
  END IF;

  IF p_done THEN
    RETURN jsonb_build_object(
      'answered', v_answered,
      'correct', v_correct,
      'score', v_score,
      'per_q', v_per_q
    );
  END IF;

  -- Chưa nộp bài: không trả về correct/score/per_q để chống thí sinh dò đáp án từng câu
  RETURN jsonb_build_object(
    'answered', v_answered
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_live_exam_answers(varchar, text, jsonb, text[], boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_live_exam_answers(varchar, text, jsonb, text[], boolean) TO authenticated;

-- 8.6 Chủ phòng xem bảng điểm trực tiếp của tất cả thí sinh
CREATE OR REPLACE FUNCTION public.get_host_exam_participants(p_code varchar)
RETURNS TABLE (
  user_id uuid,
  participant_name text,
  answered int,
  correct int,
  score numeric,
  done boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code varchar(12) := BTRIM(COALESCE(p_code, ''));
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.live_exams le
    WHERE le.code = v_clean_code AND le.host_user_id = v_uid
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    les.user_id,
    les.participant_name,
    les.answered,
    les.correct,
    les.score,
    les.done,
    les.updated_at
  FROM public.live_exam_submissions les
  WHERE les.exam_code = v_clean_code
  ORDER BY les.score DESC, les.answered DESC, les.updated_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_host_exam_participants(varchar) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_host_exam_participants(varchar) TO authenticated;

-- 8.7 Chủ phòng đóng bài kiểm tra
CREATE OR REPLACE FUNCTION public.close_live_exam(p_code varchar)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clean_code varchar(12) := BTRIM(COALESCE(p_code, ''));
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.live_exams
  SET is_active = false
  WHERE code = v_clean_code AND host_user_id = v_uid;

  UPDATE public.rooms
  SET is_active = false
  WHERE code = v_clean_code AND host_user_id = v_uid;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_live_exam(varchar) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.close_live_exam(varchar) TO authenticated;


-- 9. SIẾT CHẶT SUPABASE STORAGE (BUCKETS: SLIDES & DOCUMENTS)
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
WHERE id = 'slides';

DROP POLICY IF EXISTS "slides_public_select" ON storage.objects;
DROP POLICY IF EXISTS "slides_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "slides_public_update" ON storage.objects;
DROP POLICY IF EXISTS "slides_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "slides_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "slides_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "slides_owner_delete" ON storage.objects;

CREATE POLICY "slides_public_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'slides');

-- Người dùng chỉ được upload/ghi đè/xóa trong đúng thư mục mang UID của mình:
--  1) <auth.uid()>/...  (file PDF/PPTX)
--  2) doc-images/<auth.uid()>/...  (ảnh render từ PDF)
CREATE POLICY "slides_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'slides'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR (
        (storage.foldername(name))[1] = 'doc-images'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  );

CREATE POLICY "slides_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'slides'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR (
        (storage.foldername(name))[1] = 'doc-images'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'slides'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR (
        (storage.foldername(name))[1] = 'doc-images'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  );

CREATE POLICY "slides_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'slides'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR (
        (storage.foldername(name))[1] = 'doc-images'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  );

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
