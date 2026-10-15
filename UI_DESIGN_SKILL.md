---
name: peermind-ui-system
description: Hệ thống quy chuẩn thiết kế UI/UX (Design System & Anti-AI Rules) bắt buộc cho nền tảng học tập thông minh PeerMind (React + Tailwind CSS + Shadcn UI). Luôn đọc và tuân thủ tuyệt đối file này trước khi tạo mới hoặc chỉnh sửa bất kỳ component/trang nào.
---

# PEERMIND UI/UX DESIGN SYSTEM & REFACTORING SKILL

## 1. BỐI CẢNH DỰ ÁN & NGUYÊN TẮC CỐT LÕI
- **Tên sản phẩm:** PeerMind – Nền tảng học tập thông minh tích hợp AI và phòng học nhóm thời gian thực (Learn Together, Smarter with AI).
- **Tech Stack Frontend:** React, Tailwind CSS, Shadcn UI, `lucide-react` (Icons), `socket.io-client` (Real-time), `React Flow` / `Mermaid.js` (Mindmap), `pdfjs-dist` (Slide/PDF Viewer).
- **Phong cách chủ đạo:** "Crisp Academic SaaS meets Tactile Gamification" (kết hợp sự sắc nét, tối giản của Linear/Notion cho không gian đọc tài liệu và sự trực quan, sinh động của Duolingo/Kahoot! cho phòng thi đấu trắc nghiệm).
- **Nguyên tắc bảo toàn code:** Chỉ chuẩn hóa tầng giao diện (JSX, Tailwind classes, UI states). TUYỆT ĐỐI KHÔNG làm thay đổi logic xử lý, React hooks, state, props, sự kiện Socket.io, luồng gọi Google Gemini API hay cấu trúc dữ liệu Supabase.

---

## 2. LỆNH CẤM TUYỆT ĐỐI (ANTI-AI SLOP CONSTRAINTS)
Để loại bỏ hoàn toàn vẻ ngoài "web do AI tự sinh", nghiêm cấm các hành vi sau:
1. **CẤM lạm dụng Gradient lòe loẹt:** Không dùng `bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500` cho nền trang, thẻ Card hoặc nút bấm.
2. **CẤM bóng đổ dày và nhòe:** Không dùng `shadow-lg`, `shadow-xl`, `shadow-2xl` cho các thẻ nội dung thông thường.
3. **CẤM bo góc quá đà:** Không dùng `rounded-2xl`, `rounded-3xl` cho Card hoặc Button (chỉ dùng `rounded-md` hoặc `rounded-lg`).
4. **CẤM dùng Emoji thay Icon:** Tuyệt đối không chèn emoji (🚀, 📚, ✨, 🔥) vào nút bấm, tiêu đề hay thanh điều hướng.
5. **CẤM tự chế SVG hoặc trộn thư viện Icon:** Chỉ sử dụng duy nhất `lucide-react`.
6. **CẤM dùng định dạng ảnh lỗi thời:** Không dùng file `.jfif`. Chỉ sử dụng `.svg` cho logo/icon và `.webp` hoặc `.png` (nền trong suốt/trắng chuẩn) cho hình minh họa.
7. **CẤM dùng `alert()` / `confirm()` mặc định của trình duyệt:** Mọi thông báo phải hiển thị qua Toast Notification hoặc Inline Error.

---

## 3. HỆ THỐNG DESIGN TOKENS CỐ ĐỊNH

### 3.1. Bảng màu (Quy tắc 60 - 30 - 10)
- **60% Màu nền (Surfaces - Chống mỏi mắt khi đọc tài liệu lâu):**
  - Nền tổng thể trang (App Background): `bg-[#FAFAFA]` hoặc `bg-slate-50/60`.
  - Nền thẻ / Khung làm việc (Card / Surface): `bg-white`.
  - Nền phụ (Muted Surface / Sidebar / Code block): `bg-slate-100/80`.
