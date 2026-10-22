import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Users,
  Sparkles,
  X,
  Check,
  Menu,
  ArrowLeft,
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
import { ThemeToggle } from "./components/common/ThemeToggle";
import { Header, DashboardTab } from "./components/common/Header";
import LibraryPage from "./pages/LibraryPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import TestsPage from "./pages/TestsPage";
import { ClassroomHeroAnimation } from "./components/common/ClassroomHeroAnimation";
import { loginWithEmail, registerWithEmail, logoutUser, getCurrentUser } from "./services/authService";

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
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);

  // Form input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = isLoginOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoginOpen]);

  // Kiểm tra phiên đăng nhập đã có sẵn
  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
    }
    checkAuth();
  }, []);

  const openLogin = () => {
    setIsSubmitted(false);
    setAuthError(null);
    setAuthNotice(null);
    setAuthView("login");
    setIsLoginOpen(true);
    setIsMenuOpen(false);
  };

  const changeAuthView = (view: AuthView) => {
    setAuthView(view);
    setAuthError(null);
    setAuthNotice(null);
    setIsSubmitted(false);
  };

  const handleLoginSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);
    try {
      const user = await loginWithEmail(email, password);
      setCurrentUser(user);
      setIsLoginOpen(false);
      setIsLoggedIn(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const e = err as Error;
      setAuthError(e.message || "Email hoặc mật khẩu không chính xác.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);
    try {
      const res = await registerWithEmail(email, password, fullName);
      if (res.user) {
        setAuthNotice("Tạo tài khoản thành công! Bạn có thể đăng nhập ngay.");
        setAuthView("login");
      }
    } catch (err: unknown) {
      const e = err as Error;
      setAuthError(e.message || "Đăng ký thất bại.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setCurrentUser({ id: "guest-user-001", email: "guest@peermind.demo", user_metadata: { full_name: "Khách trải nghiệm" } });
    setIsLoginOpen(false);
    setIsLoggedIn(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  if (isLoggedIn) {
    return (
      <Dashboard
        onLogout={handleLogout}
        userId={currentUser?.id}
        userName={currentUser?.user_metadata?.full_name}
        userEmail={currentUser?.email}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAFAFA] dark:bg-[#0b0f19] text-slate-700 dark:text-slate-300 transition-colors duration-200">
      {/* Top Header Landing Page */}
      <header className="sticky top-0 z-30 w-full border-b border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] transition-colors duration-150">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Logo size="md" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Điều hướng chính">
            <a className="h-16 inline-flex items-center text-base font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75 hover:text-[#111118] dark:hover:text-white transition-colors" href="#gioi-thieu">
              Giới thiệu
            </a>
            <a className="h-16 inline-flex items-center text-base font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75 hover:text-[#111118] dark:hover:text-white transition-colors" href="#tinh-nang">
              Tính năng
            </a>
            <a className="h-16 inline-flex items-center text-base font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75 hover:text-[#111118] dark:hover:text-white transition-colors" href="#hanh-trinh">
              Hành trình
            </a>
          </nav>

          {/* Desktop Right: Theme Toggle & Login */}
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <button onClick={openLogin} className="primary-button cursor-pointer">
              Đăng nhập →
            </button>
          </div>

          {/* Mobile Right: Theme Toggle & Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label="Mở menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-4 w-4" strokeWidth={1.75} /> : <Menu className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="mx-5 my-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-md md:hidden">
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
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80"
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
          className="relative flex min-h-[680px] items-center border-b border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#111118] py-16 lg:py-24 overflow-hidden transition-colors duration-200"
        >
          {/* Decorative shapes behind content (SuperHi flat paper-cut) */}
          <div
            className="pointer-events-none absolute -top-20 -right-24 w-[420px] h-[420px] bg-[#ffda00] opacity-80 dark:opacity-20 z-0"
            style={{
              clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
              transform: "rotate(12deg)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-20 w-[400px] h-[400px] bg-[#ffbac4] opacity-80 dark:opacity-20 z-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)",
              transform: "rotate(-10deg)",
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto grid max-w-[1200px] gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-14">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[5000px] bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] text-xs font-normal border border-[#111118]">
                <span className="h-2 w-2 rounded-full bg-[#16ab59] border border-[#111118]" />
                Nền tảng học nhóm &amp; Trợ lý AI
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[52px] font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff] leading-tight">
                Học tập cùng bạn bè &amp; Trí tuệ nhân tạo
              </h1>
              <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-[#111118]/80 dark:text-[#f0f6ff]/80 font-normal">
                Tóm tắt giáo trình, biến slide bài giảng thành sơ đồ tư duy trực quan,
                phòng học nhóm đồng bộ thời gian thực và những trận đấu câu hỏi ôn tập kịch tính.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={openLogin}
                  className="primary-button cursor-pointer"
                >
                  Bắt đầu học ngay →
                </button>
                <button onClick={handleGuestLogin} className="secondary-button justify-center cursor-pointer">
                  Xem bản trải nghiệm
                </button>
              </div>

              {/* 3 Huy hiệu kiểm chứng (Trust Badges) */}
              <div className="mt-8 pt-6 border-t border-[#e1edff] dark:border-[#2a2a3a] flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-normal text-[#111118]/80 dark:text-[#f0f6ff]/80">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#16ab59] text-white flex items-center justify-center text-[10px] border border-[#111118]">✓</span>
                  <span>Tự động vẽ Mindmap &amp; Chat RAG</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#16ab59] text-white flex items-center justify-center text-[10px] border border-[#111118]">✓</span>
                  <span>Đồng bộ Slide nhóm thời gian thực</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#16ab59] text-white flex items-center justify-center text-[10px] border border-[#111118]">✓</span>
                  <span>Thi đấu trắc nghiệm có xếp hạng</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <ClassroomHeroAnimation />
            </div>
          </div>
        </section>

        {/* 2. Dải thông số nổi bật */}
        <section className="border-y border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff]/50 dark:bg-[#1b1b26]/50 py-8 transition-colors duration-150">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 sm:p-6 rounded-[24px] bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
              <div className="font-mono text-2xl font-normal text-[#0b7a75] dark:text-[#2dd4bf]">&lt; 5 giây</div>
              <p className="mt-1.5 text-xs sm:text-sm text-[#111118]/80 dark:text-[#f0f6ff]/80 font-normal">Bóc tách PDF/PPTX &amp; tạo tóm tắt AI</p>
            </div>
            <div className="p-5 sm:p-6 rounded-[24px] bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
              <div className="font-mono text-2xl font-normal text-[#0b7a75] dark:text-[#2dd4bf]">Thời gian thực</div>
              <p className="mt-1.5 text-xs sm:text-sm text-[#111118]/80 dark:text-[#f0f6ff]/80 font-normal">Đồng bộ lật Slide &amp; ghi chú nhóm</p>
            </div>
            <div className="p-5 sm:p-6 rounded-[24px] bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
              <div className="font-mono text-2xl font-normal text-[#0b7a75] dark:text-[#2dd4bf]">Tự động hóa</div>
              <p className="mt-1.5 text-xs sm:text-sm text-[#111118]/80 dark:text-[#f0f6ff]/80 font-normal">Sinh sơ đồ Mindmap &amp; bộ đề trắc nghiệm</p>
            </div>
            <div className="p-5 sm:p-6 rounded-[24px] bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
              <div className="font-mono text-2xl font-normal text-[#0b7a75] dark:text-[#2dd4bf]">24/7 AI Tutor</div>
              <p className="mt-1.5 text-xs sm:text-sm text-[#111118]/80 dark:text-[#f0f6ff]/80 font-normal">Trợ lý RAG giải đáp sát nội dung tài liệu</p>
            </div>
          </div>
        </section>

        {/* 3. Section Tính năng: 3 Phân hệ Cốt lõi */}
        <section id="tinh-nang" className="py-20 scroll-mt-20 max-w-[1200px] mx-auto px-5 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <span className="inline-flex items-center px-4 py-1.5 rounded-[5000px] text-xs font-normal bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] border border-[#111118]">
              Tính năng nổi bật
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
              Học nhóm hiệu quả hơn mỗi ngày
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#111118]/70 dark:text-[#f0f6ff]/70 leading-relaxed font-normal">
              Đọc hiểu tài liệu nhanh hơn, thảo luận bài vở cùng bạn bè và ôn thi hứng thú hơn.
            </p>
          </div>

          {/* Khối Tính năng 1: Quản lý Tài liệu AI & Sơ đồ tư duy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-24">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center px-3.5 py-1 rounded-[5000px] text-xs font-normal bg-[#91d8ec] text-[#111118] border border-[#111118]">
                Tài liệu &amp; Sơ đồ tư duy
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff] leading-snug">
                Đọc hiểu giáo trình dày cộp chỉ trong vài phút
              </h3>
              <p className="mt-4 text-sm sm:text-base text-[#111118]/70 dark:text-[#f0f6ff]/70 leading-relaxed font-normal">
                Không còn cảnh đọc lướt hàng chục trang PDF hay slide chữ dày đặc. PeerMind tự động phân tích cấu trúc tài liệu, trích xuất khái niệm cốt lõi và dựng thành sơ đồ tư duy trực quan cho bạn.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ffda00] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Tự động vẽ Mindmap:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Chuyển đổi văn bản phức tạp thành cây sơ đồ tư duy dễ nhớ.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#91d8ec] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Trợ lý Chat hỏi đáp:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Đặt câu hỏi trực tiếp trên tài liệu, nhận câu trả lời kèm trích dẫn chính xác bài học.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ffbac4] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Hỗ trợ đa định dạng:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Tải lên mượt mà các file <code className="text-xs bg-[#e1edff] dark:bg-[#242436] px-1.5 py-0.5 rounded-md font-mono">PDF</code>, <code className="text-xs bg-[#e1edff] dark:bg-[#242436] px-1.5 py-0.5 rounded-md font-mono">PPTX</code>, <code className="text-xs bg-[#e1edff] dark:bg-[#242436] px-1.5 py-0.5 rounded-md font-mono">DOCX</code>.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Preview 1 */}
            <div className="lg:col-span-6">
              <div className="rounded-[24px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-6 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e1edff] dark:border-[#2a2a3a] text-xs">
                  <span className="font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70 text-xs">Phân tích tài liệu &amp; Sơ đồ tư duy</span>
                  <span className="text-[10px] font-mono text-[#111118] dark:text-[#f0f6ff] bg-[#e1edff] dark:bg-[#242436] px-2.5 py-0.5 rounded-[5000px] border border-[#111118] font-normal">Tự động hóa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* File card */}
                  <div className="sm:col-span-5 bg-[#f0f6ff] dark:bg-[#242436]/60 border border-[#e1edff] dark:border-[#2a2a3a] rounded-[16px] p-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-[5000px] bg-[#ffbac4] text-[#111118] border border-[#111118]">PDF</span>
                      <span className="text-[10px] font-mono text-[#111118]/60 dark:text-[#f0f6ff]/60">42 trang</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#111118] dark:text-[#f0f6ff] shrink-0" />
                      <span className="text-xs font-normal text-[#111118] dark:text-[#f0f6ff] truncate">Giao_trinh_Giai_tich_1.pdf</span>
                    </div>
                    <div className="mt-3 relative h-1.5 w-full bg-[#e1edff] dark:bg-[#2a2a3a] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0b7a75] dark:bg-[#2dd4bf] w-3/4 rounded-full" />
                    </div>
                    <span className="text-[10px] text-[#0b7a75] dark:text-[#2dd4bf] font-normal mt-1.5 block">Đã hoàn thành phân tích</span>
                  </div>

                  {/* Arrow transform icon */}
                  <div className="sm:col-span-2 flex justify-center py-2 sm:py-0">
                    <div className="w-8 h-8 rounded-full bg-[#ffda00] text-[#111118] border border-[#111118] flex items-center justify-center shadow-[0_2px_0_0_#111118]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Mindmap branches */}
                  <div className="sm:col-span-5 flex flex-col gap-2">
                    <div className="bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] text-xs font-normal px-3 py-1.5 rounded-[5000px] text-center border border-[#111118] shadow-[0_2px_0_0_#111118]">
                      Kiến thức cốt lõi
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] text-[11px] font-normal p-1.5 rounded-[12px] text-center">
                        Định lý Fubini
                      </div>
                      <div className="bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] text-[11px] font-normal p-1.5 rounded-[12px] text-center">
                        Tích phân kép
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Chat Box snippet */}
                <div className="mt-3.5 bg-[#f0f6ff] dark:bg-[#242436]/60 border border-[#e1edff] dark:border-[#2a2a3a] rounded-[16px] p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[#0b7a75] dark:text-[#2dd4bf] font-normal text-xs mb-1">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Trợ lý PeerMind</span>
                    <span className="text-[10px] text-[#111118]/50 dark:text-[#f0f6ff]/50 font-mono ml-auto">Trang 18 • 10:28</span>
                  </div>
                  <p className="text-[#111118]/80 dark:text-[#f0f6ff]/80 text-[11px] leading-relaxed font-normal">
                    Mình đã tóm tắt 12 khái niệm chính từ tài liệu của bạn. Bạn có thể nhấn vào bất kỳ nhánh nào trên sơ đồ để xem thêm ví dụ giải thích chi tiết.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Khối Tính năng 2: Real-time Workspace (Đảo vị trí: Mockup Bên Trái, Nội dung Bên Phải) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-24">
            {/* Mockup Preview 2 (Bên trái trên màn hình lớn) */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-[24px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-6 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e1edff] dark:border-[#2a2a3a] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-normal text-[#111118] dark:text-[#f0f6ff] text-xs">Phòng Giải tích 1</span>
                    <span className="font-mono text-[10px] bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] px-2.5 py-0.5 rounded-[5000px] border border-[#111118]">Mã: 248411</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#16ab59] font-normal">
                    <span className="w-2 h-2 rounded-full bg-[#16ab59] border border-[#111118]" />
                    <span>4 bạn đang online</span>
                  </div>
                </div>

                {/* Slide Canvas Mockup */}
                <div className="bg-[#f0f6ff] dark:bg-[#242436]/60 rounded-[20px] border border-[#e1edff] dark:border-[#2a2a3a] p-4 sm:p-5 relative min-h-[220px] flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#111118]/60 dark:text-[#f0f6ff]/60">SLIDE 04 / 18</span>
                      <span className="text-[10px] font-normal text-[#111118] bg-[#91d8ec] px-2 py-0.5 rounded-[5000px] border border-[#111118]">Đang trình chiếu</span>
                    </div>
                    <h4 className="font-normal text-[#111118] dark:text-[#f0f6ff] text-sm sm:text-base mt-2">
                      Cấu trúc Dữ liệu &amp; Giải thuật: Đồ thị (Graph Theory)
                    </h4>
                    <p className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 mt-1 max-w-sm font-normal">
                      Thuật toán Dijkstra tìm đường đi ngắn nhất từ một đỉnh nguồn đến tất cả các đỉnh còn lại trong đồ thị có trọng số không âm.
                    </p>
                  </div>

                  {/* Sticky note */}
                  <div className="absolute top-8 right-3 bg-[#ffda00] border border-[#111118] text-[#111118] p-2.5 rounded-[12px] shadow-[0_2px_0_0_#111118] text-[11px] font-normal rotate-2 max-w-[150px]">
                    📌 <span>Lưu ý:</span> Đề thi giữa kỳ có thể rơi vào phần này!
                  </div>

                  {/* Floating Live Cursors */}
                  <div className="relative h-14 mt-4">
                    <div className="absolute left-6 top-1 flex items-center gap-1">
                      <MousePointer2 className="w-3.5 h-3.5 text-[#0b7a75] fill-[#0b7a75]" />
                      <span className="bg-[#91d8ec] text-[#111118] border border-[#111118] text-[10px] font-normal px-2 py-0.5 rounded-[5000px] shadow-[0_1px_0_0_#111118]">Hà My</span>
                    </div>
                    <div className="absolute left-1/2 top-4 flex items-center gap-1">
                      <MousePointer2 className="w-3.5 h-3.5 text-[#ff4141] fill-[#ff4141]" />
                      <span className="bg-[#ffbac4] text-[#111118] border border-[#111118] text-[10px] font-normal px-2 py-0.5 rounded-[5000px] shadow-[0_1px_0_0_#111118]">Minh Anh</span>
                    </div>
                  </div>

                  {/* Floating Toolbar mockup */}
                  <div className="mx-auto bg-white dark:bg-[#1b1b26] border border-[#111118] shadow-[0_2px_0_0_#111118] rounded-[5000px] px-3.5 py-1.5 flex items-center gap-3">
                    <span className="text-[10px] text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono">Trang 4/18</span>
                    <div className="h-3 w-[1px] bg-[#e1edff] dark:bg-[#2a2a3a]" />
                    <div className="flex items-center gap-2 text-[#111118] dark:text-[#f0f6ff]">
                      <Highlighter className="w-3.5 h-3.5 text-[#0b7a75] dark:text-[#2dd4bf]" />
                      <StickyNote className="w-3.5 h-3.5 text-[#ffda00]" />
                      <span className="text-[10px] bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] px-2 py-0.5 rounded-[5000px] border border-[#111118] font-normal">Giơ tay (1)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột Nội dung (Bên phải trên màn hình lớn) */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <span className="inline-flex items-center px-3.5 py-1 rounded-[5000px] text-xs font-normal bg-[#ffda00] text-[#111118] border border-[#111118]">
                Phòng học nhóm trực tuyến
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff] leading-snug">
                Học nhóm trực tuyến sống động như ngồi chung một bàn
              </h3>
              <p className="mt-4 text-sm sm:text-base text-[#111118]/70 dark:text-[#f0f6ff]/70 leading-relaxed font-normal">
                Mở phòng học nhanh chóng bằng mã số. Khi bạn lật trang slide hay ghi chú kiến thức trọng tâm, màn hình của mọi thành viên trong nhóm sẽ được đồng bộ ngay tức khắc.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#91d8ec] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <Presentation className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Đồng bộ Slide thời gian thực:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Mọi người luôn xem cùng một nội dung bài học.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ffda00] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Ghi chú &amp; Highlight trực tiếp:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Cùng nhau dán ghi chú và đánh dấu các công thức quan trọng trên slide.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ffbac4] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Trò chuyện nhóm liền mạch:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Khung chat tích hợp cạnh slide giúp trao đổi bài tập nhanh chóng.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Khối Tính năng 3: Gamified Quiz Arena */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center px-3.5 py-1 rounded-[5000px] text-xs font-normal bg-[#ffbac4] text-[#111118] border border-[#111118]">
                Đấu trí câu hỏi ôn tập
              </span>
              <h3 className="mt-3 text-2xl sm:text-3xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff] leading-snug">
                Cùng bạn bè ôn bài qua những ván đấu trắc nghiệm
              </h3>
              <p className="mt-4 text-sm sm:text-base text-[#111118]/70 dark:text-[#f0f6ff]/70 leading-relaxed font-normal">
                Từ tài liệu đã học, hệ thống hỗ trợ sinh bộ đề trắc nghiệm có lời giải thích. Bạn chỉ cần chia sẻ mã phòng 6 số để cùng bạn bè thi đấu tính điểm và xem bảng xếp hạng.
              </p>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#16ab59] text-white border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Tạo bộ đề nhanh chóng:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Tự động soạn các câu trắc nghiệm bám sát nội dung từng chương.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ffda00] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Đếm ngược kịch tính:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Đồng hồ đếm ngược từng giây kết hợp tính điểm theo tốc độ phản xạ.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#91d8ec] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_0_0_#111118]">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">Bảng xếp hạng trực tiếp:</strong>
                    <span className="text-sm text-[#111118]/70 dark:text-[#f0f6ff]/70 ml-1 font-normal">Vinh danh thứ tự dẫn đầu ngay sau mỗi câu hỏi kèm đáp án rõ ràng.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Preview 3 */}
            <div className="lg:col-span-6">
              <div className="rounded-[24px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-6 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e1edff] dark:border-[#2a2a3a] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-normal text-[#111118] dark:text-[#f0f6ff] text-xs">Phòng thi #849201</span>
                    <span className="font-mono text-[10px] bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] px-2.5 py-0.5 rounded-[5000px] border border-[#111118]">12 bạn tham gia</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs text-[#111118] bg-[#ffda00] border border-[#111118] px-2.5 py-0.5 rounded-[5000px]">
                    <Timer className="w-3.5 h-3.5" />
                    <span>00:08s</span>
                  </div>
                </div>

                {/* Quiz Card */}
                <div className="bg-[#f0f6ff] dark:bg-[#242436]/60 rounded-[20px] border border-[#e1edff] dark:border-[#2a2a3a] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-normal bg-[#91d8ec] text-[#111118] px-2 py-0.5 rounded-[5000px] border border-[#111118]">CÂU HỎI 05/10</span>
                    <span className="text-[10px] font-mono text-[#111118]/60 dark:text-[#f0f6ff]/60">15 giây</span>
                  </div>
                  <p className="text-xs sm:text-sm font-normal text-[#111118] dark:text-[#f0f6ff] mt-2">
                    Độ phức tạp thời gian của thuật toán tìm kiếm nhị phân (Binary Search) là:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="p-2.5 rounded-[12px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] text-xs font-normal text-[#111118] dark:text-[#f0f6ff]">
                      A. O(n)
                    </div>
                    {/* Trạng thái đúng: nền #16ab59, chữ trắng, kèm icon ✓ và viền 2px #111118 */}
                    <div className="p-2.5 rounded-[12px] border-2 border-[#111118] bg-[#16ab59] text-xs font-normal text-white flex items-center justify-between shadow-[0_2px_0_0_#111118]">
                      <span>B. O(log n)</span>
                      <span className="text-[10px] font-mono font-normal bg-white text-[#111118] px-1.5 py-0.5 rounded-[5000px] border border-[#111118]">✓ +950 đ</span>
                    </div>
                    <div className="p-2.5 rounded-[12px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] text-xs font-normal text-[#111118] dark:text-[#f0f6ff]">
                      C. O(n²)
                    </div>
                    <div className="p-2.5 rounded-[12px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] text-xs font-normal text-[#111118] dark:text-[#f0f6ff]">
                      D. O(1)
                    </div>
                  </div>
                </div>

                {/* Leaderboard Top 3 */}
                <div className="mt-3 bg-[#f0f6ff] dark:bg-[#242436]/60 border border-[#e1edff] dark:border-[#2a2a3a] rounded-[20px] p-3">
                  <div className="text-[11px] font-normal text-[#111118] dark:text-[#f0f6ff] mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-[#0b7a75] dark:text-[#2dd4bf]" />
                      Bảng xếp hạng vòng 5
                    </span>
                    <span className="text-[10px] text-[#0b7a75] dark:text-[#2dd4bf] font-mono">Tự động cập nhật</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs bg-white dark:bg-[#1b1b26] px-2.5 py-1.5 rounded-[12px] border border-[#111118] shadow-[0_1px_0_0_#111118]">
                      <span className="text-[#111118] dark:text-[#f0f6ff]">🥇 1. Minh Anh (Bạn)</span>
                      <span className="font-mono text-[#0b7a75] dark:text-[#2dd4bf]">4,850 đ</span>
                    </div>
                    <div className="flex items-center justify-between text-xs px-2.5 py-0.5 text-[#111118]/70 dark:text-[#f0f6ff]/70">
                      <span>🥈 2. Hà My</span>
                      <span className="font-mono">4,200 đ</span>
                    </div>
                    <div className="flex items-center justify-between text-xs px-2.5 py-0.5 text-[#111118]/70 dark:text-[#f0f6ff]/70">
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
        <section id="hanh-trinh" className="py-20 bg-[#f0f6ff]/60 dark:bg-[#1b1b26]/30 border-t border-[#e1edff] dark:border-[#2a2a3a] scroll-mt-20">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-flex items-center px-4 py-1.5 rounded-[5000px] text-xs font-normal bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] border border-[#111118]">
                Hành trình 3 bước
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
                Bắt đầu nhẹ nhàng chỉ với 3 bước
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#111118]/70 dark:text-[#f0f6ff]/70 leading-relaxed font-normal">
                Quy trình tinh gọn từ lúc tải tài liệu đến khi sẵn sàng ôn thi cùng bạn bè.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {stepCards.map((step) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.number}
                    className="rounded-[24px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-6 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] flex flex-col justify-between"
                  >
                    <div>
                      {/* Mini UI Preview theo từng bước */}
                      {step.previewType === "upload" && (
                        <div className="mb-5 rounded-[16px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#242436]/60 p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[5000px] bg-[#ffbac4] text-[#111118] border border-[#111118]">PDF</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[5000px] bg-[#ffda00] text-[#111118] border border-[#111118]">PPTX</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[5000px] bg-[#91d8ec] text-[#111118] border border-[#111118]">DOCX</span>
                            </div>
                            <UploadCloud className="w-4 h-4 text-[#111118]/60 dark:text-[#f0f6ff]/60" />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-normal text-[#111118] dark:text-[#f0f6ff]">
                            <span className="truncate max-w-[140px]">Giao_trinh_Toan_A1.pdf</span>
                            <span className="text-[#16ab59] font-normal font-mono text-[10px]">Sẵn sàng</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#e1edff] dark:bg-[#2a2a3a] rounded-full overflow-hidden">
                            <div className="h-full bg-[#16ab59] rounded-full w-full" />
                          </div>
                        </div>
                      )}

                      {step.previewType === "ai" && (
                        <div className="mb-5 rounded-[16px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#242436]/60 p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-normal text-[#0b7a75] dark:text-[#2dd4bf]">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>AI Tóm tắt kiến thức</span>
                            </div>
                            <span className="text-[10px] font-mono bg-[#16ab59] text-white border border-[#111118] px-1.5 py-0.5 rounded-[5000px]">Xong</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#e1edff] dark:bg-[#2a2a3a] rounded-full overflow-hidden">
                            <div className="h-full bg-[#0b7a75] dark:bg-[#2dd4bf] rounded-full w-full" />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#111118]/60 dark:text-[#f0f6ff]/60 overflow-x-auto no-scrollbar font-normal">
                            <span className="px-1.5 py-0.5 rounded-[5000px] bg-white dark:bg-[#1b1b26] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] shrink-0">Định lý</span>
                            <span>→</span>
                            <span className="px-1.5 py-0.5 rounded-[5000px] bg-white dark:bg-[#1b1b26] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] shrink-0">Ví dụ</span>
                            <span>→</span>
                            <span className="px-1.5 py-0.5 rounded-[5000px] bg-[#91d8ec] border border-[#111118] text-[#111118] shrink-0">10 câu quiz</span>
                          </div>
                        </div>
                      )}

                      {step.previewType === "room" && (
                        <div className="mb-5 rounded-[16px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#242436]/60 p-3.5 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-normal text-[#111118] dark:text-[#f0f6ff]">Mã phòng học nhóm:</span>
                            <div className="flex items-center gap-1 text-[11px] font-normal text-[#111118] bg-[#ffda00] border border-[#111118] px-1.5 py-0.5 rounded-[5000px]">
                              <Trophy className="w-3 h-3" />
                              <span>Top 1 Arena</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 py-1">
                            {["2", "4", "8", "4", "1", "1"].map((num, i) => (
                              <span
                                key={i}
                                className="w-7 h-8 flex items-center justify-center rounded-[8px] bg-white dark:bg-[#1b1b26] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] font-mono font-normal text-sm shadow-[0_1px_0_0_#111118]"
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#111118]/60 dark:text-[#f0f6ff]/60 font-normal">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#16ab59]" />
                              Đồng bộ trực tiếp
                            </span>
                            <span className="font-mono text-[#0b7a75] dark:text-[#2dd4bf]">4 bạn đang online</span>
                          </div>
                        </div>
                      )}

                      {/* Header của thẻ bước */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#91d8ec] text-[#111118] border border-[#111118] flex items-center justify-center shadow-[0_2px_0_0_#111118]">
                          <IconComponent className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                        <span className="text-xs font-mono font-normal px-2.5 py-1 rounded-[5000px] bg-[#e1edff] dark:bg-[#242436] text-[#0b7a75] dark:text-[#2dd4bf] border border-[#111118]">
                          BƯỚC {step.number}
                        </span>
                      </div>
                      <h3 className="text-lg font-normal text-[#111118] dark:text-[#f0f6ff]">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#111118]/70 dark:text-[#f0f6ff]/70 font-normal">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. CTA Section Banner (Chuẩn hóa SuperHi phẳng) */}
        <section className="relative py-16 bg-[#f0f6ff] dark:bg-[#111118] border-t border-[#e1edff] dark:border-[#2a2a3a]">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <div className="rounded-[24px] border-2 border-[#111118] bg-[#e1edff] dark:bg-[#1b1b26] p-8 sm:p-12 shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 relative z-10">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center px-3 py-1 rounded-[5000px] text-xs font-normal bg-[#91d8ec] text-[#111118] border border-[#111118]">
                    Học nhóm thông minh
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-4xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
                    Bắt đầu nâng cao hiệu quả học tập ngay hôm nay
                  </h2>
                  <p className="mt-3 text-[#111118]/75 dark:text-[#f0f6ff]/75 text-sm sm:text-base leading-relaxed font-normal">
                    Đăng ký miễn phí để trải nghiệm không gian học nhóm đồng bộ thời gian thực kết hợp trợ lý AI thế hệ mới.
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center justify-center gap-2 bg-[#0b7a75] hover:bg-[#08635f] dark:bg-[#2dd4bf] text-white dark:text-[#111118] px-8 py-3.5 rounded-[48px] font-normal border-2 border-[#111118] shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] text-base shrink-0 active:translate-y-[2px] transition-transform cursor-pointer"
                  >
                    <span>Tạo tài khoản miễn phí</span>
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8 lg:px-10">
          <Logo size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Điều hướng nhanh chân trang">
            <a href="#tinh-nang" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Tính năng
            </a>
            <a href="#tinh-nang" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Tài liệu AI
            </a>
            <a href="#tinh-nang" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Phòng học
            </a>
            <a href="#hanh-trinh" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Thi đấu Quiz
            </a>
          </nav>

          <p className="font-sans text-sm text-slate-500 dark:text-slate-400">© 2026 PeerMind. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-[24px] border-2 border-[#111118] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-7 shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] transition-colors duration-150">
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#111118] hover:bg-[#d0e2ff] transition-all cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <div className="mb-4">
              <Logo size="sm" showText={true} />
            </div>

            {authView === "login" && (
              <>
                <h2 id="login-title" className="text-2xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
                  Chào mừng trở lại!
                </h2>
                <p className="mt-1 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">Đăng nhập bằng email của bạn.</p>

                <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                  {authNotice && (
                    <div className="p-3 text-xs rounded-[20px] bg-[#16ab59]/10 border border-[#16ab59] text-[#111118] dark:text-[#f0f6ff] font-normal">
                      {authNotice}
                    </div>
                  )}
                  {authError && (
                    <div className="p-3 text-xs rounded-[20px] bg-[#ff4141]/10 border border-[#ff4141] text-[#ff4141] font-normal">
                      {authError}
                    </div>
                  )}

                  <label className="block">
                    <span className="text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70 block mb-1">Email</span>
                    <input
                      required
                      type="email"
                      placeholder="ban@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">Mật khẩu</span>
                      <button
                        type="button"
                        onClick={() => changeAuthView("forgot")}
                        className="text-xs font-normal text-[#0b7a75] dark:text-[#2dd4bf] hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="primary-button w-full justify-center cursor-pointer disabled:opacity-60"
                  >
                    {authLoading ? "Đang xác thực..." : "Đăng nhập →"}
                  </button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#e1edff] dark:border-[#2a2a3a]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white dark:bg-[#1b1b26] px-2 text-[#111118]/60 dark:text-[#f0f6ff]/60 font-normal">Hoặc</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    className="secondary-button w-full justify-center cursor-pointer text-xs"
                  >
                    Tiếp tục bằng tài khoản Khách
                  </button>

                  <p className="text-center text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 pt-1 font-normal">
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("register")}
                      className="font-normal text-[#0b7a75] dark:text-[#2dd4bf] hover:underline cursor-pointer"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                </form>
              </>
            )}

            {authView === "register" && (
              <>
                <h2 id="login-title" className="text-2xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
                  Tạo tài khoản mới
                </h2>
                <p className="mt-1 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">Tạo tài khoản an toàn và bảo mật.</p>

                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                  {authError && (
                    <div className="p-3 text-xs rounded-[20px] bg-[#ff4141]/10 border border-[#ff4141] text-[#ff4141] font-normal">
                      {authError}
                    </div>
                  )}

                  <label className="block">
                    <span className="text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70 block mb-1">Họ và tên</span>
                    <input
                      required
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70 block mb-1">Email</span>
                    <input
                      required
                      type="email"
                      placeholder="ban@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70 block mb-1">Mật khẩu (tối thiểu 6 ký tự)</span>
                    <input
                      required
                      minLength={6}
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="primary-button w-full justify-center cursor-pointer disabled:opacity-60"
                  >
                    {authLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản →"}
                  </button>

                  <p className="text-center text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-normal">
                    Đã có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("login")}
                      className="font-normal text-[#0b7a75] dark:text-[#2dd4bf] hover:underline cursor-pointer"
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
                <h2 id="login-title" className="mt-4 text-2xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
                  Quên mật khẩu?
                </h2>
                <p className="mt-1 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
                  Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.
                </p>

                {isSubmitted ? (
                  <AuthSuccess
                    title="Kiểm tra email của bạn"
                    description="Liên kết đặt lại mật khẩu đã được gửi. Liên kết có hiệu lực trong 15 phút."
                    buttonText="Trở về đăng nhập →"
                    onContinue={() => changeAuthView("login")}
                  />
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setIsSubmitted(true);
                    }}
                    className="mt-6 space-y-4"
                  >
                    <label className="block">
                      <span className="text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70 block mb-1">Email</span>
                      <input
                        required
                        type="email"
                        placeholder="ban@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-input"
                      />
                    </label>
                    <button type="submit" className="primary-button w-full justify-center cursor-pointer">
                      Gửi liên kết khôi phục →
                    </button>
                    <p className="text-center text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-normal">
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

function Dashboard({
  onLogout,
  userId,
  userName,
  userEmail,
}: {
  onLogout: () => void;
  userId?: string;
  userName?: string;
  userEmail?: string;
}) {
  const getTabFromHash = (hash: string): DashboardTab => {
    const h = hash.replace(/^#\/?/, "").toLowerCase();
    if (h === "classrooms" || h === "phong-hoc") return "classrooms";
    if (h === "tests" || h === "kiem-tra") return "tests";
    return "documents";
  };

  const [activeTab, setActiveTab] = useState<DashboardTab>(() => getTabFromHash(window.location.hash));

  useEffect(() => {
    // Nếu hash hiện tại là rỗng hoặc các hash cũ (#hanh-trinh, #gioi-thieu, ...), cập nhật sang hash của tab
    const clean = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    if (clean !== "documents" && clean !== "classrooms" && clean !== "tests") {
      window.history.replaceState(null, "", `#${activeTab}`);
    }

    const onHashChange = () => {
      const nextTab = getTabFromHash(window.location.hash);
      setActiveTab(nextTab);
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, [activeTab]);

  const handleSelectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    if (window.location.hash !== `#${tab}`) {
      window.history.pushState(null, "", `#${tab}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f6ff] dark:bg-[#111118] text-[#111118] dark:text-[#f0f6ff] transition-colors duration-150">
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={onLogout}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Mobile navigation fallback */}
      <div className="mb-2 overflow-x-auto md:hidden px-5 pt-3">
        <nav className="flex min-w-max gap-2 rounded-[5000px] bg-white dark:bg-[#1b1b26] p-1.5 border border-[#e1edff] dark:border-[#2a2a3a]" aria-label="Điều hướng mobile">
          {[
            { id: "documents" as const, label: "Tài liệu" },
            { id: "classrooms" as const, label: "Phòng học" },
            { id: "tests" as const, label: "Bài kiểm tra" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex items-center gap-2 rounded-[5000px] px-4 py-1.5 text-xs font-normal transition cursor-pointer ${
                activeTab === item.id ? "bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] shadow-[0_2px_0_0_#111118]" : "text-[#111118]/70 dark:text-[#f0f6ff]/70 hover:text-[#111118] dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6">
        {activeTab === "documents" && <LibraryPage userId={userId} userName={userName} />}
        {activeTab === "classrooms" && <ClassroomsPage userId={userId} userName={userName} />}
        {activeTab === "tests" && <TestsPage userId={userId} userName={userName} />}
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
