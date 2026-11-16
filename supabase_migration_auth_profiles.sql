-- ==============================================================================
-- PEERMIND MIGRATION: HOÀN THIỆN PROFILES, USERNAME AUTH, TRIGGER & RLS
-- Chạy toàn bộ file này trong Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Kích hoạt extension citext (hỗ trợ so sánh không phân biệt hoa/thường nếu cần)
CREATE EXTENSION IF NOT EXISTS citext;

-- 2. CHUẨN HÓA BẢNG public.profiles THEO YÊU CẦU MỤC 2.5
--    id (uuid, khóa ngoại tới auth.users ON DELETE CASCADE)
--    username (unique, không phân biệt hoa/thường qua unique index lower(username))
--    display_name, avatar_url, created_at
--    KHÔNG lưu / hiển thị cột email trong bảng này.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Bổ sung cột mới nếu bảng profiles đã tồn tại từ schema cũ
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW());

-- Chuyển dữ liệu từ cột full_name cũ sang display_name (nếu có) trước khi chuẩn hóa
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET display_name = COALESCE(display_name, full_name) WHERE display_name IS NULL';
    ALTER TABLE public.profiles ALTER COLUMN full_name DROP NOT NULL;
  END IF;
END $$;

-- XÓA CỘT email KHỎI public.profiles ĐỂ TUYỆT ĐỐI KHÔNG LỘ EMAIL QUA CLIENT
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Đảm bảo khóa ngoại id -> auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Dọn các dòng mồ côi không khớp auth.users trước khi gắn FK
    DELETE FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ràng buộc định dạng username: 3-20 ký tự, chỉ chữ thường a-z, số 0-9, dấu gạch dưới _
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_username_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

-- Unique Index không phân biệt hoa/thường trên lower(username)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;


