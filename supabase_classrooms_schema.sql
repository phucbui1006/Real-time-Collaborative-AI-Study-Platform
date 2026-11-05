-- ==============================================================================
-- PERMIND CLASSROOMS SCHEMA & RLS MIGRATION
-- Bổ sung schema phòng học, bảng room_documents, phân quyền RLS an toàn
-- ==============================================================================

-- 1. BẢNG PHÒNG HỌC (ROOMS)
ALTER TABLE IF EXISTS public.rooms
  ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_document_id BIGINT,
  ADD COLUMN IF NOT EXISTS current_page INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_rooms_code_active ON public.rooms (code, is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_host_user ON public.rooms (host_user_id);

-- 2. BẢNG THÀNH VIÊN TRONG PHÒNG (ROOM_MEMBERS)
CREATE TABLE IF NOT EXISTS public.room_members (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'host' | 'member'
  avatar_url TEXT,
  avatar_color TEXT DEFAULT '#0ea5e9',
  is_online BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members (room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members (user_id);

-- 3. BẢNG BẢN SAO TÀI LIỆU TRÌNH CHIẾU CỦA PHÒNG (ROOM_DOCUMENTS)
CREATE TABLE IF NOT EXISTS public.room_documents (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES public.rooms(id) ON DELETE CASCADE,
  original_document_id BIGINT REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  total_pages INT DEFAULT 1,
  pages_content JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_documents_room ON public.room_documents (room_id);

-- 4. BẢNG TIN NHẮN PHÒNG HỌC (ROOM_MESSAGES)
CREATE TABLE IF NOT EXISTS public.room_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON public.room_messages (room_id, created_at ASC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Hàm bảo mật kiểm tra thành viên phòng (Security Definer tránh đệ quy RLS)
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id AND (
      r.host_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_members rm
        WHERE rm.room_id = _room_id AND rm.user_id = auth.uid()
      )
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_room_participant(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_room_participant(bigint) TO authenticated;

-- Policies: ROOMS
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

-- Policies: ROOM_MEMBERS
DROP POLICY IF EXISTS "room_members_select_policy" ON public.room_members;
DROP POLICY IF EXISTS "room_members_insert_policy" ON public.room_members;
DROP POLICY IF EXISTS "room_members_update_policy" ON public.room_members;
DROP POLICY IF EXISTS "room_members_delete_policy" ON public.room_members;

CREATE POLICY "room_members_select_policy" ON public.room_members
  FOR SELECT TO authenticated
  USING (is_room_participant(room_id) OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.is_active = true));

CREATE POLICY "room_members_insert_policy" ON public.room_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "room_members_update_policy" ON public.room_members
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())));

CREATE POLICY "room_members_delete_policy" ON public.room_members
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())));

-- Policies: ROOM_DOCUMENTS
DROP POLICY IF EXISTS "room_documents_select_policy" ON public.room_documents;
DROP POLICY IF EXISTS "room_documents_insert_policy" ON public.room_documents;
DROP POLICY IF EXISTS "room_documents_update_policy" ON public.room_documents;
DROP POLICY IF EXISTS "room_documents_delete_policy" ON public.room_documents;

CREATE POLICY "room_documents_select_policy" ON public.room_documents
  FOR SELECT TO authenticated
  USING (is_room_participant(room_id));

CREATE POLICY "room_documents_insert_policy" ON public.room_documents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())));

CREATE POLICY "room_documents_update_policy" ON public.room_documents
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())));

CREATE POLICY "room_documents_delete_policy" ON public.room_documents
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid())));

-- Policies: ROOM_MESSAGES
DROP POLICY IF EXISTS "room_messages_select_policy" ON public.room_messages;
DROP POLICY IF EXISTS "room_messages_insert_policy" ON public.room_messages;

CREATE POLICY "room_messages_select_policy" ON public.room_messages
  FOR SELECT TO authenticated
  USING (is_room_participant(room_id));

CREATE POLICY "room_messages_insert_policy" ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_room_participant(room_id) AND (sender_id = (SELECT auth.uid()) OR sender_id IS NULL));
