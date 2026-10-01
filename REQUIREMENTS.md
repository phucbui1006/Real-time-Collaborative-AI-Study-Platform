# YÊU CẦU PHẦN MỀM (SOFTWARE REQUIREMENTS SPECIFICATION)
## Dự án: Real-time Collaborative AI Study Platform (Nền tảng Học tập Nhóm Tương tác AI)

---

## 1. TỔNG QUAN DỰ ÁN & TẦM NHÌN (PRODUCT VISION)

### 1.1 Tầm nhìn Sản phẩm
Xây dựng một **Nền tảng Học tập Nhóm Tương tác Thời gian thực Hỗ trợ bởi AI**, biến các tài liệu tĩnh (PDF, PPTX) thành không gian học tập tương tác, trực quan và trò chơi hóa (gamified). Hệ thống giúp nhóm học sinh/sinh viên tiết kiệm thời gian chuẩn bị học liệu, nâng cao khả năng ghi nhớ và tạo sự hứng thú thông qua thi đấu trắc nghiệm trực tiếp.

### 1.2 Bài toán Giải quyết
* **Học tập thụ động:** Thay thế việc đọc slide nhàm chán bằng tương tác hai chiều.
* **Tốn thời gian chuẩn bị:** AI tự động bóc tách slide, tạo ngân hàng câu hỏi ôn tập và dựng sơ đồ tư duy.
* **Tương tác nhóm rời rạc:** Đồng bộ màn hình trình chiếu và ghi chú theo thời gian thực cho tất cả thành viên trong phòng học.

---

## 2. PHẠM VI SẢN PHẨM (PRODUCT SCOPE)

### 2.1 Trong phạm vi (In-Scope)
* **Xử lý Tài liệu & AI:** Tải lên PDF/PPTX, bóc tách cấu trúc slide, tự động sinh bộ câu hỏi trắc nghiệm (có giải thích), tạo sơ đồ tư duy (Mindmap) và hỏi đáp RAG theo tài liệu.
* **Không gian Tương tác:** Trình chiếu slide đồng bộ thời gian thực giữa Chủ phòng (Host) và Thành viên (Viewer), con trỏ laser, bút vẽ, tô sáng và ghi chú dán (Sticky notes).
* **Phòng thi đấu Quiz (Gamified Battle):** Tạo phòng học bằng mã code, phòng chờ điểm danh, thi đấu trắc nghiệm đếm ngược thời gian thực, tính điểm thông minh (độ chính xác + tốc độ + chuỗi thắng), bảng xếp hạng trực tiếp và báo cáo lỗ hổng kiến thức.
* **Lưu trữ cá nhân:** Lưu lịch sử tài liệu, bộ câu hỏi và kết quả thi đấu.

### 2.2 Nằm ngoài phạm vi (Out-of-Scope)
* Tích hợp cuộc gọi Video/Audio mã hóa nặng (khuyên dùng kết hợp với Google Meet/Discord/Zoom song song).
* Chỉnh sửa cấu trúc file PDF/PPTX gốc.
* Hệ thống quản lý trường học LMS diện rộng (Chấm điểm học bạ, quản lý học phí, kỳ thi chính thức).

---

## 3. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

### FR1: Phân hệ Quản lý & Xử lý Tài liệu AI (RAG Engine)
* **FR1.1 - Tải & Phân tích Tài liệu:**
  * Cho phép người dùng tải lên tệp PDF hoặc PPTX.
  * Hệ thống tự động trích xuất văn bản, tiêu đề, cấu trúc slide và phân loại theo trang.
* **FR1.2 - Sinh Ngân hàng Câu hỏi Tự động:**
  * AI sinh danh sách câu hỏi trắc nghiệm phân cấp độ khó (Dễ, Trung bình, Khó).
  * Hỗ trợ các dạng câu hỏi: Chọn 1 đáp án, Chọn nhiều đáp án, Đúng/Sai.
  * Mỗi câu hỏi bắt buộc đi kèm giải thích đáp án và số trang slide tham chiếu.
* **FR1.3 - Dựng Sơ đồ Tư duy (Mindmap):**
  * AI tự động chuyển đổi tài liệu thành sơ đồ hình cây (Root ➔ Chương ➔ Chủ đề ➔ Khái niệm).
  * Hỗ trợ tương tác click vào nhánh để xem tóm tắt hoặc di chuyển đến slide tương ứng.
* **FR1.4 - Trợ lý AI Hỏi đáp (RAG Chat):**
  * Khung chat hỏi đáp giới hạn trong phạm vi tài liệu tải lên (không tự bịa thông tin).
  * Trích dẫn chính xác số trang slide nguồn trong mỗi câu trả lời.

### FR2: Không gian Trình chiếu & Tương tác Slide (Interactive Workspace)
* **FR2.1 - Trình chiếu Slide Tương tác:**
  * Hiển thị slide sắc nét, hỗ trợ xem dạng danh sách, dạng lưới thumbnail và toàn màn hình.
