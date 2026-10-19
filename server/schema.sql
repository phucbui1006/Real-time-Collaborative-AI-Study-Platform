-- ==============================================================================
-- PEERMIND DATABASE INITIALIZATION SCRIPT (SUPABASE / POSTGRESQL)
-- Chạy toàn bộ script này trong Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. BẢNG TÀI LIỆU (DOCUMENTS)
-- Lưu trữ metadata file PDF/PPTX và nội dung text từng trang sau khi bóc tách
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  subject TEXT DEFAULT 'Chung',
  total_pages INT DEFAULT 1,
  file_url TEXT,
  pages_content JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index để tìm kiếm tài liệu nhanh hơn
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_subject ON documents (subject);

-- 2. BẢNG PHÒNG HỌC (ROOMS)
-- Quản lý phòng học nhóm real-time, liên kết với tài liệu trình chiếu
CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code VARCHAR(6) UNIQUE NOT NULL,
  password_hash TEXT,
  document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index mã phòng để kiểm tra xác thực phòng siêu nhanh
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);

-- 3. BẢNG BỘ ĐỀ KIỂM TRA (EXAMS)
-- Quản lý danh sách bài kiểm tra trắc nghiệm
CREATE TABLE IF NOT EXISTS exams (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  minutes INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. BẢNG CÂU HỎI (QUESTIONS)
-- Danh sách câu hỏi và các phương án trả lời thuộc bộ đề
CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  exam_id BIGINT REFERENCES exams(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL, -- Mảng 4 đáp án: ["A", "B", "C", "D"]
  answer_idx INT NOT NULL, -- Vị trí đáp án đúng (0, 1, 2, hoặc 3)
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions (exam_id);

-- 5. BẢNG KẾT QUẢ THI (EXAM_SUBMISSIONS)
-- Lưu lại kết quả làm bài của học viên, phục vụ tính điểm & bảng xếp hạng
CREATE TABLE IF NOT EXISTS exam_submissions (
  id BIGSERIAL PRIMARY KEY,
  exam_id BIGINT REFERENCES exams(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  score NUMERIC(4, 1) DEFAULT 0,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON exam_submissions (exam_id);


-- ==============================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA / INITIAL IMPORT)
-- Chạy phần này để có sẵn dữ liệu test đẹp mắt ngay lập tức
-- ==============================================================================

-- Thêm tài liệu mẫu
INSERT INTO documents (id, filename, original_name, subject, total_pages, pages_content)
VALUES 
  (1, 'toan_cao_cap_c4.pdf', 'Toán cao cấp – Chương 4', 'Toán học', 3, 
   '["Tích phân kép trên miền chữ nhật: Định lý Fubini và cách tính tích phân lặp.", "Đổi biến số trong tích phân kép: Tọa độ cực x = r*cos(phi), y = r*sin(phi) với Jacobian là r.", "Ứng dụng hình học: Tính diện tích hình phẳng và thể tích vật thể không gian."]'::jsonb),
  (2, 'english_grammar_b1.pdf', 'Ngữ pháp tiếng Anh B1', 'Ngoại ngữ', 2,
   '["Present Perfect Tense: Have/Has + V3/ed. Used for experiences and actions with present relevance.", "Conditional Sentences: Type 1 (Real in present/future) and Type 2 (Unreal condition)."]'::jsonb),
  (3, 'tri_tue_nhan_tao.pdf', 'Giáo trình Trí tuệ nhân tạo', 'Công nghệ', 4,
   '["Kiến trúc RAG (Retrieval-Augmented Generation): Kết hợp mô hình tạo sinh LLM với cơ sở tri thức ngoài.", "Vector Embeddings và Semantic Search trong không gian đa chiều.", "Attention Mechanism và Transformer Architecture làm nền tảng cho Deep Learning hiện đại.", "Học có giám sát và bài toán phân lớp với Support Vector Machines."]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Đồng bộ sequence của id tài liệu
SELECT setval('documents_id_seq', (SELECT MAX(id) FROM documents));

-- Thêm phòng học mẫu liên kết với tài liệu
INSERT INTO rooms (id, name, code, document_id, is_active)
VALUES
  (1, 'Nhóm ôn thi Toán 12', '482913', 1, true),
  (2, 'English Speaking Club', '730256', 2, true),
  (3, 'Lập trình AI & Web', '159847', 3, true)
ON CONFLICT (code) DO NOTHING;

SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms));

-- Thêm bộ đề thi mẫu
INSERT INTO exams (id, title, subject, minutes)
VALUES
  (1, 'Kiểm tra Giải tích: Tích phân bội & Ứng dụng', 'Toán học', 15),
  (2, 'Trắc nghiệm Kiến trúc AI & RAG Studio', 'Công nghệ', 10)
ON CONFLICT (id) DO NOTHING;

SELECT setval('exams_id_seq', (SELECT MAX(id) FROM exams));

-- Thêm câu hỏi mẫu cho bài kiểm tra số 1
INSERT INTO questions (exam_id, prompt, options, answer_idx, explanation)
VALUES
  (1, 'Định lý nào cho phép chuyển tích phân kép về tích phân lặp?', 
   '["Định lý Gauss", "Định lý Fubini", "Định lý Stokes", "Định lý Green"]'::jsonb, 
   1, 'Định lý Fubini phát biểu về việc tính tích phân kép bằng hai tích phân đơn liên tiếp.'),
  (1, 'Jacobian của phép đổi biến sang toạ độ cực x = r*cos(θ), y = r*sin(θ) là bao nhiêu?', 
   '["r^2", "1/r", "r", "2r"]'::jsonb, 
   2, 'Định thức ma trận Jacobi của toạ độ cực là det(J) = r.'),
  (1, 'Tích phân kép của f(x, y) = 1 trên miền D đại diện cho đại lượng nào?', 
   '["Thể tích khối trụ", "Diện tích miền D", "Chu vi đường biên", "Độ dốc cực đại"]'::jsonb, 
   1, 'Tích phân của hàm f(x,y)=1 trên miền D chính là diện tích bề mặt của miền D.');

-- Thêm câu hỏi mẫu cho bài kiểm tra số 2
INSERT INTO questions (exam_id, prompt, options, answer_idx, explanation)
VALUES
  (2, 'Từ "RAG" trong xử lý ngôn ngữ tự nhiên viết tắt của cụm từ nào?', 
   '["Real-time Augmented Generation", "Retrieval-Augmented Generation", "Recursive Attention Graph", "Random Access Gateway"]'::jsonb, 
   1, 'RAG là viết tắt của Retrieval-Augmented Generation (Tạo sinh có truy xuất ngữ cảnh).'),
  (2, 'Ưu điểm lớn nhất của cơ chế RAG so với việc huấn luyện lại toàn bộ mô hình là gì?', 
   '["Giảm chi phí và cập nhật tri thức mới tức thì không cần retrain", "Tăng kích thước mô hình lên gấp đôi", "Chỉ chạy được trên máy tính lượng tử", "Loại bỏ hoàn toàn bước tokenize"]'::jsonb, 
   0, 'RAG cho phép nạp tài liệu mới vào Vector DB và truy xuất tức thì mà không cần tốn hàng triệu đô huấn luyện lại mô hình.');

-- ==============================================================================
-- THIẾT LẬP BẢO MẬT & QUYỀN TRUY CẬP (STORAGE & RLS)
-- ==============================================================================

-- Kích hoạt extension hỗ trợ sinh UUID nếu cần
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bật Row Level Security (RLS) và cấp quyền đọc công khai cho tài liệu học tập
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách (Policies) cho phép đọc và ghi dữ liệu học tập
CREATE POLICY "Public read documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Public insert documents" ON documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public insert rooms" ON rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read exams" ON exams FOR SELECT USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);

-- 6. BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES)
-- Lưu trữ thông tin cá nhân mở rộng liên kết với tài khoản Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  school TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. BẢNG THÀNH VIÊN TRONG PHÒNG (ROOM_MEMBERS)
-- Quản lý ai đang ở trong phòng học nào và vai trò (host/member)
CREATE TABLE IF NOT EXISTS room_members (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'host' hoặc 'member'
  avatar_color TEXT DEFAULT '#0ea5e9',
  is_online BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members (room_id);

-- 8. BẢNG TIN NHẮN PHÒNG HỌC (ROOM_MESSAGES)
-- Lưu lịch sử tin nhắn trò chuyện real-time của các thành viên trong phòng
CREATE TABLE IF NOT EXISTS room_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages (room_id);

-- 9. BẢNG NÉT VẼ & GHI CHÚ TRÌNH CHIẾU (ROOM_ANNOTATIONS)
-- Đồng bộ và lưu trữ các nét vẽ, highlight trên từng trang slide
CREATE TABLE IF NOT EXISTS room_annotations (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  slide_index INT NOT NULL DEFAULT 0,
  annotation_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_annotations_room_slide ON room_annotations (room_id, slide_index);

-- 10. BẢNG LỊCH SỬ HỎI ĐÁP AI RAG (AI_CONVERSATIONS)
-- Lưu vết các câu hỏi của học viên và câu trả lời bóc tách từ tài liệu của AI
CREATE TABLE IF NOT EXISTS ai_conversations (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_doc ON ai_conversations (document_id);

-- 11. BẢNG SƠ ĐỒ TƯ DUY AI (MINDMAPS)
-- Cấu trúc các node Mindmap được AI sinh tự động từ giáo trình
CREATE TABLE IF NOT EXISTS mindmaps (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  nodes_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mindmaps_doc ON mindmaps (document_id);

-- Dữ liệu mẫu bổ sung cho các bảng mới
INSERT INTO room_members (room_id, user_name, role, avatar_color, is_online)
VALUES
  (1, 'Minh Anh (Bạn)', 'host', '#0ea5e9', true),
  (1, 'Hà My', 'member', '#8b5cf6', true),
  (1, 'Văn Nam', 'member', '#10b981', true),
  (1, 'Thu Trang', 'member', '#f59e0b', false)
ON CONFLICT DO NOTHING;

INSERT INTO room_messages (room_id, sender_name, message)
VALUES
  (1, 'Hà My', 'Chào cả nhóm, mình vào rồi nhé!'),
  (1, 'Minh Anh (Bạn)', 'Chào My, hôm nay chúng ta ôn tập tích phân kép nhé!')
ON CONFLICT DO NOTHING;

-- Bật RLS và cấp quyền cho tất cả các bảng mới
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public insert profiles" ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read room_members" ON room_members FOR SELECT USING (true);
CREATE POLICY "Public insert room_members" ON room_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read room_messages" ON room_messages FOR SELECT USING (true);
CREATE POLICY "Public insert room_messages" ON room_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read room_annotations" ON room_annotations FOR SELECT USING (true);
CREATE POLICY "Public insert room_annotations" ON room_annotations FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read ai_conversations" ON ai_conversations FOR SELECT USING (true);
CREATE POLICY "Public insert ai_conversations" ON ai_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read mindmaps" ON mindmaps FOR SELECT USING (true);
CREATE POLICY "Public insert mindmaps" ON mindmaps FOR INSERT WITH CHECK (true);

-- Cấp quyền toàn diện cho tất cả 11 bảng
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