- **30% Màu cấu trúc, Chữ & Đường viền (Typography & Borders):**
  - Chữ tiêu đề chính (Heading): `text-slate-900` (hoặc `text-indigo-950`).
  - Chữ nội dung (Body): `text-slate-700`.
  - Chữ phụ / Gợi ý (Muted text): `text-slate-500`.
  - Đường viền chuẩn (Default Border): `border border-slate-200/90` (1px sắc nét).
- **10% Màu nhấn thương hiệu & Ngữ nghĩa (Brand & Semantic Accents):**
  - Primary Accent (Indigo): `bg-indigo-600`, `text-indigo-600`, `border-indigo-600`.
  - Brand Secondary (Electric Sky Blue): `text-sky-500`, `bg-sky-500`.
  - Trạng thái Đúng / Thành công: `text-emerald-600 bg-emerald-50 border-emerald-200`.
  - Trạng thái Cảnh báo / Đếm ngược sắp hết giờ: `text-amber-600 bg-amber-50 border-amber-200`.
  - Trạng thái Sai / Lỗi: `text-rose-600 bg-rose-50 border-rose-200`.

### 3.2. Typography (Hệ thống Font chữ)
- **Heading Font:** `Plus Jakarta Sans` (hoặc `Outfit`), `font-semibold` (600) hoặc `font-bold` (700), luôn kèm `tracking-tight`.
  - Page Title (H1): `text-2xl font-bold tracking-tight text-slate-900`
  - Section Title (H2): `text-lg font-semibold tracking-tight text-slate-900`
  - Card Title (H3): `text-base font-semibold text-slate-900`
- **Body Font:** `Inter`, `font-normal` (400) hoặc `font-medium` (500), cỡ chữ chuẩn `text-sm` (14px) cho UI điều khiển và `text-base` (16px, `leading-relaxed`) cho nội dung đọc tài liệu/câu hỏi.
- **Monospace & Con số (BẮT BUỘC cho Room Code, Timer, Điểm số, Thống kê):**
  - Sử dụng `JetBrains Mono` (`font-mono`) kết hợp class `tabular-nums` để cố định độ rộng từng chữ số, tuyệt đối không để giao diện bị giật lắc khi đồng hồ đếm ngược chạy.

### 3.3. Quy chuẩn Button (Chỉ dùng đúng 4 biến thể)
- **Quy tắc chung:** Chiều cao `h-9` (36px) hoặc `h-10` (40px), `px-4 py-2`, bo góc `rounded-md` (6px), `text-sm font-medium`, `inline-flex items-center justify-center gap-2`, `transition-all duration-150 cursor-pointer`, `focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1`, `disabled:opacity-50 disabled:pointer-events-none`.
- **1. Primary Button (Hành động chính):**
  `bg-indigo-950 text-white hover:bg-indigo-900 shadow-2xs active:translate-y-[1px]` (Hoặc dùng `bg-indigo-600 text-white hover:bg-indigo-700` cho CTA nổi bật).
- **2. Secondary / Outline Button (Hành động phụ):**
  `bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs`
- **3. Ghost Button (Nút trên thanh công cụ):**
  `bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900`
- **4. Quiz Answer Button (Riêng cho 4 đáp án A, B, C, D trong Phòng thi đấu):**
  `bg-white text-slate-800 border-2 border-slate-200 rounded-lg p-4 font-medium shadow-[0_2px_0_0_#e2e8f0] hover:border-indigo-500 hover:bg-indigo-50/30 active:translate-y-[2px] active:shadow-none`

### 3.4. Quy chuẩn Icon (`lucide-react`)
- **Độ dày nét cố định:** Luôn truyền prop `strokeWidth={1.75}`.
- **Kích thước cố định:**
  - Trong Button, Badge, Input: `w-4 h-4 shrink-0`.
  - Trên Card Header hoặc Empty State nhỏ: `w-5 h-5 shrink-0`.
- **Khung bọc Icon (Nếu đứng độc lập trên Card):** Không dùng nền tròn lòe loẹt. Chỉ dùng khung vuông bo góc nhẹ:
  `w-9 h-9 rounded-md bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700`.