-- 3. DANH SÁCH TÊN NGƯỜI DÙNG BỊ CẤM & HÀM KIỂM TRA USERNAME HỢP LỆ
CREATE OR REPLACE FUNCTION public.is_reserved_username(p_username text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(BTRIM(COALESCE(p_username, ''))) = ANY (ARRAY[
    'admin', 'administrator', 'root', 'system', 'support', 'help',
    'peermind', 'permind', 'moderator', 'mod', 'staff', 'official',
    'api', 'auth', 'login', 'register', 'logout', 'settings',
    'profile', 'user', 'users', 'guest', 'anonymous', 'null', 'undefined',
    'supabase', 'google', 'security', 'bot', 'ai', 'teacher', 'host'
  ]);
$$;

-- 4. HÀM RPC CÔNG KHAI KIỂM TRA TRÙNG USERNAME (KHÔNG LỘ EMAIL HAY USER ID)
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean text := LOWER(BTRIM(COALESCE(p_username, '')));
  v_uid uuid := auth.uid();
  v_exists boolean := false;
BEGIN
  IF LENGTH(v_clean) < 3 OR LENGTH(v_clean) > 20 THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'invalid_length',
      'message', 'Tên người dùng phải từ 3 đến 20 ký tự.'
    );
  END IF;

  IF v_clean !~ '^[a-z0-9_]{3,20}$' THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'invalid_chars',
      'message', 'Chỉ được dùng chữ thường (a-z), chữ số (0-9) và dấu gạch dưới (_).'
    );
  END IF;

  IF public.is_reserved_username(v_clean) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'reserved',
      'message', 'Tên người dùng này nằm trong danh sách bị cấm hoặc được bảo lưu.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE LOWER(p.username) = v_clean
      AND (v_uid IS NULL OR p.id <> v_uid)
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'taken',
      'message', 'Tên này đã có người dùng'
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'reason', 'ok',
    'message', 'Tên người dùng hợp lệ'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_username_available(text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated, service_role;


-- 5. HÀM RPC DÀNH RIÊNG CHO SERVER (SERVICE_ROLE) ĐỂ TRA EMAIL TỪ USERNAME
--    VÀ KIỂM TRA PHƯƠNG THỨC ĐĂNG NHẬP (GOOGLE-ONLY HAY PASSWORD)
CREATE OR REPLACE FUNCTION public.resolve_user_auth_info(p_identifier text)
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  has_password boolean,
  providers text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_clean text := LOWER(BTRIM(COALESCE(p_identifier, '')));
BEGIN
  IF v_clean = '' THEN
    RETURN;
  END IF;

  IF POSITION('@' IN v_clean) > 0 THEN
    RETURN QUERY
    SELECT
      u.id AS user_id,
      u.email::text AS email,
      p.username AS username,
      (u.encrypted_password IS NOT NULL AND LENGTH(u.encrypted_password) > 0) AS has_password,
      ARRAY(
        SELECT DISTINCT i.provider::text
        FROM auth.identities i
        WHERE i.user_id = u.id
      ) AS providers
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(u.email) = v_clean
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT
      u.id AS user_id,
      u.email::text AS email,
      p.username AS username,
      (u.encrypted_password IS NOT NULL AND LENGTH(u.encrypted_password) > 0) AS has_password,
      ARRAY(
        SELECT DISTINCT i.provider::text
        FROM auth.identities i
        WHERE i.user_id = u.id
      ) AS providers
    FROM public.profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE LOWER(p.username) = v_clean
    LIMIT 1;
  END IF;
END;
$$;

-- CHỈ CẤP QUYỀN CHO service_role (TUYỆT ĐỐI KHÔNG CẤP CHO anon HAY authenticated)
REVOKE EXECUTE ON FUNCTION public.resolve_user_auth_info(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_auth_info(text) TO service_role;


-- 6. TRIGGER TỰ ĐỘNG TẠO PROFILE KHI CÓ USER MỚI TRONG auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_raw_username text;
  v_username text := NULL;
  v_display_name text;
  v_avatar_url text;
BEGIN
  -- Ưu tiên lấy username từ user_metadata khi đăng ký bằng form
  v_raw_username := LOWER(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'username', '')));

  IF v_raw_username ~ '^[a-z0-9_]{3,20}$'
     AND NOT public.is_reserved_username(v_raw_username)
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE LOWER(p.username) = v_raw_username) THEN
    v_username := v_raw_username;
  END IF;

  v_display_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    v_username,
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    'Sinh viên'
  );

  v_avatar_url := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'picture'), '')
  );

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at)
  VALUES (NEW.id, v_username, LEFT(v_display_name, 80), v_avatar_url, NOW())
  ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(public.profiles.username, EXCLUDED.username),
        display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
        avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();


-- 7. RLS CHO BẢNG public.profiles (MỤC 2.5)
--    - Ai đã đăng nhập (authenticated) đọc được id, username, display_name, avatar_url, created_at
--      (phục vụ phòng học, bảng xếp hạng).
--    - Chỉ chủ sở hữu được INSERT / UPDATE dòng của chính mình.
--    - Chặn chọn username nằm trong danh sách cấm ngay ở tầng RLS WITH CHECK.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
    AND (
      username IS NULL
      OR (
        username ~ '^[a-z0-9_]{3,20}$'
        AND NOT public.is_reserved_username(username)
      )
    )
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND (
      username IS NULL
      OR (
        username ~ '^[a-z0-9_]{3,20}$'
        AND NOT public.is_reserved_username(username)
      )
    )
  );


-- 8. BỔ SUNG RLS POLICY CHO BẢNG public.room_documents (MỤC 2.7)
--    (Bảng này đã ENABLE ROW LEVEL SECURITY nhưng trước đó chưa có policy tường minh)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'room_documents'
  ) THEN
    ALTER TABLE public.room_documents ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "room_documents_select_policy" ON public.room_documents';
    EXECUTE 'DROP POLICY IF EXISTS "room_documents_write_policy" ON public.room_documents';

    EXECUTE $pol$
      CREATE POLICY "room_documents_select_policy" ON public.room_documents
        FOR SELECT TO authenticated
        USING (public.is_room_participant(room_id));
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "room_documents_write_policy" ON public.room_documents
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
    $pol$;
  END IF;
END $$;
