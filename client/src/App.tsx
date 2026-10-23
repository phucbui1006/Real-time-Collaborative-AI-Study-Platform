import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Users,
  Sparkles,
  X,
  Check,
  Menu,
  ArrowLeft,
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
  BookOpen,
  MessageCircle,
  Smartphone,
  Monitor,
  HelpCircle,
  Flame,
  Star,
} from "lucide-react";
import { Logo } from "./components/common/Logo";
import { ThemeToggle } from "./components/common/ThemeToggle";
import { Header, DashboardTab } from "./components/common/Header";
import LibraryPage, { clearAllUserState } from "./pages/LibraryPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import TestsPage from "./pages/TestsPage";
import { ClassroomHeroAnimation } from "./components/common/ClassroomHeroAnimation";
import { loginWithEmail, registerWithEmail, logoutUser, getCurrentUser } from "./services/authService";
import { supabase } from "./services/supabaseClient";
import { idleService, IdleState } from "./services/idleService";
import { IdleWarningModal } from "./components/common/IdleWarningModal";

type AuthView = "login" | "register" | "forgot";

const studentSteps = [
  {
    number: "01",
    sticker: "Bước 1 • Siêu nhanh",
    title: "Tải lên tài liệu",
    description:
      "Kéo thả file PDF, Slide PPTX hoặc DOCX môn học lên hệ thống. Chấp nhận cả giáo trình dày hàng trăm trang.",
    icon: UploadCloud,
    cardBg: "bg-teal-50/80 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/80",
    badgeBg: "bg-teal-600 text-white",
    iconBg: "bg-teal-500 text-white",
    preview: "PDF • PPTX • DOCX",
  },
  {
    number: "02",
    sticker: "Bước 2 • Dưới 5 giây",
    title: "Hỏi AI & Xem sơ đồ",
    description:
      "AI tự động tóm tắt ý chính, vẽ sơ đồ tư duy trực quan và trả lời mọi câu hỏi kèm trích dẫn đúng số trang.",
    icon: Sparkles,
    cardBg: "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80",
    badgeBg: "bg-amber-400 text-slate-950",
    iconBg: "bg-amber-400 text-slate-950",
    preview: "Mindmap + Trích dẫn trang",
  },
  {
    number: "03",
    sticker: "Bước 3 • Học vui hơn",
    title: "Thi cùng bạn bè",
    description:
      "Mở phòng học nhóm đồng bộ slide, thảo luận trực tiếp và thi đua bảng xếp hạng với bộ 10 câu hỏi trắc nghiệm từ AI.",
    icon: Trophy,
    cardBg: "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80",
    badgeBg: "bg-rose-500 text-white",
    iconBg: "bg-rose-500 text-white",
    preview: "Mã 6 số • Đua Top Quiz",
  },
];

