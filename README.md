# Real-time-Collaborative-AI-Study-Platform


1. Phân hệ Quản lý & Xử lý Tài liệu AI (AI Knowledge Processing Engine)
- Tiếp nhận & Chuẩn hóa tài liệu:
+ Cho phép người dùng tải lên tài liệu định dạng PDF hoặc PPTX.
+ Hệ thống bóc tách chính xác văn bản, cấu trúc slide, tiêu đề và hình ảnh đi kèm.
- Tự động khởi tạo ngân hàng câu hỏi (Auto-Quiz Generation):
+ Tự động đọc hiểu nội dung slide và tạo ra các bộ câu hỏi trắc nghiệm (nhiều lựa chọn).
+ Mỗi câu hỏi bắt buộc đi kèm giải thích chi tiết đáp án đúng/sai dựa trên nội dung slide.
- Hỏi đáp trực tiếp trên tài liệu (Contextual AI Chat/RAG):
+ Cung cấp giao diện chat cá nhân cho phép người dùng đặt câu hỏi sâu về nội dung tài liệu đang xem.
+ Câu trả lời của AI phải bám sát ngữ cảnh của slide và dẫn nguồn trang tài liệu tương ứng.


2. Phân hệ Không gian Trình chiếu & Tương tác Nhóm (Interactive Workspace)
- Trình chiếu tài liệu trực quan (Document Viewer):
+ Hiển thị sắc nét nội dung slide/PDF trên cả giao diện máy tính và thiết bị di động.
- Đồng bộ màn hình thời gian thực (Real-time Presentation Sync):
+ Khi Chủ phòng (Host) chuyển trang hoặc thao tác trên slide, màn hình của toàn bộ Thành viên (Participants) trong phòng phải lập tức chuyển theo mà không cần tải lại trang.
- Công cụ tương tác & Ghi chú (Collaborative Annotation):
+ Cho phép chủ phòng gắn thẻ ghi chú (Sticky notes), tô sáng (Highlight) đoạn văn bản hoặc vẽ trực tiếp lên slide trong quá trình thảo luận.
+ Chat phòng cho mọi người và hiển thị tức thì cho tất cả mọi người trong phòng.

3. Phân hệ Phòng học Nhóm & Thi đấu Trắc nghiệm (Gamified Quiz Room)
- Quản lý phòng học (Room Management):
+ Cho phép tạo phòng học với mã phòng (Room Code) ngắn gọn hoặc đường dẫn tham gia nhanh (Invite Link).
+ Hiển thị danh sách thành viên đang có mặt trong phòng theo trạng thái thực tế (Online).
- Chế độ thi đấu trắc nghiệm thời gian thực (Quiz Battle Mode):
+ Chủ phòng có quyền kích hoạt lượt thi đấu dựa trên bộ câu hỏi AI đã + tạo.
+ Đếm ngược thời gian làm bài chung cho tất cả người chơi theo từng câu hỏi.
- Hệ thống tự động ghi nhận câu trả lời và chấm điểm tức thì.
+ Thuật toán tính điểm & Bảng xếp hạng (Scoring & Real-time Leaderboard)
+ Điểm số được tính dựa trên độ chính xác kết hợp với tốc độ trả lời (trả lời càng nhanh và đúng thì xếp hạng cao).
+ Bảng xếp hạng cập nhật điểm số và thứ hạng ngay sau mỗi câu hỏi.
- Tổng kết & Quản lý vòng đấu:
+ Chủ phòng có quyền tạm dừng, chuyển câu hỏi hoặc kết thúc bài thi.
+ Hiển thị báo cáo tổng kết kết quả thi đấu, vinh danh người chiến thắng và thống kê các câu hỏi có tỉ lệ làm sai cao nhất để nhóm cùng ôn lại.