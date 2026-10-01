# CẤU TRÚC THƯ MỤC CHI TIẾT (PROJECT STRUCTURE)
## Dự án: Real-time Collaborative AI Study Platform

Cấu trúc thư mục được thiết kế theo mô hình **Monorepo / Multi-package** phân tách rõ ràng giữa **Client (Frontend)** và **Server (Backend)**, tuân thủ nguyên tắc **Separation of Concerns (Phân tách Trách nhiệm)** giúp code khoa học, dễ tìm kiếm, dễ mở rộng và nâng cấp.

---

```text
Real-time-Collaborative-AI-Study-Platform/
├── client/                          # ================= FRONTEND (REACT + VITE) =================
│   ├── public/                      # Tài nguyên tĩnh công khai (Favicon, Audio hiệu ứng)
│   │   └── audio/                   # Âm thanh đếm ngược 3-2-1, hiệu ứng đúng/sai quiz
│   └── src/
│       ├── assets/                  # Hình ảnh, biểu tượng (Images, Icons, SVG)
│       ├── components/              # Các UI Component tái sử dụng
│       │   ├── common/              # Component dùng chung (Navbar, LoadingSpinner, Modal, Button)
│       │   ├── slide/               # Trình chiếu (SlideViewer, LaserPointerOverlay, StickyNoteLayer)
│       │   ├── quiz/                # Trò chơi trắc nghiệm (QuizCard, CountdownTimer, LeaderboardTable, Podium)
│       │   └── mindmap/             # Sơ đồ tư duy (MindmapViewer, CustomNode)
│       ├── context/                 # Quản lý Trạng thái Toàn cục (AuthContext, RoomContext, SocketContext)
│       ├── hooks/                   # Custom React Hooks (useSocket, useRAGChat, useSlideSync)
│       ├── pages/                   # Các trang màn hình chính (Mỗi file đại diện 1 trang)
│       │   ├── HomePage.jsx         # Trang chủ / Đăng nhập / Nhập mã phòng học
│       │   ├── WorkspacePage.jsx    # Trang không gian trình chiếu & học nhóm
│       │   ├── QuizBattlePage.jsx   # Trang thi đấu trắc nghiệm real-time
│       │   └── LibraryPage.jsx      # Trang quản lý thư viện tài liệu cá nhân
│       ├── services/                # Kết nối API bên ngoài
│       │   ├── api.js               # REST API Client (Axios/Fetch gọi về Backend)
│       │   ├── socket.js            # Khởi tạo & Quản lý kết nối Socket.io client
│       │   └── supabaseClient.js    # Cấu hình Supabase SDK Client
│       ├── utils/                   # Các hàm tiện ích (Format thời gian, tính điểm, validate)
│       ├── App.jsx                  # Định tuyến ứng dụng (React Router)
│       └── main.jsx                 # Điểm khởi chạy React DOM
│
├── server/                          # ================= BACKEND (NODE.JS + EXPRESS) =================
│   ├── src/
│   │   ├── config/                  # Nơi lưu các file cấu hình môi trường
│   │   │   ├── env.js               # Đọc và kiểm tra biến môi trường .env
│   │   │   ├── supabase.js          # Khởi tạo kết nối Supabase Admin
│   │   │   └── gemini.js            # Cấu hình SDK Google Gemini AI
│   │   ├── controllers/             # Tầng điều khiển (Tiếp nhận HTTP request & trả về response)
│   │   │   ├── documentController.js# Xử lý Upload & Bóc tách file PDF/PPTX
│   │   │   ├── aiController.js      # Xử lý lệnh tạo Quiz, Mindmap, Chat RAG
│   │   │   └── roomController.js    # Xử lý Tạo mã phòng & Kiểm tra phòng học
│   │   ├── middlewares/             # Các bộ lọc trung gian (Xử lý lỗi, Kiểm tra Auth, Multer upload)
│   │   │   ├── uploadMiddleware.js  # Giới hạn file upload (VD: tối đa 20MB, chỉ nhận PDF/PPTX)
│   │   │   └── errorHandler.js      # Bắt lỗi toàn cục giúp server không bị crash
│   │   ├── routes/                  # Định tuyến REST API
│   │   │   ├── documentRoutes.js    # /api/documents (upload, list)
│   │   │   ├── aiRoutes.js          # /api/ai (generate-quiz, generate-mindmap, chat)
│   │   │   └── roomRoutes.js        # /api/rooms (create, verify)
│   │   ├── services/                # Tầng nghiệp vụ lõi (Business Logic & AI Processing)
│   │   │   ├── pdfService.js        # Bóc tách chữ từ tệp PDF (dùng pdf-parse)
│   │   │   ├── geminiService.js     # Gọi Gemini API ép kiểu JSON Structured Output
│   │   │   └── ragService.js        # Trích xuất đoạn văn bản phục vụ RAG Chat
│   │   ├── sockets/                 # QUAN TRỌNG: Quản lý thời gian thực Socket.io
│   │   │   ├── index.js             # Khởi tạo & Đăng ký tất cả sự kiện Socket
│   │   │   ├── roomHandler.js       # Sự kiện Tham gia / Rời phòng
│   │   │   ├── slideHandler.js      # Sự kiện Lật slide, Laser pointer, Sticky notes
│   │   │   └── quizHandler.js       # Sự kiện Bắt đầu Quiz, Đếm ngược, Gửi đáp án, Leaderboard
│   │   └── index.js                 # File chính khởi chạy Express Server & Socket.io Server
│   └── package.json
│
├── .gitignore                       # Bỏ qua node_modules, file .env, build outputs
├── REQUIREMENTS.md                  # Tài liệu Yêu cầu Phần mềm (SRS)
├── DEVELOPMENT_GUIDE.md             # Hướng dẫn Kỹ thuật & Lộ trình học tập
└── PROJECT_STRUCTURE.md             # File hướng dẫn Cấu trúc Thư mục này
```

