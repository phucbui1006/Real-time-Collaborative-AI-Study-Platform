-- ==============================================================================
-- PEERMIND SUPABASE TEST SCRIPT: KIỂM THỬ BẢO MẬT RLS CHO DOCUMENTS & AI_CHAT
-- Chức năng: Giả lập 2 người dùng (User A và User B) để kiểm chứng:
--   1. User B KHÔNG THỂ đọc tài liệu hoặc đoạn chat của User A.
--   2. User B KHÔNG THỂ sửa (UPDATE) hoặc xóa (DELETE) tài liệu của User A.
--   3. User B KHÔNG THỂ giả mạo User A để insert tài liệu (chống Impersonation).
--   4. User B KHÔNG THỂ chèn chat vào tài liệu của User A.
--   5. Ràng buộc CHECK từ chối tài liệu vượt quá 500 trang.
--
-- Lưu ý: Toàn bộ kịch bản chạy trong 1 TRANSACTION và ROLLBACK ở cuối,
--        hoàn toàn KHÔNG để lại dữ liệu rác trong CSDL production.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_user_a_id uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b_id uuid := '22222222-2222-2222-2222-222222222222';
  v_doc_a_id bigint;
  v_chat_a_id bigint;
  v_count int;
  v_error_caught boolean;
BEGIN
  RAISE NOTICE '>>> BẮT ĐẦU KIỂM THỬ RLS DOCUMENTS & AI_CONVERSATIONS <<<';

  INSERT INTO auth.users (id, email, aud, role)
  VALUES 
    (v_user_a_id, 'user_a@peermind.test', 'authenticated', 'authenticated'),
    (v_user_b_id, 'user_b@peermind.test', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- 1. USER A TẠO TÀI LIỆU VÀ ĐOẠN CHAT
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_user_a_id);
  SET LOCAL ROLE authenticated;

  INSERT INTO public.documents (filename, original_name, subject, total_pages, pages_content, owner_user_id)
  VALUES ('tai_lieu_a.docx', 'Tài liệu A của Phúc', 'Toán học', 5, '["Trang 1", "Trang 2", "Trang 3", "Trang 4", "Trang 5"]'::jsonb, v_user_a_id)
  RETURNING id INTO v_doc_a_id;

  INSERT INTO public.ai_conversations (document_id, user_id, session_id, session_title, question, answer)
  VALUES (v_doc_a_id, v_user_a_id, 'default', 'Phiên 1', 'Giải thích công thức', 'Công thức là...')
  RETURNING id INTO v_chat_a_id;

  SELECT count(*) INTO v_count FROM public.documents WHERE id = v_doc_a_id;
  ASSERT v_count = 1, 'LỖI: User A không đọc được tài liệu của chính mình!';

  SELECT count(*) INTO v_count FROM public.ai_conversations WHERE document_id = v_doc_a_id;
  ASSERT v_count = 1, 'LỖI: User A không đọc được chat của chính mình!';

  RAISE NOTICE ' [PASS] User A tạo và đọc thành công tài liệu (ID: %) và lịch sử chat.', v_doc_a_id;

  -- 2. USER B THỬ ĐỌC (SELECT) DỮ LIỆU CỦA USER A -> PHẢI TRẢ VỀ 0 DÒNG
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s", "role": "authenticated"}''', v_user_b_id);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_count FROM public.documents WHERE id = v_doc_a_id;
  ASSERT v_count = 0, 'LỖI BẢO MẬT: User B đọc lén được tài liệu của User A!';
  RAISE NOTICE ' [PASS] RLS chặn User B đọc tài liệu của User A (Kết quả: 0 dòng).';

  SELECT count(*) INTO v_count FROM public.ai_conversations WHERE document_id = v_doc_a_id;
  ASSERT v_count = 0, 'LỖI BẢO MẬT: User B đọc lén được lịch sử chat của User A!';
  RAISE NOTICE ' [PASS] RLS chặn User B đọc lịch sử chat của User A (Kết quả: 0 dòng).';

  -- 3. USER B THỬ SỬA (UPDATE) HOẶC XÓA (DELETE) TÀI LIỆU CỦA USER A
  UPDATE public.documents SET filename = 'da_bi_hack.docx' WHERE id = v_doc_a_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'LỖI BẢO MẬT: User B sửa được tài liệu của User A!';
  RAISE NOTICE ' [PASS] RLS chặn User B cập nhật (UPDATE) tài liệu của User A (0 dòng bị ảnh hưởng).';

  DELETE FROM public.documents WHERE id = v_doc_a_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'LỖI BẢO MẬT: User B xóa được tài liệu của User A!';
  RAISE NOTICE ' [PASS] RLS chặn User B xóa (DELETE) tài liệu của User A (0 dòng bị ảnh hưởng).';

  -- 4. USER B THỬ MẠO DANH (IMPERSONATE) USER A ĐỂ INSERT TÀI LIỆU
  v_error_caught := false;
  BEGIN
    INSERT INTO public.documents (filename, original_name, subject, owner_user_id)
    VALUES ('fake_by_b.docx', 'File giả', 'Lậu', v_user_a_id);
  EXCEPTION WHEN row_security_violation THEN
    v_error_caught := true;
  END;
  ASSERT v_error_caught = true, 'LỖI BẢO MẬT: User B giả mạo gán owner_user_id cho User A thành công!';
  RAISE NOTICE ' [PASS] RLS WITH CHECK chặn User B mạo danh gán owner_user_id của User A.';

  -- 5. USER B THỬ GỬI CHAT VÀO TÀI LIỆU CỦA USER A
  v_error_caught := false;
  BEGIN
    INSERT INTO public.ai_conversations (document_id, user_id, session_id, question, answer)
    VALUES (v_doc_a_id, v_user_b_id, 'hack', 'Câu hỏi lén', 'Trả lời lén');
  EXCEPTION WHEN row_security_violation THEN
    v_error_caught := true;
  END;
  ASSERT v_error_caught = true, 'LỖI BẢO MẬT: User B chèn được chat vào tài liệu của User A!';
  RAISE NOTICE ' [PASS] RLS WITH CHECK chặn User B chat vào tài liệu của người khác.';

  -- 6. KIỂM THỬ RÀNG BUỘC CHECK (TỐI ĐA 500 TRANG)
  v_error_caught := false;
  BEGIN
    INSERT INTO public.documents (filename, original_name, subject, total_pages, pages_content, owner_user_id)
    SELECT 
      'doc_501_pages.docx', 
      'File quá dài', 
      'Toán', 
      501, 
      jsonb_agg(('Trang ' || i)::text), 
      v_user_b_id
    FROM generate_series(1, 501) AS i;
  EXCEPTION WHEN check_violation THEN
    v_error_caught := true;
  END;
  ASSERT v_error_caught = true, 'LỖI RÀNG BUỘC: Cho phép upload tài liệu vượt quá 500 trang!';
  RAISE NOTICE ' [PASS] Ràng buộc CHECK chặn thành công tài liệu vượt quá 500 trang.';

  RAISE NOTICE '>>> TẤT CẢ 6 KỊCH BẢN BẢO MẬT ĐỀU VƯỢT QUA XUẤT SẮC (100% PASS) <<<';
END $$;

ROLLBACK;