### 3.5. Quy chuẩn Card & Hệ lưới khoảng cách (Spacing Grid)
- **Card chuẩn:** `bg-white rounded-lg border border-slate-200/90 shadow-2xs p-5` (hoặc `p-6`).
- **Hệ lưới:** Mọi `padding`, `margin`, `gap` phải theo bội số của 4px (`gap-2`, `gap-3`, `gap-4`, `gap-6`, `p-4`, `p-6`).
- **Căn lề trục dọc:** Mép trái của nội dung chính bên dưới (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) phải thẳng hàng tuyệt đối với mép trái của Logo trên thanh Header.

---

## 4. QUY CHUẨN THANH ĐIỀU HƯỚNG (TOP HEADER / NAVBAR)
Thanh điều hướng phải tuân thủ nghiêm ngặt bố cục tối giản, đồng bộ:
- **Khung Header:** `sticky top-0 z-40 h-16 w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between`.
- **Bên trái (Logo ngang PeerMind):**
  - Biểu tượng chữ **P** lớn bên trái (`h-9 w-9`), khối chữ **PeerMind** bên phải (`text-xl font-bold tracking-tight`): chữ `"Peer"` màu `text-sky-500`, chữ `"Mind"` màu `text-indigo-950`.
- **Ở giữa (3 Mục điều hướng thuần chữ):**
  - Gồm đúng 3 mục: **Tài liệu**, **Phòng học**, **Bài kiểm tra**.
  - **TUYỆT ĐỐI KHÔNG** đặt icon phía trước chữ, không bọc trong hộp màu nền.
  - **Trạng thái bình thường (Inactive):** `h-16 inline-flex items-center px-1 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors`.
  - **Trạng thái đang chọn (Active):** `h-16 inline-flex items-center px-1 text-sm font-semibold text-indigo-950 border-b-2 border-indigo-600`.
- **Bên phải:** Khu vực tìm kiếm nhanh (hoặc nút nhập Room Code nhanh), thông báo và Avatar hồ sơ người dùng.

---

## 5. BẮT BUỘC THIẾT KẾ ĐỦ 4 TRẠNG THÁI GIAO DIỆN (4 UI STATES)
Mỗi trang và component lấy dữ liệu bất đồng bộ phải có đủ 4 trạng thái:
1. **Empty State (Khi chưa có dữ liệu):**
   - Khung viền nét đứt `border border-dashed border-slate-300 rounded-lg bg-slate-50/50 p-8 text-center`.
   - Tích hợp hình minh họa nhân vật 3D dễ thương của PeerMind, tiêu đề ngắn gọn (`text-sm font-semibold text-slate-800`), dòng mô tả gợi mở (`text-xs text-slate-500 mt-1`) và 1 Primary Button hành động.
2. **Loading State (Khi chờ AI / Server xử lý):**
   - Sử dụng **Skeleton Loader** (`animate-pulse bg-slate-200/70 rounded-md`) mô phỏng đúng kích thước thật của Card tài liệu hoặc danh sách câu hỏi.
   - Khi chờ Gemini API bóc tách PDF/PPTX, hiển thị rõ từng bước tiến trình: *"Đang đọc cấu trúc Slide... -> Đang tạo sơ đồ Mindmap... -> Đang sinh ngân hàng câu hỏi..."*.
3. **Error State (Khi xảy ra lỗi):**
   - Báo lỗi trực tiếp dưới ô Input (`text-xs text-rose-600 mt-1.5 flex items-center gap-1`) hoặc Toast góc màn hình kèm nút *"Thử lại"*.
4. **Overflow State (Khi tên file/tên người dùng quá dài):**
   - Tên file PDF/PPTX, tiêu đề bài học và tên người chơi trên bảng xếp hạng bắt buộc dùng `truncate` (1 dòng) hoặc `line-clamp-2` (2 dòng) kèm thuộc tính `title` hoặc Tooltip để không bao giờ làm vỡ khung Card.

---

## 6. BỐ CỤC CHUYÊN BIỆT CHO 3 PHÂN HỆ CHỨC NĂNG