---

## MÔ TẢ CHI TIẾT VÀ NGUYÊN TẮC PHÂN CHIA THƯ MỤC

### 1. Thư mục `client/src/components/` (Các mảnh ghép UI)
* **`common/`**: Chứa các nút bấm (Button), ô nhập (Input), vòng quay nạp trang (LoadingSpinner) dùng ở nhiều trang.
* **`slide/`**: Chứa toàn bộ các component phục vụ trình chiếu (Viewer, nét vẽ, con trỏ laser).
* **`quiz/`**: Chứa đồng hồ đếm ngược, thẻ câu hỏi, bảng xếp hạng và màn vinh danh Top 3.
* **`mindmap/`**: Chứa sơ đồ tư duy tương tác.

### 2. Thư mục `client/src/context/` (Bộ nhớ dùng chung)
* **`SocketContext.jsx`**: Giúp bất kỳ trang hay component nào cũng có thể gửi/lắng nghe tín hiệu Socket mà không phải tạo lại kết nối nhiều lần.
* **`RoomContext.jsx`**: Lưu trữ thông tin phòng hiện tại (Ai là Host, danh sách người dùng đang online, trang slide hiện tại).

### 3. Thư mục `server/src/sockets/` (Trái tim Real-time)
* **`slideHandler.js`**: Khi Chủ phòng chuyển slide ➔ Lắng nghe event `JOIN_ROOM`, `CHANGE_SLIDE` ➔ Bắn tín hiệu `SLIDE_CHANGED` đến tất cả mọi người trong phòng.
* **`quizHandler.js`**: Quản lý vòng thi đấu ➔ Kích hoạt đồng hồ đếm ngược trên Server ➔ Thu nhận câu trả lời ➔ Tính điểm tốc độ ➔ Bắn Bảng xếp hạng mới về cho Client.

### 4. Thư mục `server/src/services/` (Xử lý nghiệp vụ nặng)
* **`geminiService.js`**: Chịu trách nhiệm gửi dữ liệu slide cho Gemini API và đảm bảo AI trả về câu hỏi đúng chuẩn 100% không bị lỗi.
