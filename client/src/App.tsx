import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Users,
  Sparkles,
  X,
  Check,
  Menu,
  ArrowLeft,
  CheckCircle2,
  FileText,
  UploadCloud,
  Bot,
  Network,
  Presentation,
  Trophy,
  Timer,
  MousePointer2,
  StickyNote,
  Highlighter,
  Zap,
} from "lucide-react";
import { Logo } from "./components/common/Logo";
import { Header, DashboardTab } from "./components/common/Header";
import LibraryPage from "./pages/LibraryPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import TestsPage from "./pages/TestsPage";
import { ClassroomHeroAnimation } from "./components/common/ClassroomHeroAnimation";

type AuthView = "login" | "register" | "forgot";

const stepCards = [
  {
    number: "01",
    title: "Tải lên & Xử lý tài liệu",
    description:
      "Tải lên file PDF, Slide PPTX hoặc DOCX của môn học. Hệ thống AI sẽ tự động đọc hiểu cấu trúc, phân loại môn học và lưu vào kho thư viện cá nhân.",
    icon: UploadCloud,
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200/60",
    previewType: "upload",
  },
  {
    number: "02",
    title: "Khai phá kiến thức cùng AI",
    description:
      "Sử dụng Trợ lý AI PeerMind để tóm tắt chương học, tự động vẽ sơ đồ tư duy (Mindmap) và khởi tạo bộ câu hỏi trắc nghiệm ôn tập chỉ trong 1 cú click.",
    icon: Sparkles,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
    previewType: "ai",
  },
  {
    number: "03",
    title: "Mở phòng học & Thi đấu nhóm",
    description:
      "Chia sẻ mã phòng 6 số cho bạn bè để cùng xem Slide đồng bộ thời gian thực, thảo luận trực tiếp và tranh tài trên bảng xếp hạng Quiz Battle.",
    icon: Trophy,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    previewType: "room",
  },
];

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isLoginOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoginOpen]);

  const openLogin = () => {
    setIsSubmitted(false);
    setAuthView("login");
    setIsLoginOpen(true);
    setIsMenuOpen(false);
  };

  const changeAuthView = (view: AuthView) => {
    setAuthView(view);
    setIsSubmitted(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
  };

  const enterDashboard = () => {
    setIsLoginOpen(false);
    setIsLoggedIn(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={() => setIsLoggedIn(false)} />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFA] text-slate-700">
      {/* Top Header Landing Page */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Logo size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Điều hướng chính">
            <a className="h-16 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" href="#gioi-thieu">
              Giới thiệu
            </a>
            <a className="h-16 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" href="#tinh-nang">
              Tính năng
            </a>
            <a className="h-16 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" href="#hanh-trinh">
              Hành trình
            </a>
          </nav>

          <button onClick={openLogin} className="primary-button hidden md:inline-flex cursor-pointer">
            Đăng nhập
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 md:hidden cursor-pointer"
            aria-label="Mở menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-4 w-4" strokeWidth={1.75} /> : <Menu className="h-4 w-4" strokeWidth={1.75} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="mx-5 my-2 rounded-lg border border-slate-200 bg-white p-4 shadow-md md:hidden">
            <div className="flex flex-col gap-1">
              {[
                ["Giới thiệu", "#gioi-thieu"],
                ["Tính năng", "#tinh-nang"],
                ["Hành trình", "#hanh-trinh"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {label}
                </a>
              ))}
              <button onClick={openLogin} className="primary-button mt-2 justify-center">
                Đăng nhập
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section
          id="gioi-thieu"
          className="relative flex min-h-[680px] items-center border-b border-slate-200/60 bg-white py-16 lg:py-24"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-14 lg:px-10">
            <div className="lg:col-span-7">
              <span className="pill-badge">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                Nền tảng học tập thông minh
              </span>
              <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 leading-tight">
                Học tập cùng bạn bè <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">&amp; Trí tuệ nhân tạo</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600">
                Biến mọi giáo trình PDF, Slide bài giảng dài hàng chục trang thành sơ đồ tư duy trực quan,
                phòng học nhóm đồng bộ thời gian thực và những trận đấu trắc nghiệm gay cấn chỉ trong vài giây.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={openLogin}
                  className="inline-flex items-center justify-center gap-2 rounded-md h-10 px-5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-500/20 active:translate-y-[1px] transition-all cursor-pointer"
                >
                  Bắt đầu học ngay
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button onClick={enterDashboard} className="secondary-button justify-center h-10 px-5 text-sm cursor-pointer">
                  Xem bản trải nghiệm (Demo)
                </button>
              </div>

              {/* 3 Huy hiệu kiểm chứng (Trust Badges) */}
              <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2} />
                  <span>Tự động vẽ Mindmap &amp; Chat RAG</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2} />
                  <span>Đồng bộ Slide nhóm Real-time</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={2} />
                  <span>Thi đấu Quiz Battle có xếp hạng</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <ClassroomHeroAnimation />
            </div>
          </div>
        </section>

        {/* 2. Dải thông số nổi bật (Highlight Metrics Strip) */}
        <section className="border-y border-slate-200/80 bg-slate-50/70 py-8">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <div className="font-mono text-2xl font-bold text-indigo-600">&lt; 5 giây</div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">Bóc tách PDF/PPTX &amp; tạo tóm tắt AI</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <div className="font-mono text-2xl font-bold text-sky-600">100% Real-time</div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">Đồng bộ lật Slide &amp; ghi chú nhóm</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <div className="font-mono text-2xl font-bold text-violet-600">Tự động hóa</div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">Sinh sơ đồ Mindmap &amp; bộ đề trắc nghiệm</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <div className="font-mono text-2xl font-bold text-emerald-600">24/7 AI Tutor</div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">Trợ lý RAG giải đáp sát nội dung tài liệu</p>
            </div>
          </div>
        </section>

        {/* 3. Section Tính năng: 3 Phân hệ Cốt lõi (Zig-Zag Showcase + Animated UI Mockups) */}
        <section id="tinh-nang" className="py-20 scroll-mt-20 max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Lợi ích vượt trội
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Hệ sinh thái học tập toàn diện tích hợp AI
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Mọi công cụ bạn cần để đọc hiểu tài liệu nhanh gấp 3 lần, thảo luận nhóm hiệu quả và ôn thi không nhàm chán.
            </p>
          </div>

          {/* Khối Tính năng 1: Quản lý Tài liệu AI & Sơ đồ tư duy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-24">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-violet-50 text-violet-700 border border-violet-200/60">
                PHÂN HỆ 01 • AI RAG &amp; MINDMAP
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
                Đọc hiểu giáo trình dày cộp chỉ trong vài phút
              </h3>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                Không còn cảnh đọc chay hàng trăm trang PDF hay slide chữ dày đặc. PeerMind tự động phân tích cấu trúc tài liệu, trích xuất các khái niệm cốt lõi và dựng thành sơ đồ tư duy trực quan.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Tự động vẽ Mindmap:</strong>
                    <span className="text-sm text-slate-600 ml-1">Chuyển đổi văn bản phức tạp thành cây sơ đồ tư duy dễ nhớ.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Trợ lý Chat RAG thông minh:</strong>
                    <span className="text-sm text-slate-600 ml-1">Đặt câu hỏi trực tiếp trên tài liệu, AI trả lời kèm trích dẫn chính xác nội dung bài học.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Hỗ trợ đa định dạng:</strong>
                    <span className="text-sm text-slate-600 ml-1">Tải lên mượt mà các file <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">PDF</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">PPTX</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">DOCX</code> và theo dõi phần trăm tiến độ đọc.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Preview 1 */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/60 to-violet-50/30 p-5 sm:p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-2 font-medium text-slate-500 text-[11px]">AI Document &amp; Mindmap Studio</span>
                  </div>
                  <span className="text-[10px] font-mono text-violet-700 bg-violet-100/70 px-2 py-0.5 rounded border border-violet-200 font-semibold">Gemini 2.0 Flash</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* File card */}
                  <div className="sm:col-span-5 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">PDF</span>
                      <span className="text-[10px] font-mono text-slate-400">42 trang</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate">Mô hình RAG &amp; Prompt.pdf</span>
                    </div>
                    <div className="mt-3 relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 bg-gradient-to-r from-indigo-500 to-violet-600 w-3/4 rounded-full animate-pulse" />
                    </div>
                    <span className="text-[10px] text-violet-600 font-medium mt-1.5 block">Đang bóc tách kiến thức...</span>
                  </div>

                  {/* Arrow transform icon */}
                  <div className="sm:col-span-2 flex justify-center py-2 sm:py-0">
                    <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-500/25 animate-pulse">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Mindmap branches */}
                  <div className="sm:col-span-5 flex flex-col gap-2">
                    <div className="bg-violet-600 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-center shadow-xs">
                      Kiến trúc RAG &amp; AI
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-white border border-violet-200 text-violet-900 text-[10px] font-medium p-1.5 rounded-md text-center shadow-2xs">
                        Vector Embeddings
                      </div>
                      <div className="bg-white border border-sky-200 text-sky-900 text-[10px] font-medium p-1.5 rounded-md text-center shadow-2xs">
                        Context Retrieval
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Chat Box snippet */}
                <div className="mt-3.5 bg-white border border-slate-200/80 rounded-xl p-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5 text-violet-700 font-semibold text-xs mb-1">
                    <Bot className="w-3.5 h-3.5 text-violet-600" />
                    <span>Trợ lý AI PeerMind</span>
                    <span className="text-[10px] text-slate-400 font-normal font-mono ml-auto">Trang 18 • 10:28</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Hệ thống đã trích xuất 12 khái niệm cốt lõi. Mô hình RAG giúp giảm 85% hiện tượng ảo giác (hallucination) bằng cách đối chiếu trực tiếp dữ liệu slide của bạn.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Khối Tính năng 2: Real-time Workspace (Đảo vị trí: Mockup Bên Trái, Nội dung Bên Phải) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-24">
            {/* Mockup Preview 2 (Bên trái trên màn hình lớn) */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/20 to-slate-50/60 p-5 sm:p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">Phòng học 248411</span>
                    <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200/70">Mã: 248411</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5" />
                    <span>4 đang học</span>
                  </div>
                </div>

                {/* Slide Canvas Mockup */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 relative shadow-2xs min-h-[220px] flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">SLIDE 04 / 18</span>
                      <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">Đang trình chiếu</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base mt-2">
                      Cấu trúc Dữ liệu &amp; Giải thuật: Đồ thị (Graph Theory)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Thuật toán Dijkstra tìm đường đi ngắn nhất từ một đỉnh nguồn đến tất cả các đỉnh còn lại trong đồ thị có trọng số không âm.
                    </p>
                  </div>

                  {/* Sticky note */}
                  <div className="absolute top-8 right-3 bg-amber-100 border border-amber-300 text-amber-900 p-2.5 rounded-lg shadow-sm text-[11px] font-medium rotate-2 max-w-[150px]">
                    📌 <span className="font-semibold">Lưu ý:</span> Đề thi giữa kỳ chắc chắn có câu này!
                  </div>

                  {/* Floating Live Cursors */}
                  <div className="relative h-14 mt-4">
                    <div className="absolute left-6 top-1 flex items-center gap-1 animate-bounce">
                      <MousePointer2 className="w-3.5 h-3.5 text-sky-500 fill-sky-500" />
                      <span className="bg-sky-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow-xs">Hà My</span>
                    </div>
                    <div className="absolute left-1/2 top-4 flex items-center gap-1">
                      <MousePointer2 className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                      <span className="bg-indigo-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded shadow-xs">Minh Anh</span>
                    </div>
                  </div>

                  {/* Floating Toolbar mockup */}
                  <div className="mx-auto bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md rounded-lg px-3 py-1 flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-mono">Trang 4/18</span>
                    <div className="h-3 w-[1px] bg-slate-200" />
                    <div className="flex items-center gap-2 text-slate-600">
                      <Highlighter className="w-3.5 h-3.5 text-indigo-600" />
                      <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Giơ tay (1)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột Nội dung (Bên phải trên màn hình lớn) */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                PHÂN HỆ 02 • REAL-TIME WORKSPACE
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
                Học nhóm trực tuyến sống động như ngồi chung một bàn
              </h3>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                Mở phòng học chỉ với 1 cú nhấp chuột. Khi chủ phòng lật trang slide hay tô sáng kiến thức trọng tâm, màn hình của toàn bộ thành viên trong nhóm sẽ tự động đồng bộ tức thì.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Presentation className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Đồng bộ Slide thời gian thực:</strong>
                    <span className="text-sm text-slate-600 ml-1">Không còn tình trạng lạc trang khi người thuyết trình chuyển slide.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Ghi chú &amp; Highlight trực tiếp:</strong>
                    <span className="text-sm text-slate-600 ml-1">Cùng nhau dán Sticky Notes và đánh dấu các công thức quan trọng ngay trên mặt slide.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Trò chuyện nhóm liền mạch:</strong>
                    <span className="text-sm text-slate-600 ml-1">Khung chat tích hợp ngay cạnh slide giúp thảo luận, hỏi bài không gián đoạn.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Khối Tính năng 3: Gamified Quiz Arena */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                PHÂN HỆ 03 • GAMIFIED QUIZ BATTLE
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
                Biến giờ ôn tập căng thẳng thành trận đấu kịch tính
              </h3>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                Từ tài liệu đã tải lên, AI sẽ tự động sinh ngân hàng câu hỏi trắc nghiệm có giải thích chi tiết. Mở phòng thi đấu chỉ bằng mã 6 số để so tài tốc độ và độ chính xác cùng bạn bè.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Tạo bộ đề tự động bằng AI:</strong>
                    <span className="text-sm text-slate-600 ml-1">Tiết kiệm hàng giờ tự soạn câu hỏi ôn tập cho từng chương học.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Chế độ Battle Mode gay cấn:</strong>
                    <span className="text-sm text-slate-600 ml-1">Bộ đếm ngược thời gian từng giây kết hợp tính điểm thưởng theo tốc độ trả lời.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-semibold text-slate-900">Bảng xếp hạng Real-time:</strong>
                    <span className="text-sm text-slate-600 ml-1">Vinh danh Top 3 người dẫn đầu ngay sau mỗi câu hỏi kèm lời giải thích cặn kẽ từ AI.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Preview 3 */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-emerald-50/20 to-slate-50/60 p-5 sm:p-6 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">Phòng thi #849201</span>
                    <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70 font-semibold">12 người tham gia</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md animate-pulse">
                    <Timer className="w-3.5 h-3.5" />
                    <span>00:08s</span>
                  </div>
                </div>

                {/* Quiz Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">CÂU HỎI 05/10</span>
                    <span className="text-[10px] font-semibold text-slate-400">Thời gian: 15s</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-2">
                    Độ phức tạp thời gian của thuật toán tìm kiếm nhị phân (Binary Search) là:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="p-2 rounded-lg border border-slate-200 text-xs text-slate-600">
                      A. O(n)
                    </div>
                    <div className="p-2 rounded-lg border-2 border-emerald-500 bg-emerald-50/80 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs">
                      <span>B. O(log n)</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">✓ +950 đ</span>
                    </div>
                    <div className="p-2 rounded-lg border border-slate-200 text-xs text-slate-600">
                      C. O(n²)
                    </div>
                    <div className="p-2 rounded-lg border border-slate-200 text-xs text-slate-600">
                      D. O(1)
                    </div>
                  </div>
                </div>

                {/* Leaderboard Top 3 */}
                <div className="mt-3 bg-slate-50/90 border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      Bảng xếp hạng vòng 5
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono font-semibold">Tự động cập nhật</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200/60 shadow-2xs font-semibold">
                      <span className="text-amber-600">🥇 1. Minh Anh (Bạn)</span>
                      <span className="font-mono text-indigo-700">4,850 đ</span>
                    </div>
                    <div className="flex items-center justify-between text-xs px-2.5 py-0.5 text-slate-600">
                      <span>🥈 2. Hà My</span>
                      <span className="font-mono">4,200 đ</span>
                    </div>
                    <div className="flex items-center justify-between text-xs px-2.5 py-0.5 text-slate-600">
                      <span>🥉 3. Hoàng Nam</span>
                      <span className="font-mono">3,910 đ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Section Hành trình học tập: Quy trình 3 Bước học tập cụ thể */}
        <section id="hanh-trinh" className="py-16 bg-slate-50/80 border-t border-slate-200/70 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Hành trình học tập
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Bắt đầu chỉ với 3 bước đơn giản
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                Quy trình khép kín từ lúc tải tài liệu thô đến khi nắm chắc kiến thức trong tay.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {stepCards.map((step) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.number}
                    className="feature-card hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Mini UI Preview theo từng bước */}
                      {step.previewType === "upload" && (
                        <div className="mb-5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/70">PDF</span>
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/70">PPTX</span>
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/70">DOCX</span>
                            </div>
                            <UploadCloud className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                            <span className="truncate max-w-[140px]">Giao_trinh_Toan_A1.pdf</span>
                            <span className="text-emerald-600 font-semibold font-mono text-[10px]">100% Sẵn sàng</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full w-full" />
                          </div>
                        </div>
                      )}

                      {step.previewType === "ai" && (
                        <div className="mb-5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>AI Trích xuất &amp; Tóm tắt</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">95%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full w-[95%]" />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 overflow-x-auto no-scrollbar">
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-indigo-700 font-medium shrink-0">Nhánh 1: Định lý</span>
                            <span>→</span>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium shrink-0">Nhánh 2: Ví dụ</span>
                            <span>→</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium shrink-0">Quiz (10 câu)</span>
                          </div>
                        </div>
                      )}

                      {step.previewType === "room" && (
                        <div className="mb-5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-600">Mã phòng học nhóm:</span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                              <Trophy className="w-3 h-3 text-amber-500" />
                              <span>Top 1 Arena</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 py-1">
                            {["2", "4", "8", "4", "1", "1"].map((num, i) => (
                              <span
                                key={i}
                                className="w-7 h-8 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-900 font-mono font-bold text-sm shadow-2xs"
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Slide Sync Active
                            </span>
                            <span className="font-mono text-indigo-600 font-semibold">4 Thành viên Online</span>
                          </div>
                        </div>
                      )}

                      {/* Header của thẻ bước */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
                          <IconComponent className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                        <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-md ${step.badgeColor}`}>
                          BƯỚC {step.number}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. CTA Section Banner Tối (Giữ nguyên phong cách vừa chuẩn hóa) */}
        <section className="relative py-16 bg-white border-t border-slate-200/80">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-2xl p-8 sm:p-12 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 relative z-10">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    Sẵn sàng trải nghiệm?
                  </span>
                  <h2 className="mt-4 !text-white font-bold tracking-tight text-2xl sm:text-3xl">
                    Bắt đầu nâng cao hiệu quả học tập ngay hôm nay
                  </h2>
                  <p className="mt-3 text-indigo-100/80 text-sm sm:text-base leading-relaxed">
                    Tham gia cùng hàng nghìn học viên đang sử dụng PeerMind để học thông minh hơn mỗi ngày.
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center justify-center gap-2 bg-white text-indigo-950 hover:bg-indigo-50 px-6 py-3.5 rounded-xl font-semibold shadow-sm shrink-0 transition-colors cursor-pointer"
                  >
                    Tạo tài khoản miễn phí
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8 lg:px-10">
          <Logo size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Điều hướng nhanh chân trang">
            <a href="#tinh-nang" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              Tính năng
            </a>
            <a href="#tinh-nang" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              Tài liệu AI
            </a>
            <a href="#tinh-nang" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              Phòng học
            </a>
            <a href="#hanh-trinh" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              Thi đấu Quiz
            </a>
          </nav>

          <p className="font-sans text-sm text-slate-500">© 2026 PeerMind. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-lg border border-slate-200/80 bg-white p-6 shadow-lg sm:p-8">
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>

            {authView === "login" && (
              <>
                <h2 id="login-title" className="text-xl font-bold tracking-tight text-slate-900">
                  Chào mừng trở lại!
                </h2>
                <p className="mt-1 text-xs text-slate-500">Đăng nhập để tiếp tục hành trình học tập của bạn.</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="form-label">Email</span>
                    <input required type="email" placeholder="ban@example.com" className="form-input" />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="form-label">Mật khẩu</span>
                      <button
                        type="button"
                        onClick={() => changeAuthView("forgot")}
                        className="text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <input required type="password" placeholder="••••••••" className="form-input" />
                  </label>
                  <button type="button" onClick={enterDashboard} className="primary-button w-full h-10 justify-center cursor-pointer">
                    Đăng nhập
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("register")}
                      className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                </form>
              </>
            )}

            {authView === "register" && (
              <>
                <h2 id="login-title" className="text-xl font-bold tracking-tight text-slate-900">
                  Tạo tài khoản mới
                </h2>
                <p className="mt-1 text-xs text-slate-500">Miễn phí 100% và luôn luôn như vậy.</p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="form-label">Họ và tên</span>
                    <input required type="text" placeholder="Nguyễn Văn A" className="form-input" />
                  </label>
                  <label className="block">
                    <span className="form-label">Email</span>
                    <input required type="email" placeholder="ban@example.com" className="form-input" />
                  </label>
                  <label className="block">
                    <span className="form-label">Mật khẩu</span>
                    <input required type="password" placeholder="••••••••" className="form-input" />
                  </label>
                  <button type="button" onClick={enterDashboard} className="primary-button w-full h-10 justify-center cursor-pointer">
                    Tạo tài khoản
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Đã có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("login")}
                      className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Đăng nhập
                    </button>
                  </p>
                </form>
              </>
            )}

            {authView === "forgot" && (
              <>
                <button type="button" onClick={() => changeAuthView("login")} className="auth-back-button cursor-pointer">
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Quay lại đăng nhập
                </button>
                <h2 id="login-title" className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                  Quên mật khẩu?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.
                </p>

                {isSubmitted ? (
                  <AuthSuccess
                    title="Kiểm tra email của bạn"
                    description="Liên kết đặt lại mật khẩu đã được gửi. Liên kết có hiệu lực trong 15 phút."
                    buttonText="Trở về đăng nhập"
                    onContinue={() => changeAuthView("login")}
                  />
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <label className="block">
                      <span className="form-label">Email</span>
                      <input required type="email" placeholder="ban@example.com" className="form-input" />
                    </label>
                    <button type="submit" className="primary-button w-full h-10 justify-center cursor-pointer">
                      Gửi liên kết khôi phục
                    </button>
                    <p className="text-center text-xs text-slate-400">
                      Bạn chưa nhận được email? Kiểm tra thư mục spam hoặc thử lại sau ít phút.
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("documents");

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-700">
      <Header activeTab={activeTab} onSelectTab={setActiveTab} onLogout={onLogout} />

      {/* Mobile navigation fallback */}
      <div className="mb-2 overflow-x-auto md:hidden px-5 pt-3">
        <nav className="flex min-w-max gap-1.5 rounded-md bg-white p-1 border border-slate-200" aria-label="Điều hướng mobile">
          {[
            { id: "documents" as const, label: "Tài liệu" },
            { id: "classrooms" as const, label: "Phòng học" },
            { id: "tests" as const, label: "Bài kiểm tra" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === item.id ? "bg-indigo-950 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {activeTab === "documents" && <LibraryPage />}
        {activeTab === "classrooms" && <ClassroomsPage />}
        {activeTab === "tests" && <TestsPage />}
      </div>

    </div>
  );
}

type AuthSuccessProps = {
  title: string;
  description: string;
  buttonText: string;
  onContinue: () => void;
};

function AuthSuccess({ title, description, buttonText, onContinue }: AuthSuccessProps) {
  return (
    <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50/60 p-5 text-center">
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="mt-3 font-semibold text-emerald-900 text-sm">{title}</p>
      <p className="mt-1 text-xs text-emerald-700 leading-relaxed">{description}</p>
      <button onClick={onContinue} className="primary-button mt-4 w-full justify-center cursor-pointer">
        {buttonText}
      </button>
    </div>
  );
}