### Phân hệ 1: Tài liệu (AI Document & Mindmap Lab)
- **Khi ở trang danh sách (Kho tài liệu):** Bố cục 2 cột lệch (`grid-cols-1 lg:grid-cols-12 gap-6`). Cột trái (4 phần) là khung Upload PDF/PPTX kéo thả gọn gàng; Cột phải (8 phần) là các thẻ chỉ số thống kê (`tabular-nums`), danh sách "Tiếp tục học" và lưới "Kho tài liệu".
- **Khi mở xem chi tiết tài liệu:** Chuyển sang bố cục **Split-Pane (Chia đôi màn hình)** toàn chiều cao (`h-[calc(100vh-4rem)] overflow-hidden`):
  - **Nửa trái:** Trình đọc PDF/Slide (`pdfjs-dist`) trên nền `bg-slate-100`.
  - **Nửa phải:** Chuyển đổi mượt mà bằng Tabs giữa **Sơ đồ tư duy (Mindmap - React Flow/Mermaid)** và **Khung hỏi đáp RAG Chat** (bong bóng chat tối giản, có trích dẫn số trang slide).

### Phân hệ 2: Phòng học (Interactive Slide Workspace)
- Tối ưu diện tích tối đa cho khung trình chiếu Slide đồng bộ thời gian thực qua `Socket.io`.
- Thanh công cụ tương tác (thêm Sticky Note, bút Highlight, con trỏ thuyết trình) đặt trong một **Floating Toolbar** nhỏ gọn (`bg-white border border-slate-200 shadow-sm rounded-lg p-1.5 flex items-center gap-1`) nằm cố định ở cạnh dưới màn hình.
- Cột danh sách thành viên trong phòng và ghi chú chung có thể đóng/mở (Collapsible Drawer) bên phải.

### Phân hệ 3: Bài kiểm tra (Gamified Quiz Room - Battle Mode)
- **Màn hình Phòng chờ (Waiting Lobby):** Hiển thị Mã phòng (Room Code) cỡ lớn bằng font `font-mono tabular-nums text-3xl font-bold tracking-wider`, danh sách người chơi tham gia real-time và khung phát video hoạt họa ngắn 5–8s (2 nhân vật 3D hỏi đáp vui nhộn) để tạo không khí hào hứng.
- **Màn hình Thi đấu (Active Battle):**
  - Ẩn các thành phần rườm rà để tập trung 100% vào câu hỏi.
  - Thanh đếm ngược thời gian (Countdown Timer) chạy mượt ở đầu khung câu hỏi kèm số giây `font-mono tabular-nums`.
  - Khung câu hỏi rõ ràng ở trung tâm; 4 đáp án xếp lưới `grid-cols-1 sm:grid-cols-2 gap-3` (tương thích tốt trên cả màn hình dọc điện thoại).
  - Phản hồi tức thì khi hết giờ/chọn đáp án: Hiển thị giải thích ngắn của AI và hiệu ứng hoạt họa vui nhộn (nhân vật bị gõ đầu bằng cuộn giấy khi trả lời sai).
- **Bảng xếp hạng (Real-time Leaderboard):** Điểm số căn phải với `font-mono tabular-nums`, làm nổi bật Top 3 bằng Badge tinh tế (`bg-amber-50 text-amber-700 border-amber-200`), chuyển đổi vị trí mượt mà.

---

## 7. QUY TRÌNH THỰC THI KHI AI SỬA CODE (EXECUTION WORKFLOW)
Khi được yêu cầu chuẩn hóa giao diện, hãy thực hiện tuần tự:
1. **Bước 1 – Cấu hình nền tảng:** Kiểm tra và cập nhật font chữ (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`) cùng các biến màu chuẩn trong `index.css` / `tailwind.config.js`.
2. **Bước 2 – Chuẩn hóa Base Components:** Sửa các component gốc trong `components/ui/` (`button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx`, `skeleton.tsx`) và `Header/Navbar` theo đúng mục 3 & mục 4.
3. **Bước 3 – Refactor từng trang:** Áp dụng hệ thống component mới vào từng phân hệ (**Tài liệu** -> **Phòng học** -> **Bài kiểm tra**), bổ sung đầy đủ 4 trạng thái UI (Empty, Loading, Error, Overflow) và kiểm tra tính tương thích trên Mobile.