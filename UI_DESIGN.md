UUÔN KHỔ THIẾT KẾ CỐ ĐỊNH (STRICT DESIGN TOKENS)

## A. Typography (Font chữ)
- **Heading Font**: Sử dụng `Plus Jakarta Sans` (hoặc `Outfit`), font-weight: `font-semibold` (600) hoặc `font-bold` (700), `tracking-tight`, màu `text-slate-900`.
- **Body Font**: Sử dụng `Inter`, font-weight: `font-normal` (400) và `font-medium` (500), màu chữ chính `text-slate-700`, chữ phụ `text-slate-500`.
- **Monospace Font** (Dùng cho Room Code, đồng hồ đếm ngược, chỉ số thống kê): Sử dụng `JetBrains Mono`, kèm class `tabular-nums`.

## B. Hệ thống Button (Chỉ sử dụng đúng 3 biến thể sau)
- **Kích thước & Bo góc chung**: Chiều cao chuẩn `h-9` (36px) hoặc `h-10` (40px), padding `px-4 py-2`, bo góc `rounded-md` (6px), chữ `text-sm font-medium`, hiệu ứng `transition-colors duration-150`.
- **Primary Button**: Nền đặc `bg-indigo-950 text-white hover:bg-indigo-900` (hoặc điểm nhấn thương hiệu `bg-sky-600 text-white hover:bg-sky-700`). Có viền mảnh tinh tế `shadow-xs`.
- **Secondary / Outline Button**: `bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900`.
- **Ghost Button**: `bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900`.

## C. Hệ thống Icon (Iconography)
- Chỉ sử dụng duy nhất thư viện `lucide-react`.
- **Kích thước cố định**: `w-4 h-4` (16px) khi nằm trong Button hoặc menu điều hướng; `w-5 h-5` (20px) cho tiêu đề mục.
- **Độ dày nét (Stroke width)**: Cố định `strokeWidth={1.75}` cho toàn bộ icon để tạo nét thanh mảnh, đồng bộ.
- Không bọc icon trong các hình tròn màu mè lòe loẹt; nếu cần khung nền cho icon, chỉ dùng `p-2 rounded-md bg-slate-100 text-slate-700 border border-slate-200`.

## D. Bố cục Card, Border & Màu nền (Surfaces)
- **Màu nền trang (Background)**: Trắng ngà ấm hoặc xám cực nhạt `bg-[#FAFAFA]` hoặc `bg-slate-50/50`.
- **Thẻ (Card / Container)**: Nền trắng thuần `bg-white`, bo góc cố định `rounded-lg` (8px), viền sắc nét `border border-slate-200/80`, bóng đổ cực nhẹ `shadow-2xs` (hoặc không bóng đổ).
- **Thanh điều hướng (Top Header)**: Chiều cao `h-16`, nền `bg-white`, đường kẻ dưới `border-b border-slate-200`. Các mục điều hướng ("Tài liệu", "Phòng học", "Bài kiểm tra") chỉ dùng text thuần (không gắn icon phía trước), trạng thái active có chữ màu `text-indigo-950 font-semibold` và gạch chân mảnh `border-b-2 border-indigo-600` sát đáy header.

# 3. YÊU CẦU THỰC THI
1. Giữ nguyên 100% logic xử lý, state, props, Socket.io và API của ứng dụng.
2. Cập nhật lại `tailwind.config.js` / `index.css` với bảng màu và font chữ trên trước.
3. Refactor lần lượt các component chung (Button, Card, Input, Navbar) rồi áp dụng đồng bộ sang 3 phân hệ: Tài liệu (RAG & Mindmap), Phòng học (Slide Workspace), và Bài kiểm tra (Quiz Battle).