* **FR2.2 - Đồng bộ Màn hình thời gian thực:**
  * Khi Chủ phòng (Host) lật slide, màn hình của các Thành viên tự động chuyển trang theo (Follow Mode).
  * Cho phép Thành viên chuyển sang chế độ Tự do đọc (Free Read Mode) và có nút "Quay lại Chủ phòng".
* **FR2.3 - Công cụ Tương tác trên Slide:**
  * Con trỏ laser đồng bộ vị trí rê chuột của Chủ phòng.
  * Vẽ tự do, tô sáng (Highlight) đoạn văn bản.
  * Thêm ghi chú dán (Sticky notes) trực tiếp trên slide.

### FR3: Phòng học Thi đấu Trắc nghiệm (Gamified Quiz Room)
* **FR3.1 - Quản lý Phòng & Phòng chờ:**
  * Tạo phòng học với Mã phòng 6 số ngẫu nhiên hoặc liên kết mời nhanh.
  * Phòng chờ hiển thị danh sách người chơi, nút "Sẵn sàng" và thả emoji biểu cảm.
* **FR3.2 - Luồng Thi đấu Trực tiếp (Battle Mode):**
  * Chủ phòng bấm bắt đầu trận đấu dựa trên bộ câu hỏi đã chọn.
  * Đồng bộ đếm ngược thời gian làm bài (10s - 30s/câu) trên tất cả thiết bị.
  * Khóa nhận đáp án khi hết giờ và hiển thị ngay đáp án đúng/sai kèm giải thích.
* **FR3.3 - Tính điểm & Bảng xếp hạng Sống:**
  * Tính điểm = Điểm gốc đáp án đúng + Thưởng tốc độ trả lời + Thưởng chuỗi thắng (Streak).
  * Cập nhật Bảng xếp hạng sống (Live Leaderboard) ngay sau mỗi câu hỏi.
* **FR3.4 - Tổng kết & Thống kê Kiến thức:**
  * Vinh danh Top 3 người chơi cao điểm nhất.
  * Thống kê các câu hỏi có tỉ lệ trả lời sai cao nhất và cung cấp nút "Giảng lại câu này" để mở lại slide gốc.

### FR4: Quản lý Cá nhân (Personal Workspace)
* **FR4.1 - Thư viện Cá nhân:** Lưu trữ danh sách tài liệu đã tải lên và bộ câu hỏi AI tương ứng.
* **FR4.2 - Chế độ Tự học (Solo Mode):** Cho phép cá nhân tự làm bài kiểm tra trắc nghiệm mà không cần tạo phòng nhóm.

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

### NFR1: Hiệu năng & Thời gian thực (Performance & Real-time)
* Độ trễ đồng bộ slide và cập nhật điểm số quiz phải đạt mức **sub-second (< 1 giây)**.
* Hệ thống chịu tải mượt mà khi nhiều người chơi cùng gửi đáp án tại giây cuối cùng của đồng hồ đếm ngược.

### NFR2: Trải nghiệm & Giao diện (UX/UI & Usability)
* Màn hình trình chiếu và quản lý tối ưu cho Máy tính (Laptop/Desktop).
* Giao diện chọn đáp án Quiz tối ưu chuẩn thao tác Chạm/Vuốt trên Di động (Mobile-friendly).

### NFR3: Độ chính xác & An toàn AI (AI Accuracy & Guardrails)
* Giới hạn tri thức của AI chặt chẽ theo tài liệu được cung cấp (Strict RAG grounding).
* Cấu trúc JSON dữ liệu AI trả về phải chính xác 100% để giao diện render sơ đồ tư duy và câu hỏi không bị lỗi.

### NFR4: Bảo mật & Quyền riêng tư (Security & Privacy)
* Mã phòng học được tạo ngẫu nhiên, chỉ người có mã hoặc link mới có thể tham gia.
* Tài liệu người dùng tải lên được bảo mật theo tài khoản cá nhân/phòng học.

---

## 5. KỊCH BẢN NGƯỜI DÙNG ĐỂ NGHỆM THU (USER ACCEPTANCE SCENARIOS)

1. **Kịch bản 1 (Tải & Sinh dữ liệu):** Người dùng tải lên slide 20 trang ➔ AI bóc tách trong vài giây, hiển thị Mindmap và sinh 15 câu hỏi trắc nghiệm có kèm giải thích.
2. **Kịch bản 2 (Học nhóm Synchronous):** Chủ phòng mở slide 5 ➔ Màn hình 3 bạn khác lập tức nhảy sang slide 5. Bạn A dán sticky note ➔ Cả phòng cùng thấy.
3. **Kịch bản 3 (Thi đấu Quiz):** Chủ phòng bấm "Bắt đầu Quiz" ➔ 4 người chơi cùng làm bài trên điện thoại ➔ Hết 15s hiển thị ngay Bảng xếp hạng và xem câu nào sai nhiều nhất để ôn lại.
