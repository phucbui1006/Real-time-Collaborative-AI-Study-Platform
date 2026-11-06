-- ==============================================================================
-- MIGRATION: NÂNG CẤP VAI TRÒ THÀNH VIÊN PHÒNG HỌC (HOST | SPEAKER | VIEWER)
-- Bổ sung vai trò 3 cấp, mặc định là 'viewer', cập nhật dữ liệu cũ an toàn
-- ==============================================================================

-- 1. Bổ sung check constraint và giá trị mặc định cho cột role trong room_members
ALTER TABLE IF EXISTS public.room_members 
  ALTER COLUMN role SET DEFAULT 'viewer';

-- 2. Cập nhật các bản ghi cũ: chuyển 'member' hoặc null thành 'viewer', giữ nguyên 'host'
UPDATE public.room_members 
  SET role = 'viewer' 
  WHERE role = 'member' OR role IS NULL;

-- 3. Đảm bảo ràng buộc kiểm tra hợp lệ
ALTER TABLE IF EXISTS public.room_members 
  DROP CONSTRAINT IF EXISTS check_room_member_role;

ALTER TABLE IF EXISTS public.room_members 
  ADD CONSTRAINT check_room_member_role 
  CHECK (role IN ('host', 'speaker', 'viewer'));

-- 4. Bổ sung cột is_hand_raised trong room_members để lưu trạng thái giơ tay nếu cần
ALTER TABLE IF EXISTS public.room_members 
  ADD COLUMN IF NOT EXISTS is_hand_raised BOOLEAN DEFAULT false;

-- 5. Cập nhật RLS Policy cho room_members để hỗ trợ speaker và host
DROP POLICY IF EXISTS "room_members_update_policy" ON public.room_members;

CREATE POLICY "room_members_update_policy" ON public.room_members
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_user_id = (SELECT auth.uid()))
  );