const studentTestimonials = [
  {
    name: "Nguyễn Minh Anh",
    role: "Sinh viên năm 3 • ĐH Kinh tế Quốc dân",
    quote:
      "Môn Kinh tế vĩ mô có giáo trình hơn 150 trang, mình thả vào PeerMind chưa tới 5 giây là có ngay sơ đồ tư duy và số trang trích dẫn để dò lại cực tiện!",
    avatarBg: "bg-teal-200 text-teal-900",
    avatarSrc: "/landing/avatar1.jpg",
    cardAccent: "border-teal-200 dark:border-teal-800/70 bg-white dark:bg-slate-900",
    sticker: "Tiết kiệm 4 tiếng đọc sách",
    stickerColor: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
    initials: "MA",
  },
  {
    name: "Trần Hải Đăng",
    role: "Sinh viên năm 2 • ĐH Bách Khoa",
    quote:
      "Thích nhất là lúc học nhóm trước ngày thi: cả nhóm vừa xem chung một slide có highlight trực tiếp, vừa mở bảng xếp hạng trắc nghiệm bắn câu hỏi vui như chơi game.",
    avatarBg: "bg-amber-200 text-amber-900",
    avatarSrc: "/landing/avatar2.jpg",
    cardAccent: "border-amber-200 dark:border-amber-800/70 bg-white dark:bg-slate-900",
    sticker: "Học nhóm hết buồn ngủ",
    stickerColor: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    initials: "HĐ",
  },
  {
    name: "Lê Thảo Vy",
    role: "Sinh viên năm 4 • ĐH Ngoại thương",
    quote:
      "2 giờ sáng ôn thi thắc mắc chỗ nào hỏi AI là có câu trả lời ngay lập tức, lại chỉ rõ nằm ở trang mấy trong slide của thầy cô nên không sợ bị lệch kiến thức.",
    avatarBg: "bg-pink-200 text-pink-900",
    avatarSrc: "/landing/avatar3.jpg",
    cardAccent: "border-pink-200 dark:border-pink-800/70 bg-white dark:bg-slate-900",
    sticker: "AI hỗ trợ 24/7 mùa thi",
    stickerColor: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
    initials: "TV",
  },
];

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string; user_metadata?: { full_name?: string } } | null>(null);

  // Interactive quiz option state in Bento Grid
  const [selectedQuizOption, setSelectedQuizOption] = useState<number>(1);

  // Form input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // ── Idle session state ─────────────────────────────────────────────────────
  const [idleState, setIdleState] = useState<IdleState>({ isWarning: false, remainingSeconds: 60 });
  const idleTimeoutRef = useRef<() => void>(() => {});
  const hasBeenLoggedIn = useRef(false);

  useEffect(() => {
    document.body.style.overflow = isLoginOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoginOpen]);

  // ── Auth init + Supabase listener ───────────────────────────────────────────
  useEffect(() => {
    idleService.init(() => idleTimeoutRef.current());

    async function checkAuth() {
      const user = await getCurrentUser();
      if (user) {
        hasBeenLoggedIn.current = true;
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (event === "SIGNED_OUT" || !session) {
          if (!hasBeenLoggedIn.current) return;

          idleService.stop();
          clearAllUserState();
          setCurrentUser(null);
          setIsLoggedIn(false);
          setAuthNotice("Phiên đã hết hạn, vui lòng đăng nhập lại.");
          setEmail("");
          setPassword("");
          setFullName("");
          setAuthView("login");
          setIsLoginOpen(true);
        } else if (event === "SIGNED_IN" && session) {
          hasBeenLoggedIn.current = true;
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
      idleService.stop();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    idleService.start();
    const unsub = idleService.subscribe(setIdleState);
    return () => {
      unsub();
    };
  }, [isLoggedIn]);

  // Hiệu ứng chuyển động nhẹ khi cuộn trang (Scroll Reveal)
  useEffect(() => {
    if (isLoggedIn) return;
    const elements = document.querySelectorAll(".reveal-on-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isLoggedIn]);

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
      hasBeenLoggedIn.current = true;
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
    hasBeenLoggedIn.current = true;
    setCurrentUser({ id: "guest-user-001", email: "guest@peermind.demo", user_metadata: { full_name: "Khách trải nghiệm" } });
    setIsLoginOpen(false);
    setIsLoggedIn(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleIdleTimeout = () => {
    idleService.stop();
    clearAllUserState();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setAuthNotice("Phiên đã hết hạn, vui lòng đăng nhập lại.");
    setEmail("");
    setPassword("");
    setFullName("");
    setAuthView("login");
    setIsLoginOpen(true);
  };

  useEffect(() => {
    idleTimeoutRef.current = handleIdleTimeout;
  });

  const handleLogout = async () => {
    idleService.stop();
    clearAllUserState();
    await logoutUser();
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  if (isLoggedIn) {
    return (
      <>
        <Dashboard
          onLogout={handleLogout}
          userId={currentUser?.id}
          userName={currentUser?.user_metadata?.full_name}
          userEmail={currentUser?.email}
        />
        <IdleWarningModal
          open={idleState.isWarning}
          remainingSeconds={idleState.remainingSeconds}
          onContinue={() => idleService.resetTimer()}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFFDF9] dark:bg-[#0B1120] text-slate-800 dark:text-slate-200 transition-colors duration-200">
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800 bg-[#FFFDF9]/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors duration-150">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Logo size="md" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Điều hướng chính">
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" href="#hoc-nhom">
              Học nhóm
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" href="#truoc-sau">
              Trước &amp; Sau
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" href="#tinh-nang">
              Tính năng
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" href="#ba-buoc">
              3 bước bắt đầu
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" href="#nhan-xet">
              Nhận xét
            </a>
          </nav>

          {/* Desktop Right: Theme Toggle & CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <button
              onClick={handleGuestLogin}
              className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-teal-500 hover:text-teal-600 transition-all cursor-pointer"
            >
              Dùng thử ngay
            </button>
            <button
              onClick={openLogin}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 text-sm font-bold shadow-sm shadow-teal-600/20 transition-all cursor-pointer"
            >
              <span>Đăng nhập</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>

          {/* Mobile Right: Theme Toggle & Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              aria-label="Mở menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="mx-5 my-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl md:hidden">
            <div className="flex flex-col gap-1.5">
              {[
                ["Học nhóm cùng bạn", "#hoc-nhom"],
                ["So sánh Trước & Sau", "#truoc-sau"],
                ["Tính năng nổi bật", "#tinh-nang"],
                ["3 bước bắt đầu", "#ba-buoc"],
                ["Sinh viên nói gì?", "#nhan-xet"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-slate-800"
                >
                  {label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleGuestLogin}
                  className="rounded-xl border-2 border-teal-500 py-2.5 text-base font-bold text-teal-700 dark:text-teal-300"
                >
                  Dùng thử không cần đăng ký
                </button>
                <button
                  onClick={openLogin}
                  className="rounded-xl bg-teal-600 py-2.5 text-base font-bold text-white"
                >
                  Bắt đầu học ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ─── 1. HERO SECTION ───────────────────────────────────────────────── */}
        <section
          id="gioi-thieu"
          className="relative overflow-hidden pt-10 pb-20 lg:pt-16 lg:pb-24"
        >
          {/* Đốm màu nền pastel tươi sáng kiểu SuperHi */}
          <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-teal-200/40 dark:bg-teal-900/20 blur-3xl" />
          <div className="pointer-events-none absolute top-20 right-10 h-72 w-72 rounded-full bg-amber-200/40 dark:bg-amber-900/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-10 h-64 w-64 rounded-full bg-pink-200/35 dark:bg-pink-900/15 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
              {/* Cột trái: Tiêu đề ngắn, mạnh + 2 nút + Dòng "Dưới 5 giây" ngay sát hero */}
              <div className="lg:col-span-6">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-teal-100/90 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 px-4 py-1.5 text-sm font-bold text-teal-900 dark:text-teal-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-ping" />
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-600 -ml-4" />
                  <span>Nền tảng học tập AI cho sinh viên đại học</span>
                </div>

                <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                  Đọc giáo trình{" "}
                  <span className="inline-block rounded-2xl bg-teal-500/15 dark:bg-teal-500/25 px-3 py-0.5 text-teal-700 dark:text-teal-300">
                    nhanh gấp 5 lần.
                  </span>{" "}
                  Học nhóm vui như ngồi cạnh nhau.
                </h1>

                <p className="mt-6 max-w-xl text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                  Tải lên file PDF, PPTX hay DOCX — AI tóm tắt ngay thành{" "}
                  <strong className="text-slate-900 dark:text-white">sơ đồ tư duy có trích dẫn trang</strong>, mở phòng học đồng bộ slide và tạo đề trắc nghiệm đua top cùng hội bạn.
                </p>

                {/* Hai nút hành động chính theo yêu cầu */}
                <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white px-7 py-4 text-base sm:text-lg font-extrabold shadow-lg shadow-teal-600/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    <span>Bắt đầu học ngay</span>
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={handleGuestLogin}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-6 py-4 text-base sm:text-lg font-bold transition-all cursor-pointer"
                  >
                    <span>Dùng thử không cần đăng ký</span>
                  </button>
                </div>

                {/* Dòng số liệu "Dưới 5 giây" & "Hỗ trợ AI 24/7" đặt ngay sát dưới nút Hero */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 px-4 py-2 text-sm sm:text-base font-extrabold text-slate-900 dark:text-amber-200">
                    <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400 fill-amber-500 shrink-0" />
                    <span>Dưới 5 giây để xử lý xong giáo trình</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-violet-100 dark:bg-violet-950/70 border border-violet-300 dark:border-violet-700 px-4 py-2 text-sm sm:text-base font-bold text-violet-950 dark:text-violet-200">
                    <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <span>Hỗ trợ AI 24/7 • Trích dẫn chuẩn từng trang</span>
                  </div>
                </div>
              </div>

              {/* Cột phải: Vùng Demo Động kéo thả PDF -> tự vẽ sơ đồ tư duy */}
              <div className="lg:col-span-6">
                <ClassroomHeroAnimation />
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. HÌNH ẢNH GẦN GŨI: SINH VIÊN HỌC NHÓM + MOCKUP PHÒNG HỌC ────── */}
        <section
          id="hoc-nhom"
          className="reveal-on-scroll py-20 bg-teal-50/50 dark:bg-slate-900/50 border-y border-teal-100 dark:border-slate-800 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-3xl mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 dark:bg-pink-950/80 border border-pink-300 dark:border-pink-800 px-4 py-1 text-sm font-bold text-pink-800 dark:text-pink-200">
                <Users className="h-4 w-4" />
                <span>Không còn học một mình cô đơn</span>
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Gần gũi như ngồi chung bàn thư viện cùng hội bạn thân
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Dù mỗi người ở một nơi, cả nhóm vẫn cùng lật từng trang slide, tô sáng công thức quan trọng và nhắn tin thảo luận rôm rả ngay trên tài liệu.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
              {/* Cột Trái (5 cột): Ảnh sinh viên học nhóm thực tế */}
              <div className="lg:col-span-5 flex flex-col justify-between rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-b from-amber-50/70 via-white to-teal-50/70 dark:from-slate-800/80 dark:via-slate-900 dark:to-teal-950/40 p-6 sm:p-7 shadow-sm relative overflow-hidden">
                {/* Ảnh chụp sinh viên học nhóm thực tế */}
                <div className="mb-5 relative overflow-hidden rounded-3xl border-2 border-slate-900 dark:border-slate-700 shadow-md group">
                  <img
                    src="/landing/study-group.jpg"
                    alt="Nhóm sinh viên đại học Việt Nam đang học chung quanh bàn gỗ thư viện"
                    className="w-full h-72 sm:h-84 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex flex-col justify-end p-5">
                    <p className="text-white text-base sm:text-lg font-extrabold leading-snug">
                      “Học chung với bạn bè giúp nhớ bài lâu hơn 70%”
                    </p>
                  </div>
                </div>

                {/* Cụm Avatar bạn bè đang online */}
                <div className="rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3">
                  <div className="flex -space-x-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white text-sm font-extrabold ring-2 ring-white dark:ring-slate-900">
                      MA
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-extrabold ring-2 ring-white dark:ring-slate-900">
                      HĐ
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white text-sm font-extrabold ring-2 ring-white dark:ring-slate-900">
                      TV
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-white text-sm font-extrabold ring-2 ring-white dark:ring-slate-900">
                      +3
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Nhóm Ôn Thi Kinh Tế Vĩ Mô
                    </p>
                    <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                      ● 6 bạn đang cùng xem Slide trang 8
                    </p>
                  </div>
                </div>
              </div>

              {/* Cột Phải (7 cột): Mockup Phòng Học Nhóm */}
              <div className="lg:col-span-7 relative flex flex-col justify-between">
                <div className="rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                  {/* Browser Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/90 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full bg-rose-400" />
                      <span className="h-3.5 w-3.5 rounded-full bg-amber-400" />
                      <span className="h-3.5 w-3.5 rounded-full bg-teal-400" />
                      <span className="ml-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                        Phòng học #248411 • Đồng bộ Slide trực tiếp
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 px-3 py-1 text-xs font-extrabold">
                      <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
                      <span>Đang đồng bộ 100%</span>
                    </span>
                  </div>

                  {/* Nội dung phòng học: Slide bên trái + Tin nhắn nhóm bên phải */}
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-7 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-slate-50/60 dark:bg-slate-900">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
                          <span className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1">
                            SLIDE 08 / 24
                          </span>
                          <span className="text-teal-700 dark:text-teal-300">
                            Người điều khiển: Minh Anh
                          </span>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-2xs relative">
                          <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                            Chương 4: Cách tính GDP thực tế &amp; Lạm phát
                          </p>
                          <p className="mt-2 text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                            GDP danh nghĩa tính theo giá hiện hành, còn{" "}
                            <mark className="rounded bg-amber-200 dark:bg-amber-400/90 px-1.5 py-0.5 font-bold text-slate-950">
                              GDP thực tế đã loại bỏ biến động giá
                            </mark>{" "}
                            để phản ánh đúng sản lượng hàng hóa.
                          </p>

                          <div className="mt-4 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 p-3 text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-200 rotate-1 shadow-xs">
                            📌 <strong>Ghi chú của Hải Đăng:</strong> Nhớ phân biệt rõ hệ số giảm phát GDP với chỉ số CPI nhé cả nhà!
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                              <MousePointer2 className="h-4 w-4 fill-rose-500" />
                              <span>Thảo Vy đang highlight</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <Highlighter className="h-4 w-4 text-amber-500" />
                              <StickyNote className="h-4 w-4 text-teal-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Khu vực Avatar, Tên bạn bè & Tin nhắn ngắn trong phòng học */}
                    <div className="md:col-span-5 p-5 bg-white dark:bg-slate-900 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <MessageCircle className="h-4 w-4 text-teal-600" />
                            Trò chuyện nhóm
                          </span>
                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                            4 bạn online
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white text-xs font-extrabold">
                              MA
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm">
                              <p className="font-extrabold text-teal-700 dark:text-teal-300">Minh Anh</p>
                              <p className="text-slate-700 dark:text-slate-200 mt-0.5">
                                Trang 8 này chắc chắn có trong đề thi giữa kỳ tuần sau nè!
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
                              HĐ
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 px-3.5 py-2 text-xs sm:text-sm">
                              <p className="font-extrabold text-amber-800 dark:text-amber-300">Hải Đăng</p>
                              <p className="text-slate-700 dark:text-slate-200 mt-0.5">
                                Mình vừa dán ghi chú công thức ngay dưới slide rồi nha ✍️
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-extrabold">
                              TV
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 px-3.5 py-2 text-xs sm:text-sm">
                              <p className="font-extrabold text-rose-700 dark:text-rose-300">Thảo Vy</p>
                              <p className="text-slate-700 dark:text-slate-200 mt-0.5">
                                Xem xong chương này tụi mình bấm tạo 10 câu Quiz thi thử luôn đi! 🔥
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>Mã phòng: <strong className="text-slate-900 dark:text-white font-mono">248411</strong></span>
                        <span className="text-teal-600 dark:text-teal-400 font-bold">Vào bằng 1 chạm →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. TRƯỚC / SAU: GIÁO TRÌNH 120 TRANG VS 1 SƠ ĐỒ + 10 CÂU HỎI ──── */}
        <section
          id="truoc-sau"
          className="reveal-on-scroll py-20 lg:py-24 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 px-4 py-1 text-sm font-extrabold text-amber-900 dark:text-amber-200">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>Sự khác biệt rõ rệt ngay lần đầu dùng</span>
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Tạm biệt cảnh bơi trong giáo trình dày cộp
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
                So sánh cách ôn thi truyền thống với trải nghiệm học tập thông minh trên PeerMind.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
              {/* TRƯỚC: Giáo trình 120 trang */}
              <div className="lg:col-span-5 rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-200 dark:bg-slate-800 px-3.5 py-1 text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    <span>😩 TRƯỚC KHI DÙNG PEERMIND</span>
                  </div>
                  <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                    Giáo trình 120 trang chữ dày đặc
                  </h3>
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
                    Đọc trước quên sau, không biết trọng tâm nằm ở trang nào khi sát ngày thi.
                  </p>

                  <div className="mt-6 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-inner space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                      <span>📄 Giao_trinh_Toan_Tap.pdf (120 trang)</span>
                      <span>Mất 4 - 5 tiếng</span>
                    </div>
                    <div className="space-y-2 opacity-60">
                      <div className="h-2.5 w-full rounded bg-slate-300 dark:bg-slate-600" />
                      <div className="h-2.5 w-11/12 rounded bg-slate-300 dark:bg-slate-600" />
                      <div className="h-2.5 w-full rounded bg-slate-300 dark:bg-slate-600" />
                      <div className="h-2.5 w-4/5 rounded bg-slate-300 dark:bg-slate-600" />
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1">❌ Chữ li ti khó nhớ</span>
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1">❌ Tự soạn đề mất giờ</span>
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1">❌ Học một mình dễ nản</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm font-bold text-slate-500">
                  <span>Hiệu suất ghi nhớ thấp</span>
                  <span>Quá tải thông tin</span>
                </div>
              </div>

              {/* Mũi tên chuyển đổi ở giữa */}
              <div className="lg:col-span-2 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-600 text-white shadow-xl shadow-teal-600/30 rotate-90 lg:rotate-0">
                    <ArrowRight className="h-8 w-8" strokeWidth={2.5} />
                  </div>
                  <span className="rounded-full bg-amber-300 text-slate-950 px-3 py-1 text-xs font-extrabold border border-slate-900">
                    Dưới 5 giây
                  </span>
                </div>
              </div>

              {/* SAU: 1 sơ đồ + 10 câu hỏi ôn tập */}
              <div className="lg:col-span-5 rounded-[2rem] border-2 border-teal-500 bg-gradient-to-br from-teal-50/90 via-white to-amber-50/60 dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-8 shadow-xl shadow-teal-600/10 flex flex-col justify-between relative">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal-600 text-white px-3.5 py-1 text-xs sm:text-sm font-extrabold">
                    <Sparkles className="h-4 w-4" />
                    <span>SAU KHI DÙNG PEERMIND</span>
                  </div>
                  <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    1 sơ đồ + 10 câu hỏi ôn tập
                  </h3>
                  <p className="mt-2 text-base text-slate-700 dark:text-slate-200">
                    Toàn bộ 120 trang được cô đọng thành nhánh tư duy có gắn số trang và bộ câu hỏi trắc nghiệm sẵn sàng thi đấu.
                  </p>

                  <div className="mt-6 rounded-2xl border-2 border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-teal-800 dark:text-teal-300">
                        <Network className="h-4 w-4" />
                        1 Sơ đồ tư duy toàn cảnh
                      </span>
                      <span className="rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2.5 py-0.5 text-xs font-bold">
                        Có trích dẫn trang
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                      <div className="rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-700 p-2 text-teal-900 dark:text-teal-200">
                        Chương 1<br />
                        <span className="text-[11px] font-normal">Trang 1–35</span>
                      </div>
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 p-2 text-amber-900 dark:text-amber-200">
                        Chương 2<br />
                        <span className="text-[11px] font-normal">Trang 36–78</span>
                      </div>
                      <div className="rounded-xl bg-pink-50 dark:bg-pink-950/70 border border-pink-300 dark:border-pink-700 p-2 text-pink-900 dark:text-pink-200">
                        Chương 3<br />
                        <span className="text-[11px] font-normal">Trang 79–120</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-violet-900 dark:text-violet-200">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span>+ 10 câu hỏi trắc nghiệm trọng tâm</span>
                      </span>
                      <span className="text-teal-700 dark:text-teal-300">Sẵn sàng thi!</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-teal-200/80 dark:border-slate-800 flex items-center justify-between text-sm font-extrabold text-teal-700 dark:text-teal-300">
                  <span>✓ Hiểu sâu bản chất trong 5 phút</span>
                  <span>✓ Hỗ trợ AI 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. TÍNH NĂNG: BENTO GRID + KHUNG TRÌNH DUYỆT & ĐIỆN THOẠI ────── */}
        <section
          id="tinh-nang"
          className="reveal-on-scroll py-20 bg-slate-50/90 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-3xl mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-950 border border-teal-300 dark:border-teal-700 px-4 py-1 text-sm font-extrabold text-teal-900 dark:text-teal-200">
                <Flame className="h-4 w-4 text-teal-600" />
                <span>3 mảnh ghép hoàn hảo cho sinh viên</span>
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Mọi công cụ ôn tập trong một không gian tươi mới
              </h2>
              <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Thiết kế trực quan, chữ to rõ ràng, dùng mượt trên cả máy tính lẫn điện thoại.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Ô BENTO 1 (7 Cột - Xanh Ngọc): Tài liệu + AI kiểu NotebookLM */}
              <div className="md:col-span-7 rounded-[2rem] border-2 border-teal-200 dark:border-teal-800/80 bg-gradient-to-br from-teal-50/90 via-white to-white dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 text-white px-3.5 py-1 text-xs sm:text-sm font-extrabold">
                      <BookOpen className="h-4 w-4" />
                      <span>1. Tài liệu + AI (Kiểu NotebookLM)</span>
                    </span>
                    <span className="rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-3 py-1 text-xs font-bold">
                      PDF • PPTX • DOCX
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    Tóm tắt, vẽ Mindmap &amp; trả lời kèm số trang trích dẫn
                  </h3>
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                    Đặt bất kỳ câu hỏi nào về bài học — AI giải thích dễ hiểu và chỉ rõ kiến thức nằm ở trang mấy trong giáo trình của bạn.
                  </p>
                </div>

                {/* Minh họa nhỏ trong Khung Trình Duyệt */}
                <div className="mt-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5 text-teal-600" />
                      <span>Khung trình duyệt • Hỏi đáp trích dẫn trang</span>
                    </span>
                    <span className="text-teal-600 dark:text-teal-400">Độ chính xác 99%</span>
                  </div>
                  <div className="relative h-36 w-full overflow-hidden border-b border-slate-200 dark:border-slate-700">
                    <img
                      src="/landing/notes-closeup.jpg"
                      alt="Ảnh cận cảnh ghi chú tài liệu & sơ đồ tư duy"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 rounded-lg bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[11px] font-bold text-teal-300">
                      Ghi chú trực tiếp (600 × 400)
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      <HelpCircle className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>“Sự khác nhau giữa Học có giám sát và Không giám sát là gì?”</span>
                    </div>
                    <div className="rounded-xl bg-teal-50/90 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 p-3.5 text-sm text-slate-700 dark:text-slate-200">
                      <p>
                        Học có giám sát dùng dữ liệu đã gán nhãn để dự đoán đầu ra, còn Học không giám sát tự tìm cấu trúc ẩn từ dữ liệu chưa gán nhãn.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-teal-600 text-white px-2.5 py-0.5 text-xs font-bold">
                          📄 Xem Trang 24
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-200 text-slate-900 px-2.5 py-0.5 text-xs font-bold">
                          📄 Xem Slide 31
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ô BENTO 2 (5 Cột - Vàng Tươi): Tốc độ Dưới 5 giây & Hỗ trợ AI 24/7 */}
              <div className="md:col-span-5 rounded-[2rem] border-2 border-amber-300 dark:border-amber-700/80 bg-gradient-to-br from-amber-50 via-amber-50/40 to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 text-slate-950 px-3.5 py-1 text-xs sm:text-sm font-extrabold border border-slate-900/20">
                    <Zap className="h-4 w-4 fill-slate-950" />
                    <span>Tốc độ kỷ lục</span>
                  </span>

                  <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    Xử lý dưới 5 giây. Hỗ trợ AI 24/7.
                  </h3>
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                    Không phải chờ đợi lâu. Dù bạn ôn thi lúc 11 giờ trưa hay 2 giờ sáng, trợ lý AI luôn túc trực giải đáp tức thì.
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border-2 border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Thời gian bóc tách trung bình
                      </p>
                      <p className="mt-1 font-mono text-4xl sm:text-5xl font-extrabold text-teal-600 dark:text-teal-400">
                        3.2s
                      </p>
                    </div>
                    <span className="rounded-xl bg-amber-200 text-slate-950 px-3 py-1.5 text-xs font-extrabold">
                      ⚡ Mục tiêu &lt; 5 giây
                    </span>
                  </div>
                  <div className="mt-4 h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-teal-500 to-amber-400" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                    <span>🤖 AI trực tuyến 24/7</span>
                    <span>✓ Không giới hạn câu hỏi</span>
                  </div>
                </div>
              </div>

              {/* Ô BENTO 3 (6 Cột - Hồng Tươi + Khung Điện Thoại): Kiểm tra trực tuyến & Bảng xếp hạng */}
              <div className="md:col-span-6 rounded-[2rem] border-2 border-rose-200 dark:border-rose-800/80 bg-gradient-to-br from-rose-50/80 via-white to-white dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 text-white px-3.5 py-1 text-xs sm:text-sm font-extrabold">
                      <Trophy className="h-4 w-4" />
                      <span>3. Kiểm tra trực tuyến &amp; Xếp hạng</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                      <Smartphone className="h-4 w-4" />
                      <span>Chuẩn Mobile</span>
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    AI tạo đề trắc nghiệm, đua bảng xếp hạng cùng bạn bè
                  </h3>
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                    Từ tài liệu vừa tải, AI sinh ngay câu hỏi trắc nghiệm có giải thích đáp án. Bấm thử câu trả lời bên dưới!
                  </p>
                  <div className="mt-3 relative h-28 w-full overflow-hidden rounded-2xl border-2 border-rose-200 dark:border-slate-700">
                    <img
                      src="/landing/campus-mobile.jpg"
                      alt="Học mọi nơi trên điện thoại cùng bạn bè tại khuôn viên trường"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 rounded-lg bg-slate-900/85 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                      Học mọi nơi (600 × 400)
                    </div>
                  </div>
                </div>

                {/* Khung Điện Thoại (Phone Frame Mockup) */}
                <div className="mt-6 mx-auto w-full max-w-sm rounded-[2.25rem] border-4 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg">
                  <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-300 dark:bg-slate-600" />

                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-2">
                    <span className="text-rose-600 dark:text-rose-400">CÂU 04 / 10</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-0.5">
                      <Timer className="h-3.5 w-3.5" />
                      12 giây
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Cấu trúc dữ liệu nào hoạt động theo nguyên tắc vào sau ra trước (LIFO)?
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { id: 0, text: "A. Queue (Hàng đợi)" },
                      { id: 1, text: "B. Stack (Ngăn xếp)" },
                    ].map((opt) => {
                      const isCorrect = opt.id === 1;
                      const isChosen = selectedQuizOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedQuizOption(opt.id)}
                          className={`rounded-xl border-2 p-2.5 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            isChosen && isCorrect
                              ? "border-teal-500 bg-teal-50 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200"
                              : isChosen && !isCorrect
                              ? "border-rose-400 bg-rose-50 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200"
                              : "border-slate-200 dark:border-slate-700 hover:border-teal-400"
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900 p-2.5 space-y-1.5 text-xs font-bold">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
                      <span>🥇 1. Minh Anh (Bạn)</span>
                      <span className="font-mono">3,950 đ</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>🥈 2. Hải Đăng</span>
                      <span className="font-mono">3,620 đ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ô BENTO 4 (6 Cột - Tím Nhạt): Phòng học nhóm kiểu Google Meet */}
              <div className="md:col-span-6 rounded-[2rem] border-2 border-violet-200 dark:border-violet-800/80 bg-gradient-to-br from-violet-50/80 via-white to-white dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 text-white px-3.5 py-1 text-xs sm:text-sm font-extrabold">
                    <Presentation className="h-4 w-4" />
                    <span>2. Phòng học nhóm (Kiểu Google Meet)</span>
                  </span>

                  <h3 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    Đồng bộ slide, ghi chú &amp; highlight trực tiếp theo thời gian thực
                  </h3>
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                    Chỉ cần gửi mã phòng 6 số. Khi một bạn chuyển trang hay gạch chân ý chính, cả nhóm đều thấy ngay lập tức.
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border-2 border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-200 px-3 py-1 text-xs font-extrabold font-mono">
                        MÃ PHÒNG: 248411
                      </span>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                        ● Đang đồng bộ Slide 12
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-xs sm:text-sm">
                      <p className="font-extrabold text-amber-900 dark:text-amber-300">✨ Highlight chung</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        Đánh dấu trực tiếp các định nghĩa quan trọng ngay trên slide.
                      </p>
                    </div>
                    <div className="rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 p-3 text-xs sm:text-sm">
                      <p className="font-extrabold text-teal-900 dark:text-teal-300">📌 Ghi chú nhóm</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        Dán ghi chú nhắc nhở lịch thi và mẹo làm bài cho cả phòng.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. BA BƯỚC BẮT ĐẦU ────────────────────────────────────────────── */}
        <section
          id="ba-buoc"
          className="reveal-on-scroll py-20 lg:py-24 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-950 border border-teal-300 dark:border-teal-700 px-4 py-1 text-sm font-extrabold text-teal-900 dark:text-teal-200">
                <span>Đơn giản &amp; Dễ dùng</span>
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Bắt đầu học thông minh chỉ với 3 bước
              </h2>
              <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Tải lên — Hỏi AI — Thi cùng bạn bè. Không cần cài đặt phức tạp.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {studentSteps.map((step) => {
                const IconComponent = step.icon;
                return (
                  <div
                    key={step.number}
                    className={`rounded-[2rem] border-2 p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between ${step.cardBg}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${step.iconBg}`}>
                          <IconComponent className="h-7 w-7" strokeWidth={2} />
                        </div>
                        <span className={`rounded-full px-3.5 py-1 text-xs font-extrabold ${step.badgeBg}`}>
                          {step.sticker}
                        </span>
                      </div>

                      <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                        {step.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      <span>{step.preview}</span>
                      <span className="font-mono text-sm">#{step.number}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 6. LỜI NHẬN XÉT TỪ SINH VIÊN (TESTIMONIALS) ───────────────────── */}
        <section
          id="nhan-xet"
          className="reveal-on-scroll py-20 bg-amber-50/40 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 dark:bg-pink-950 border border-pink-300 dark:border-pink-800 px-4 py-1 text-sm font-extrabold text-pink-800 dark:text-pink-200">
                <Star className="h-4 w-4 fill-pink-500 text-pink-500" />
                <span>Được sinh viên các trường yêu thích</span>
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Sinh viên nói gì về PeerMind?
              </h2>
              <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Những chia sẻ chân thật sau mỗi mùa chạy deadline và ôn thi cuối kỳ.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {studentTestimonials.map((item) => (
                <div
                  key={item.name}
                  className={`rounded-[2rem] border-2 p-7 shadow-sm flex flex-col justify-between ${item.cardAccent}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${item.stickerColor}`}>
                        ★ {item.sticker}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Avatar 120×120px
                      </span>
                    </div>

                    <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                      “{item.quote}”
                    </p>
                  </div>

                  {/* Placeholder Avatar Sinh viên kèm ghi chú rõ ràng */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                    <div className="relative h-12 w-12 shrink-0">
                      {item.avatarSrc ? (
                        <img
                          src={item.avatarSrc}
                          alt={item.name}
                          className="h-12 w-12 rounded-2xl object-cover border-2 border-slate-900/15 shadow-2xs"
                        />
                      ) : (
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl font-extrabold text-base border-2 border-slate-900/15 ${item.avatarBg}`}
                        >
                          {item.initials}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                        {item.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 7. LỜI KÊU GỌI CUỐI TRANG (CTA) ──────────────────────────────── */}
        <section className="reveal-on-scroll py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-teal-500 bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-600 p-8 sm:p-14 text-white shadow-2xl shadow-teal-600/20">
              <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-amber-300/20 blur-2xl" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 text-slate-950 px-4 py-1 text-xs sm:text-sm font-extrabold">
                    <Zap className="h-4 w-4 fill-slate-950" />
                    <span>Xử lý tài liệu dưới 5 giây • Hỗ trợ AI 24/7</span>
                  </span>
                  <h2 className="mt-4 !text-white text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                    Sẵn sàng ôn thi nhẹ nhàng hơn cùng hội bạn?
                  </h2>
                  <p className="mt-3 text-teal-50 text-base sm:text-lg leading-relaxed">
                    Thử kéo thả ngay cuốn giáo trình đầu tiên của bạn lên PeerMind hoàn toàn miễn phí.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 hover:bg-amber-200 text-slate-950 px-7 py-4 text-base sm:text-lg font-extrabold shadow-lg transition-all cursor-pointer"
                  >
                    <span>Bắt đầu học ngay</span>
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={handleGuestLogin}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/80 bg-white/10 hover:bg-white/20 text-white px-7 py-3.5 text-base font-bold transition-all cursor-pointer"
                  >
                    <span>Dùng thử không cần đăng ký</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER GỌN GÀNG ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <Logo size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              • Nền tảng học tập AI cho sinh viên
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Điều hướng chân trang">
            <a href="#hoc-nhom" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Phòng học nhóm
            </a>
            <a href="#truoc-sau" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Trước &amp; Sau
            </a>
            <a href="#tinh-nang" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Tính năng
            </a>
            <a href="#ba-buoc" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              3 bước bắt đầu
            </a>
          </nav>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2026 PeerMind. Học thông minh hơn mỗi ngày.
          </p>
        </div>
      </footer>

      {/* ─── AUTH MODAL ──────────────────────────────────────────────────────── */}
      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl sm:p-8 transition-colors duration-150">
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="h-5 w-5" />
            </button>

            {authView === "login" && (
              <>
                <h2 id="login-title" className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                  Chào mừng bạn trở lại! 👋
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Đăng nhập để đồng bộ tài liệu và phòng học nhóm của bạn.
                </p>

                <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                  {authNotice && (
                    <div className="p-3.5 text-sm rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200">
                      {authNotice}
                    </div>
                  )}
                  {authError && (
                    <div className="p-3.5 text-sm rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                      {authError}
                    </div>
                  )}

                  <label className="block">
                    <span className="form-label">Email sinh viên / cá nhân</span>
                    <input
                      required
                      type="email"
                      placeholder="ban@student.edu.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="form-label">Mật khẩu</span>
                      <button
                        type="button"
                        onClick={() => changeAuthView("forgot")}
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
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
                    className="primary-button w-full h-11 justify-center cursor-pointer disabled:opacity-60"
                  >
                    {authLoading ? "Đang xác thực..." : "Đăng nhập ngay"}
                  </button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-semibold">Hoặc</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    className="secondary-button w-full h-11 justify-center cursor-pointer text-sm"
                  >
                    Dùng thử ngay không cần đăng ký
                  </button>

                  <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-1">
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("register")}
                      className="font-extrabold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      Đăng ký miễn phí
                    </button>
                  </p>
                </form>
              </>
            )}

            {authView === "register" && (
              <>
                <h2 id="login-title" className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                  Tạo tài khoản mới ✨
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Miễn phí cho sinh viên đại học. Chỉ mất 30 giây.
                </p>

                <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                  {authError && (
                    <div className="p-3.5 text-sm rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                      {authError}
                    </div>
                  )}

                  <label className="block">
                    <span className="form-label">Họ và tên</span>
                    <input
                      required
                      type="text"
                      placeholder="Nguyễn Minh Anh"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>
                  <label className="block">
                    <span className="form-label">Email</span>
                    <input
                      required
                      type="email"
                      placeholder="ban@student.edu.vn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      disabled={authLoading}
                    />
                  </label>
                  <label className="block">
                    <span className="form-label">Mật khẩu (tối thiểu 6 ký tự)</span>
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
                    className="primary-button w-full h-11 justify-center cursor-pointer disabled:opacity-60"
                  >
                    {authLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                  </button>

                  <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Đã có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("login")}
                      className="font-extrabold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
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
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại đăng nhập
                </button>
                <h2 id="login-title" className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                  Quên mật khẩu?
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setIsSubmitted(true);
                    }}
                    className="mt-6 space-y-4"
                  >
                    <label className="block">
                      <span className="form-label">Email</span>
                      <input
                        required
                        type="email"
                        placeholder="ban@student.edu.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-input"
                      />
                    </label>
                    <button type="submit" className="primary-button w-full h-11 justify-center cursor-pointer">
                      Gửi liên kết khôi phục
                    </button>
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
        <div style={{ display: activeTab === "documents" ? "block" : "none" }}>
          <LibraryPage userId={userId} userName={userName} />
        </div>
        <div style={{ display: activeTab === "classrooms" ? "block" : "none" }}>
          <ClassroomsPage userId={userId} userName={userName} />
        </div>
        <div style={{ display: activeTab === "tests" ? "block" : "none" }}>
          <TestsPage userId={userId} userName={userName} />
        </div>
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
    <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/70 p-5 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white">
        <Check className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <p className="mt-3 font-extrabold text-teal-950 text-base">{title}</p>
      <p className="mt-1 text-sm text-teal-800 leading-relaxed">{description}</p>
      <button onClick={onContinue} className="primary-button mt-4 w-full justify-center cursor-pointer">
        {buttonText}
      </button>
    </div>
  );
}
