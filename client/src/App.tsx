import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Sparkles,
  X,
  Menu,
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
  Monitor,
  HelpCircle,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Logo } from "./components/common/Logo";
import { ThemeToggle } from "./components/common/ThemeToggle";
import { Header, DashboardTab } from "./components/common/Header";
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const ClassroomsPage = lazy(() => import("./pages/ClassroomsPage"));
const TestsPage = lazy(() => import("./pages/TestsPage"));
import { ClassroomHeroAnimation } from "./components/common/ClassroomHeroAnimation";
import {
  logoutUser,
  getCurrentUser,
  loginAsGuest,
  clearAllUserState,
  fetchUserProfile,
  detectGuestDataInStorage,
  migrateGuestDataToAccount,
  discardGuestDataInStorage,
  UserProfile,
  GuestDataSummary,
} from "./services/authService";
import { supabase } from "./services/supabaseClient";
import { socket } from "./services/socket";
import { idleService, IdleState } from "./services/idleService";
import { IdleWarningModal } from "./components/common/IdleWarningModal";
import {
  AuthSplitScreen,
  AuthScreenMode,
  SessionExpiredModal,
  GuestMigrationModal,
  ProfileSettingsModal,
} from "./components/common/AuthScreens";
import { isValidUUID } from "./utils";
const MotionShowcaseModal = lazy(() =>
  import("./components/motion/MotionShowcaseModal").then((m) => ({
    default: m.MotionShowcaseModal,
  }))
);

const RETURN_URL_STORAGE_KEY = "permind_return_after_login";

function parseInitialAuthRoute(): {
  showScreen: boolean;
  mode: AuthScreenMode;
  expiredError?: string | null;
} {
  if (typeof window === "undefined") {
    return { showScreen: false, mode: "login" };
  }
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  // Kiểm tra lỗi link hết hạn từ Supabase redirect (#error=access_denied&error_code=otp_expired...)
  if (
    hash.includes("error_code=otp_expired") ||
    hash.includes("error=access_denied") ||
    search.includes("error_code=otp_expired")
  ) {
    return {
      showScreen: true,
      mode: "reset-password",
      expiredError:
        "Liên kết đặt lại mật khẩu hoặc xác thực này đã hết hạn hoặc đã được sử dụng trước đó. Vui lòng yêu cầu gửi lại liên kết mới.",
    };
  }

  if (path === "/reset-password" || hash.includes("type=recovery")) {
    return { showScreen: true, mode: "reset-password" };
  }
  if (path === "/register" || path === "/signup") {
    return { showScreen: true, mode: "register" };
  }
  if (path === "/forgot-password") {
    return { showScreen: true, mode: "forgot-password" };
  }
  if (path === "/login" || path === "/signin") {
    return { showScreen: true, mode: "login" };
  }
  // Bảo vệ route: nếu chưa đăng nhập mà vào thẳng các đường dẫn chức năng thì chuyển hướng sang /login
  if (["/dashboard", "/documents", "/classrooms", "/tests", "/workspace"].includes(path)) {
    try {
      sessionStorage.setItem(RETURN_URL_STORAGE_KEY, `${window.location.pathname}${window.location.hash}`);
    } catch {}
    return { showScreen: true, mode: "login" };
  }

  return { showScreen: false, mode: "login" };
}

// ─── Hệ thống class dùng chung cho landing page ─────────────────────────────
const CARD = "rounded-[2rem] border-[1.5px] border-[#cfe5e2] dark:border-[#1f3a3d]";
const INNER = "border-[1.5px] border-[#cfe5e2] dark:border-[#1f3a3d]";
const CARD_BODY = "text-[15px] leading-[1.6] text-slate-800 dark:text-slate-200";
const SECTION_LEAD = "text-base sm:text-lg leading-[1.6] text-slate-700 dark:text-slate-300";
const H2 = "text-[2rem] sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white";
const H3 = "font-semibold tracking-tight text-slate-900 dark:text-white";
const BADGE = "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-semibold";

const studentSteps = [
  {
    number: 1,
    title: "Tải lên tài liệu",
    description:
      "Kéo thả file PDF, Slide PPTX hoặc DOCX môn học lên hệ thống. Chấp nhận cả giáo trình dày hàng trăm trang.",
    cardBg: "bg-teal-50/80 dark:bg-teal-950/30",
    numberBg: "bg-teal-700 text-white",
  },
  {
    number: 2,
    title: "Hỏi AI & xem sơ đồ",
    description:
      "AI tự động tóm tắt ý chính, vẽ sơ đồ tư duy trực quan và trả lời câu hỏi kèm trích dẫn đúng số trang.",
    cardBg: "bg-amber-50/80 dark:bg-amber-950/30",
    numberBg: "bg-amber-400 text-slate-950",
  },
  {
    number: 3,
    title: "Thi cùng bạn bè",
    description:
      "Mở phòng học nhóm đồng bộ slide, thảo luận trực tiếp và thi đua bảng xếp hạng với bộ câu hỏi trắc nghiệm do AI tạo.",
    cardBg: "bg-rose-50/80 dark:bg-rose-950/30",
    numberBg: "bg-rose-600 text-white",
  },
];

const studentTestimonials = [
  {
    name: "Nguyễn Minh Anh",
    role: "Sinh viên năm 3 • ĐH Kinh tế Quốc dân",
    avatarSrc: "/landing/avatar1.jpg",
    quote:
      "Giáo trình Kinh tế vĩ mô dày quá, mình thả vào Permind là có ngay sơ đồ tư duy kèm số trang để dò lại, đỡ phải lật tìm từng chương.",
  },
  {
    name: "Trần Hải Đăng",
    role: "Sinh viên năm 2 • ĐH Bách Khoa",
    avatarSrc: "/landing/avatar2.jpg",
    quote:
      "Thích nhất là lúc học nhóm trước ngày thi: cả nhóm xem chung một slide có highlight trực tiếp, rồi mở bảng xếp hạng trắc nghiệm thi đua như chơi game.",
  },
  {
    name: "Lê Thảo Vy",
    role: "Sinh viên năm 4 • ĐH Ngoại thương",
    avatarSrc: "/landing/avatar3.jpg",
    quote:
      "Ôn thi khuya thắc mắc chỗ nào hỏi AI là có câu trả lời, lại chỉ rõ nằm ở trang mấy trong slide của thầy cô nên mình yên tâm tự kiểm tra lại.",
  },
];

export default function App() {
  const initialRoute = parseInitialAuthRoute();

  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(initialRoute.showScreen);
  const [authMode, setAuthMode] = useState<AuthScreenMode>(initialRoute.mode);
  const [recoveryExpiredError, setRecoveryExpiredError] = useState<string | null>(
    initialRoute.expiredError || null
  );

  const [isMotionLabOpen, setIsMotionLabOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    email?: string;
    is_anonymous?: boolean;
    app_metadata?: { provider?: string; providers?: string[] };
    user_metadata?: { full_name?: string; display_name?: string; username?: string; avatar_url?: string; picture?: string };
  } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [selectedQuizOption, setSelectedQuizOption] = useState<number>(1);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Modal hết phiên đăng nhập (Mục 2.2)
  const [sessionExpiredModalOpen, setSessionExpiredModalOpen] = useState(false);

  // Modal đồng bộ dữ liệu chế độ khách -> tài khoản (Mục 2.6)
  const [guestSummary, setGuestSummary] = useState<GuestDataSummary | null>(null);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestSyncLoading, setGuestSyncLoading] = useState(false);
  const [guestSyncError, setGuestSyncError] = useState<string | null>(null);
  const [docRefreshVersion, setDocRefreshVersion] = useState(0);

  // Modal cài đặt tài khoản (Mục 2.5)
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Idle session state ─────────────────────────────────────────────────────
  const [idleState, setIdleState] = useState<IdleState>({ isWarning: false, remainingSeconds: 60 });
  const idleTimeoutRef = useRef<() => void>(() => {});
  const hasBeenLoggedIn = useRef(false);
  const isExplicitLogout = useRef(false);

  // Đồng bộ URL khi mở màn hình xác thực (/login, /register, /forgot-password, /reset-password)
  const updateBrowserUrlForAuth = (open: boolean, mode: AuthScreenMode) => {
    if (typeof window === "undefined") return;
    if (!open) {
      const p = window.location.pathname.toLowerCase();
      if (["/login", "/register", "/forgot-password", "/reset-password", "/signin", "/signup"].includes(p)) {
        window.history.replaceState(null, "", `/${window.location.hash || ""}`);
      }
      return;
    }
    const targetPath =
      mode === "register"
        ? "/register"
        : mode === "forgot-password"
        ? "/forgot-password"
        : mode === "reset-password"
        ? "/reset-password"
        : "/login";
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
  };

  // Kiểm tra hồ sơ user sau khi đăng nhập (xử lý Google lần đầu chưa có username + phát hiện dữ liệu khách)
  const handleAuthenticatedUser = async (user: User, providedProfile?: UserProfile | null) => {
    hasBeenLoggedIn.current = true;
    setCurrentUser(user);

    const isAnon = Boolean((user as any).is_anonymous) || user.id === "guest-user-001";
    if (isAnon) {
      setIsLoginOpen(false);
      setIsLoggedIn(true);
      return;
    }

    let profile = providedProfile !== undefined ? providedProfile : await fetchUserProfile(user.id);
    const metaUsername = user.user_metadata?.username || null;
    const isGoogleSignIn =
      user.app_metadata?.provider === "google" ||
      (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("google"));

    // Nếu đăng nhập bằng Google lần đầu và chưa có username trong bảng profiles -> hiện bước "Chọn tên người dùng"
    if (isGoogleSignIn && !profile?.username && !metaUsername) {
      setUserProfile(profile);
      setAuthMode("choose-username");
      setIsLoginOpen(true);
      setIsLoggedIn(false);
      return;
    }

    if (profile) {
      setUserProfile(profile);
    }

    setIsLoginOpen(false);
    setIsLoggedIn(true);

    // Khôi phục lại trang/tab đang xem trước khi đăng nhập (Mục 2.2 & 2.7)
    if (typeof window !== "undefined") {
      try {
        const savedReturn = sessionStorage.getItem(RETURN_URL_STORAGE_KEY);
        if (savedReturn) {
          sessionStorage.removeItem(RETURN_URL_STORAGE_KEY);
          const hashIdx = savedReturn.indexOf("#");
          const targetHash = hashIdx >= 0 ? savedReturn.slice(hashIdx) : "#documents";
          window.history.replaceState(null, "", `/${targetHash}`);
        } else {
          updateBrowserUrlForAuth(false, "login");
        }
      } catch {}
    }

    // Kiểm tra xem có dữ liệu chế độ khách trong localStorage cần đồng bộ không (Mục 2.6)
    if (isValidUUID(user.id)) {
      const summary = detectGuestDataInStorage();
      if (summary.hasGuestData) {
        setGuestSummary(summary);
        setGuestModalOpen(true);
      }
    }
  };

  // Hỗ trợ mở phòng thử nghiệm Motion nội bộ qua phím tắt Ctrl+Shift+M
  useEffect(() => {
    (window as unknown as { openMotionLab?: () => void }).openMotionLab = () => setIsMotionLabOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "M" || e.key === "m")) {
        e.preventDefault();
        setIsMotionLabOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      delete (window as unknown as { openMotionLab?: () => void }).openMotionLab;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ── Auth init + Supabase listener ───────────────────────────────────────────
  useEffect(() => {
    idleService.init(() => idleTimeoutRef.current());

    async function checkAuth() {
      const user = await getCurrentUser();
      if (user) {
        // Nếu đang ở màn hình /reset-password thì giữ nguyên để người dùng đặt mật khẩu mới
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (path === "/reset-password" || hash.includes("type=recovery")) {
          setCurrentUser(user);
          setAuthMode("reset-password");
          setIsLoginOpen(true);
          return;
        }
        await handleAuthenticatedUser(user);
      }
    }
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        if (event === "PASSWORD_RECOVERY") {
          if (session?.user) {
            setCurrentUser(session.user);
          }
          setRecoveryExpiredError(null);
          setAuthMode("reset-password");
          setIsLoginOpen(true);
          setIsLoggedIn(false);
          return;
        }

        if (event === "SIGNED_OUT" || !session) {
          if (!hasBeenLoggedIn.current || isExplicitLogout.current) {
            return;
          }

          // Lưu lại trang/tab đang xem để quay lại sau khi đăng nhập lại (Mục 2.2)
          try {
            const currentUrl = `${window.location.pathname}${window.location.hash}`;
            sessionStorage.setItem(RETURN_URL_STORAGE_KEY, currentUrl);
          } catch {}

          idleService.stop();
          clearAllUserState();
          setCurrentUser(null);
          setUserProfile(null);
          setIsLoggedIn(false);
          setSessionExpiredModalOpen(true);
        } else if (event === "SIGNED_IN" && session?.user) {
          hasBeenLoggedIn.current = true;
          const path = window.location.pathname.toLowerCase();
          if (path !== "/reset-password") {
            await handleAuthenticatedUser(session.user);
          }
        }
      }, 0);
    });

    const handlePopState = () => {
      const parsed = parseInitialAuthRoute();
      if (parsed.showScreen && !hasBeenLoggedIn.current) {
        setAuthMode(parsed.mode);
        setIsLoginOpen(true);
      } else if (!parsed.showScreen && !hasBeenLoggedIn.current) {
        setIsLoginOpen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      subscription.unsubscribe();
      idleService.stop();
      window.removeEventListener("popstate", handlePopState);
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

  // Hiệu ứng hiện dần khi cuộn (Scroll Reveal) trên Landing Page
  useEffect(() => {
    if (isLoggedIn || isLoginOpen) return;
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    const reveal = (el: Element) => el.classList.add("is-visible");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      elements.forEach(reveal);
      return;
    }

    root.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 120px 0px" }
    );
    elements.forEach((el) => observer.observe(el));

    const revealPassed = () => {
      const vh = window.innerHeight + 80;
      elements.forEach((el) => {
        if (el.getBoundingClientRect().top <= vh) reveal(el);
      });
    };
    revealPassed();
    const safety = window.setTimeout(revealPassed, 800);
    window.addEventListener("scroll", revealPassed, { passive: true });

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
      window.removeEventListener("scroll", revealPassed);
      root.classList.remove("reveal-ready");
    };
  }, [isLoggedIn, isLoginOpen]);

  const openLogin = () => {
    setAuthError(null);
    setAuthNotice(null);
    setRecoveryExpiredError(null);
    setAuthMode("login");
    setIsLoginOpen(true);
    setIsMenuOpen(false);
    updateBrowserUrlForAuth(true, "login");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleModeChange = (nextMode: AuthScreenMode) => {
    setAuthMode(nextMode);
    setRecoveryExpiredError(null);
    updateBrowserUrlForAuth(true, nextMode);
  };

  const handleGuestLogin = async () => {
    try {
      const { user } = await loginAsGuest();
      hasBeenLoggedIn.current = true;
      if (user) {
        setCurrentUser({
          ...user,
          is_anonymous: true,
          user_metadata: {
            ...(user.user_metadata || {}),
            full_name: user.user_metadata?.full_name || "Khách trải nghiệm",
          },
        });
      } else {
        setCurrentUser({
          id: "guest-user-001",
          email: "guest@permind.demo",
          is_anonymous: true,
          user_metadata: { full_name: "Khách trải nghiệm" },
        });
      }
      setUserProfile(null);
      setIsLoginOpen(false);
      setIsLoggedIn(true);
      updateBrowserUrlForAuth(false, "login");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const handleIdleTimeout = async () => {
    try {
      const currentUrl = `${window.location.pathname}${window.location.hash}`;
      sessionStorage.setItem(RETURN_URL_STORAGE_KEY, currentUrl);
    } catch {}

    idleService.stop();
    isExplicitLogout.current = true;
    hasBeenLoggedIn.current = false;
    try {
      if (socket.connected) socket.disconnect();
      await logoutUser();
    } catch {}
    clearAllUserState();
    setCurrentUser(null);
    setUserProfile(null);
    setIsLoggedIn(false);
    setSessionExpiredModalOpen(true);
    setTimeout(() => {
      isExplicitLogout.current = false;
    }, 1000);
  };

  useEffect(() => {
    idleTimeoutRef.current = handleIdleTimeout;
  });

  // Xử lý đăng xuất chủ động
  const handleLogout = async () => {
    idleService.stop();
    clearAllUserState();
    isExplicitLogout.current = true;
    hasBeenLoggedIn.current = false;
    setIsLoginOpen(false);
    setSettingsOpen(false);
    setAuthNotice(null);
    setCurrentUser(null);
    setUserProfile(null);
    setIsLoggedIn(false);
    updateBrowserUrlForAuth(false, "login");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      if (socket.connected) socket.disconnect();
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setTimeout(() => {
        isExplicitLogout.current = false;
      }, 1000);
    }
  };

  // Xử lý đồng bộ dữ liệu chế độ khách lên tài khoản mới (Mục 2.6)
  const handleConfirmGuestSync = async () => {
    if (!currentUser?.id || guestSyncLoading) return;
    setGuestSyncLoading(true);
    setGuestSyncError(null);
    try {
      await migrateGuestDataToAccount(currentUser.id);
      setGuestModalOpen(false);
      setGuestSummary(null);
      setDocRefreshVersion((v) => v + 1);
    } catch (err: any) {
      setGuestSyncError(
        err?.message || "Có lỗi xảy ra khi đồng bộ. Dữ liệu dùng thử của bạn vẫn được giữ an toàn."
      );
    } finally {
      setGuestSyncLoading(false);
    }
  };

  const handleSkipGuestSync = () => {
    discardGuestDataInStorage();
    setGuestModalOpen(false);
    setGuestSummary(null);
  };

  const resolvedDisplayName =
    userProfile?.display_name ||
    userProfile?.username ||
    currentUser?.user_metadata?.display_name ||
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.username ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "Minh Anh");

  const resolvedAvatarUrl =
    userProfile?.avatar_url ||
    currentUser?.user_metadata?.avatar_url ||
    currentUser?.user_metadata?.picture ||
    null;

  // 1. Nếu đã đăng nhập vào ứng dụng
  if (isLoggedIn) {
    return (
      <>
        <Dashboard
          key={`dashboard_${currentUser?.id || "guest"}_${docRefreshVersion}`}
          onLogout={handleLogout}
          onOpenSettings={() => setSettingsOpen(true)}
          userId={currentUser?.id}
          userName={resolvedDisplayName}
          userEmail={currentUser?.email}
          avatarUrl={resolvedAvatarUrl}
        />
        <IdleWarningModal
          open={idleState.isWarning}
          remainingSeconds={idleState.remainingSeconds}
          onContinue={() => idleService.resetTimer()}
          onLogout={handleLogout}
        />
        <GuestMigrationModal
          open={guestModalOpen}
          summary={guestSummary}
          loading={guestSyncLoading}
          error={guestSyncError}
          onConfirmSync={handleConfirmGuestSync}
          onSkipSync={handleSkipGuestSync}
        />
        <ProfileSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          userId={currentUser?.id}
          username={userProfile?.username || currentUser?.user_metadata?.username || null}
          displayName={resolvedDisplayName}
          userEmail={currentUser?.email}
          avatarUrl={resolvedAvatarUrl}
          onProfileUpdated={(newName) => {
            setUserProfile((prev) =>
              prev
                ? { ...prev, display_name: newName }
                : {
                    id: currentUser?.id || "",
                    username: currentUser?.user_metadata?.username || null,
                    display_name: newName,
                    avatar_url: resolvedAvatarUrl,
                  }
            );
          }}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // 2. Nếu đang mở màn hình Đăng nhập / Đăng ký / Quên mật khẩu / Đặt lại mật khẩu / Chọn tên người dùng (chia đôi màn hình trên Desktop)
  if (isLoginOpen) {
    return (
      <>
        <AuthSplitScreen
          mode={authMode}
          onModeChange={handleModeChange}
          onBackToLanding={() => {
            setIsLoginOpen(false);
            updateBrowserUrlForAuth(false, "login");
          }}
          onAuthSuccess={(user, prof) => handleAuthenticatedUser(user, prof)}
          onGuestLogin={handleGuestLogin}
          currentUser={currentUser as User | null}
          initialNotice={authNotice}
          initialError={authError}
          recoveryExpiredError={recoveryExpiredError}
        />
        <SessionExpiredModal
          open={sessionExpiredModalOpen}
          onConfirmRelogin={() => {
            setSessionExpiredModalOpen(false);
            setAuthMode("login");
            setIsLoginOpen(true);
            updateBrowserUrlForAuth(true, "login");
          }}
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
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded-xs transition-colors" href="#hoc-nhom">
              Học nhóm
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded-xs transition-colors" href="#truoc-sau">
              Trước &amp; Sau
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded-xs transition-colors" href="#tinh-nang">
              Tính năng
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded-xs transition-colors" href="#ba-buoc">
              3 bước bắt đầu
            </a>
            <a className="text-base font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded-xs transition-colors" href="#nhan-xet">
              Nhận xét
            </a>
          </nav>

          {/* Desktop Right: Theme Toggle & CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <button
              onClick={handleGuestLogin}
              className="rounded-sm border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-teal-500 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition-all cursor-pointer"
            >
              Dùng thử ngay
            </button>
            <button
              onClick={openLogin}
              className="inline-flex items-center gap-2 rounded-pill bg-teal-700 hover:bg-teal-800 text-white px-5 py-2.5 text-sm font-bold shadow-sm shadow-teal-700/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 transition-all cursor-pointer"
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
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              aria-label={isMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="mx-5 my-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl md:hidden">
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
                  className="rounded-sm px-3.5 py-2.5 text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-slate-800"
                >
                  {label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleGuestLogin}
                  className="rounded-sm border-2 border-teal-500 py-2.5 text-base font-bold text-teal-700 dark:text-teal-300"
                >
                  Dùng thử không cần đăng ký
                </button>
                <button
                  onClick={openLogin}
                  className="rounded-pill bg-teal-700 py-2.5 text-base font-bold text-white"
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
          <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-teal-200/40 dark:bg-teal-900/20 blur-3xl" />
          <div className="pointer-events-none absolute top-20 right-10 h-72 w-72 rounded-full bg-amber-200/40 dark:bg-amber-900/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-10 h-64 w-64 rounded-full bg-pink-200/35 dark:bg-pink-900/15 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
              <div className="lg:col-span-6 min-w-0">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-teal-100/90 dark:bg-teal-950/80 border-[1.5px] border-[#cfe5e2] dark:border-[#1f3a3d] px-4 py-1.5 text-sm font-semibold text-teal-900 dark:text-teal-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
                  <span>Nền tảng học tập AI cho sinh viên đại học</span>
                </div>

                <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                  Hiểu giáo trình{" "}
                  <span className="inline-block rounded-2xl bg-teal-500/15 dark:bg-teal-500/25 px-3 py-0.5 text-teal-800 dark:text-teal-300">
                    trong vài giây.
                  </span>{" "}
                  Học nhóm vui như ngồi cạnh nhau.
                </h1>

                <p className="mt-6 max-w-xl text-lg sm:text-xl leading-[1.6] text-slate-700 dark:text-slate-300">
                  Tải lên file PDF, PPTX hay DOCX — AI tóm tắt ngay thành{" "}
                  <strong className="font-semibold text-slate-900 dark:text-white">sơ đồ tư duy có trích dẫn trang</strong>, mở phòng học đồng bộ slide và tạo đề trắc nghiệm thi cùng hội bạn.
                </p>

                <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white px-7 py-4 text-base sm:text-lg font-bold shadow-lg shadow-teal-700/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    <span>Bắt đầu học ngay</span>
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={handleGuestLogin}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-6 py-4 text-base sm:text-lg font-semibold transition-all cursor-pointer"
                  >
                    <span>Dùng thử không cần đăng ký</span>
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 dark:bg-amber-950/70 px-4 py-2 text-[15px] font-semibold text-slate-900 dark:text-amber-100">
                    <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400 fill-amber-500 shrink-0" />
                    <span>Xử lý tài liệu dưới 5 giây</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-violet-100 dark:bg-violet-950/70 px-4 py-2 text-[15px] font-semibold text-violet-950 dark:text-violet-100">
                    <Bot className="h-5 w-5 text-violet-700 dark:text-violet-300 shrink-0" />
                    <span>Hỗ trợ AI 24/7</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 min-w-0">
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
              <h2 className={H2}>
                Gần gũi như ngồi chung bàn thư viện cùng hội bạn thân
              </h2>
              <p className={`mt-4 ${SECTION_LEAD}`}>
                Dù mỗi người ở một nơi, cả nhóm vẫn cùng lật từng trang slide, tô sáng công thức quan trọng và nhắn tin thảo luận ngay trên tài liệu.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
              <div className={`lg:col-span-5 min-w-0 flex flex-col justify-between gap-5 ${CARD} bg-amber-50/70 dark:bg-slate-900 p-6 sm:p-7`}>
                <figure className="relative overflow-hidden rounded-3xl shadow-md group">
                  <img
                    src="/landing/study-group.jpg" loading="lazy" decoding="async" width={640} height={336}
                    alt="Nhóm sinh viên đại học đang học chung quanh bàn gỗ trong thư viện"
                    className="w-full h-72 sm:h-84 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent p-5 pt-12 text-base sm:text-lg font-semibold leading-snug text-white">
                    Học cùng bạn bè, ôn bài nhẹ nhàng hơn
                  </figcaption>
                </figure>

                <div className={`rounded-2xl bg-white dark:bg-slate-800 ${INNER} p-4 flex flex-wrap items-center justify-between gap-3`}>
                  <div className="flex -space-x-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-white text-sm font-bold ring-2 ring-white dark:ring-slate-900">
                      MA
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-sm font-bold ring-2 ring-white dark:ring-slate-900">
                      HĐ
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white text-sm font-bold ring-2 ring-white dark:ring-slate-900">
                      TV
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white text-sm font-bold ring-2 ring-white dark:ring-slate-900">
                      +3
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                      Nhóm Ôn Thi Kinh Tế Vĩ Mô
                    </p>
                    <p className="text-sm text-teal-800 dark:text-teal-300">
                      6 bạn đang cùng xem slide trang 8
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 min-w-0">
                <div className={`h-full ${CARD} bg-white dark:bg-slate-900 shadow-xl overflow-hidden`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#cfe5e2] dark:border-[#1f3a3d] bg-slate-100 dark:bg-slate-800/90 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-rose-400" />
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-amber-400" />
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-teal-400" />
                      <span className="ml-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Phòng học #248411 • Đồng bộ slide trực tiếp
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 px-3 py-1 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-teal-600" />
                      <span>Đang đồng bộ</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-7 p-5 sm:p-6 border-b md:border-b-0 md:border-r border-[#cfe5e2] dark:border-[#1f3a3d] bg-slate-50/60 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        <span className={`rounded-lg bg-white dark:bg-slate-800 ${INNER} px-2.5 py-1`}>
                          SLIDE 08 / 24
                        </span>
                        <span className="text-teal-800 dark:text-teal-300">
                          Người điều khiển: Minh Anh
                        </span>
                      </div>

                      <div className={`rounded-2xl ${INNER} bg-white dark:bg-slate-800 p-4`}>
                        <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                          Chương 4: Cách tính GDP thực tế &amp; Lạm phát
                        </p>
                        <p className="mt-2 text-[15px] leading-[1.6] text-slate-700 dark:text-slate-200">
                          GDP danh nghĩa tính theo giá hiện hành, còn{" "}
                          <mark className="rounded bg-amber-200 dark:bg-amber-400/90 px-1.5 py-0.5 font-semibold text-slate-950">
                            GDP thực tế đã loại bỏ biến động giá
                          </mark>{" "}
                          để phản ánh đúng sản lượng hàng hóa.
                        </p>

                        <div className="mt-4 rounded-xl bg-amber-100 dark:bg-amber-950/80 p-3 text-sm leading-[1.6] text-amber-950 dark:text-amber-100 rotate-1 shadow-xs">
                          📌 <strong className="font-semibold">Ghi chú của Hải Đăng:</strong> Nhớ phân biệt rõ hệ số giảm phát GDP với chỉ số CPI nhé cả nhà!
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                            <MousePointer2 className="h-4 w-4 fill-rose-500" />
                            <span>Thảo Vy đang highlight</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Highlighter className="h-4 w-4 text-amber-600" />
                            <StickyNote className="h-4 w-4 text-teal-700" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-5 p-5 bg-white dark:bg-slate-900 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[15px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <MessageCircle className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                            Trò chuyện nhóm
                          </span>
                          <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                            4 bạn online
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white text-xs font-bold">
                              MA
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-sm leading-[1.5]">
                              <p className="font-semibold text-teal-800 dark:text-teal-300">Minh Anh</p>
                              <p className="text-slate-700 dark:text-slate-200 mt-0.5">
                                Trang 8 này chắc chắn có trong đề thi giữa kỳ tuần sau nè!
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs font-bold">
                              HĐ
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-amber-50 dark:bg-amber-950/50 px-3.5 py-2 text-sm leading-[1.5]">
                              <p className="font-semibold text-amber-900 dark:text-amber-300">Hải Đăng</p>
                              <p className="text-slate-700 dark:text-slate-200 mt-0.5">
                                Mình vừa dán ghi chú công thức ngay dưới slide rồi nha ✍️
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-xs font-bold">
                              TV
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2 text-sm leading-[1.5]">
                              <p className="font-semibold text-rose-800 dark:text-rose-300">Thảo Vy</p>
                              <p className="text-slate-700 dark:text-slate-200 mt-0.5">
                                Xem xong chương này tụi mình bấm tạo đề trắc nghiệm thi thử luôn đi! 🔥
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span>Mã phòng: <strong className="font-semibold text-slate-900 dark:text-white font-mono">248411</strong></span>
                        <span className="font-semibold text-teal-800 dark:text-teal-300">Vào bằng 1 chạm →</span>
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
              <h2 className={H2}>
                Tạm biệt cảnh bơi trong giáo trình dày cộp
              </h2>
              <p className={`mt-4 ${SECTION_LEAD}`}>
                So sánh cách ôn thi truyền thống với trải nghiệm học tập trên Permind.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
              <div className={`lg:col-span-5 min-w-0 ${CARD} bg-slate-100/80 dark:bg-slate-900/80 p-6 sm:p-8`}>
                <span className={`${BADGE} bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200`}>
                  😩 Trước khi dùng Permind
                </span>
                <h3 className={`mt-4 text-2xl sm:text-3xl ${H3}`}>
                  Giáo trình 120 trang chữ dày đặc
                </h3>
                <p className={`mt-2 ${CARD_BODY}`}>
                  Đọc trước quên sau, không biết trọng tâm nằm ở trang nào khi sát ngày thi.
                </p>

                <div className={`mt-6 rounded-2xl ${INNER} bg-white dark:bg-slate-800 p-5 space-y-3`}>
                  <p className="font-mono text-xs font-semibold text-rose-700 dark:text-rose-300 break-all">
                    📄 Giao_trinh_Toan_Tap.pdf · 120 trang
                  </p>
                  <div className="space-y-2 opacity-60" aria-hidden="true">
                    <div className="h-2.5 w-full rounded bg-slate-300 dark:bg-slate-600" />
                    <div className="h-2.5 w-11/12 rounded bg-slate-300 dark:bg-slate-600" />
                    <div className="h-2.5 w-full rounded bg-slate-300 dark:bg-slate-600" />
                    <div className="h-2.5 w-4/5 rounded bg-slate-300 dark:bg-slate-600" />
                  </div>
                  <ul className="pt-2 flex flex-wrap gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <li className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1">❌ Chữ li ti khó nhớ</li>
                    <li className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1">❌ Tự soạn đề mất giờ</li>
                    <li className="rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1">❌ Học một mình dễ nản</li>
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-2 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-700 text-white shadow-xl shadow-teal-700/30 rotate-90 lg:rotate-0">
                    <ArrowRight className="h-8 w-8" strokeWidth={2.5} />
                  </div>
                  <span className="rounded-full bg-amber-300 text-slate-950 px-3 py-1 text-sm font-semibold">
                    Dưới 5 giây
                  </span>
                </div>
              </div>

              <div className={`lg:col-span-5 min-w-0 ${CARD} bg-teal-50 dark:bg-teal-950/30 p-6 sm:p-8 shadow-lg shadow-teal-700/5`}>
                <span className={`${BADGE} bg-teal-700 text-white`}>
                  <Sparkles className="h-4 w-4" />
                  Sau khi dùng Permind
                </span>
                <h3 className={`mt-4 text-2xl sm:text-3xl ${H3}`}>
                  1 sơ đồ + 10 câu hỏi ôn tập
                </h3>
                <p className={`mt-2 ${CARD_BODY}`}>
                  Toàn bộ 120 trang được cô đọng thành các nhánh tư duy gắn số trang và bộ câu hỏi trắc nghiệm sẵn sàng ôn luyện.
                </p>

                <div className={`mt-6 rounded-2xl ${INNER} bg-white dark:bg-slate-800 p-5 space-y-3.5`}>
                  <p className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-teal-900 dark:text-teal-200">
                    <Network className="h-4 w-4" />
                    Sơ đồ tư duy có trích dẫn trang
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
                    <div className="rounded-xl bg-teal-50 dark:bg-teal-950/70 p-2 text-teal-900 dark:text-teal-100">
                      Chương 1
                      <span className="block text-xs font-normal text-teal-900/80 dark:text-teal-200/90">Trang 1–35</span>
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/70 p-2 text-amber-900 dark:text-amber-100">
                      Chương 2
                      <span className="block text-xs font-normal text-amber-900/80 dark:text-amber-200/90">Trang 36–78</span>
                    </div>
                    <div className="rounded-xl bg-pink-50 dark:bg-pink-950/70 p-2 text-pink-900 dark:text-pink-100">
                      Chương 3
                      <span className="block text-xs font-normal text-pink-900/80 dark:text-pink-200/90">Trang 79–120</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 px-3.5 py-2.5 text-sm font-semibold text-violet-950 dark:text-violet-100">
                    <Trophy className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>+ 10 câu hỏi trắc nghiệm trọng tâm</span>
                  </div>
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
              <h2 className={H2}>
                Mọi công cụ ôn tập trong một không gian tươi mới
              </h2>
              <p className={`mt-3 ${SECTION_LEAD}`}>
                Thiết kế trực quan, chữ to rõ ràng, dùng mượt trên cả máy tính lẫn điện thoại.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className={`md:col-span-7 min-w-0 ${CARD} bg-teal-50/70 dark:bg-slate-900 p-6 sm:p-8 flex flex-col`}>
                <span className={`${BADGE} self-start bg-teal-700 text-white`}>
                  <BookOpen className="h-4 w-4" />
                  Tài liệu + AI
                </span>
                <h3 className={`mt-4 text-2xl sm:text-3xl ${H3}`}>
                  Tóm tắt, vẽ sơ đồ tư duy &amp; trả lời kèm số trang
                </h3>
                <p className={`mt-2 ${CARD_BODY}`}>
                  Tải lên PDF, PPTX hoặc DOCX rồi đặt câu hỏi về bài học — AI giải thích dễ hiểu và chỉ rõ kiến thức nằm ở trang nào trong giáo trình của bạn.
                </p>

                <div className={`mt-6 rounded-2xl ${INNER} bg-white dark:bg-slate-800 overflow-hidden`}>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-[#cfe5e2] dark:border-[#1f3a3d] text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Monitor className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
                    <span>Trích dẫn theo từng trang để bạn tự kiểm tra</span>
                  </div>
                  <img
                    src="/landing/notes-closeup.jpg" loading="lazy" decoding="async" width={640} height={160}
                    alt="Sinh viên ghi chép bên cạnh laptop đang mở sơ đồ tư duy"
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                      <HelpCircle className="mt-0.5 h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" />
                      <span>“Sự khác nhau giữa Học có giám sát và Không giám sát là gì?”</span>
                    </div>
                    <div className="rounded-xl bg-teal-50/90 dark:bg-teal-950/60 p-3.5 text-[15px] leading-[1.6] text-slate-700 dark:text-slate-200">
                      <p>
                        Học có giám sát dùng dữ liệu đã gán nhãn để dự đoán đầu ra, còn Học không giám sát tự tìm cấu trúc ẩn từ dữ liệu chưa gán nhãn.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-teal-700 text-white px-2.5 py-0.5 text-xs font-semibold">
                          📄 Xem trang 24
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-200 text-slate-900 px-2.5 py-0.5 text-xs font-semibold">
                          📄 Xem slide 31
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`md:col-span-5 min-w-0 ${CARD} bg-amber-50 dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between`}>
                <div>
                  <span className={`${BADGE} bg-amber-300 text-slate-950`}>
                    <Zap className="h-4 w-4 fill-slate-950" />
                    Nhanh &amp; luôn sẵn sàng
                  </span>
                  <h3 className={`mt-4 text-2xl sm:text-3xl ${H3}`}>
                    Xử lý dưới 5 giây. Hỗ trợ AI 24/7.
                  </h3>
                  <p className={`mt-2 ${CARD_BODY}`}>
                    Không phải chờ đợi lâu. Dù bạn ôn thi lúc trưa hay giữa đêm, trợ lý AI luôn sẵn sàng giải đáp.
                  </p>
                </div>

                <div className={`mt-6 rounded-2xl ${INNER} bg-white dark:bg-slate-800 p-5`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Thời gian xử lý tài liệu
                  </p>
                  <p className="mt-1 font-mono text-4xl sm:text-5xl font-bold text-teal-800 dark:text-teal-300">
                    &lt; 5 giây
                  </p>
                  <div className="mt-4 h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden" aria-hidden="true">
                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-teal-500 to-amber-400" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span>🤖 AI trực tuyến 24/7</span>
                    <span>📄 Trả lời kèm số trang</span>
                  </div>
                </div>
              </div>

              <div className={`md:col-span-6 min-w-0 relative isolate overflow-hidden ${CARD} bg-rose-50/70 dark:bg-slate-900 p-6 sm:p-8 flex flex-col`}>
                <span className={`${BADGE} self-start bg-rose-600 text-white`}>
                  <Trophy className="h-4 w-4" />
                  Kiểm tra trực tuyến
                </span>
                <h3 className={`mt-4 text-2xl sm:text-3xl ${H3}`}>
                  AI tạo đề trắc nghiệm, thi xếp hạng cùng bạn bè
                </h3>
                <p className={`mt-2 ${CARD_BODY}`}>
                  Từ tài liệu vừa tải, AI tạo câu hỏi trắc nghiệm có giải thích đáp án. Ôn trên điện thoại ở bất cứ đâu — bấm thử câu trả lời bên dưới!
                </p>
                <img
                  src="/landing/campus-mobile.jpg" loading="lazy" decoding="async" width={640} height={144}
                  alt="Hai sinh viên cùng xem điện thoại trên ghế đá khuôn viên trường"
                  className="mt-4 h-36 w-full rounded-2xl object-cover"
                />

                <div className="mt-5 w-full">
                  <div className={`relative z-0 mx-auto w-full max-w-[20rem] overflow-hidden rounded-[1.75rem] ${INNER} bg-white dark:bg-slate-800 p-4 shadow-sm`}>
                    <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />

                    <div className="flex items-center justify-between gap-2 text-xs font-semibold mb-2">
                      <span className="text-rose-700 dark:text-rose-300">CÂU 04 / 10</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2.5 py-0.5">
                        <Timer className="h-3.5 w-3.5" />
                        12 giây
                      </span>
                    </div>

                    <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">
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
                            className={`min-h-[44px] flex items-center rounded-xl border-[1.5px] p-2.5 text-left text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 ${
                              isChosen && isCorrect
                                ? "border-teal-600 bg-teal-50 dark:bg-teal-950/70 text-teal-900 dark:text-teal-100"
                                : isChosen && !isCorrect
                                ? "border-rose-500 bg-rose-50 dark:bg-rose-950/70 text-rose-900 dark:text-rose-100"
                                : "border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-teal-500"
                            }`}
                          >
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900 p-2.5 space-y-1.5 text-xs font-semibold">
                      <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                        <span>🥇 1. Minh Anh (Bạn)</span>
                        <span className="font-mono">3,950 đ</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span>🥈 2. Hải Đăng</span>
                        <span className="font-mono">3,620 đ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`md:col-span-6 min-w-0 ${CARD} bg-violet-50/70 dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between`}>
                <div>
                  <span className={`${BADGE} bg-violet-600 text-white`}>
                    <Presentation className="h-4 w-4" />
                    Phòng học nhóm
                  </span>
                  <h3 className={`mt-4 text-2xl sm:text-3xl ${H3}`}>
                    Đồng bộ slide, ghi chú &amp; highlight theo thời gian thực
                  </h3>
                  <p className={`mt-2 ${CARD_BODY}`}>
                    Chỉ cần gửi mã phòng 6 số. Khi một bạn chuyển trang hay gạch chân ý chính, cả nhóm đều thấy ngay lập tức.
                  </p>
                </div>

                <div className={`mt-6 rounded-2xl ${INNER} bg-white dark:bg-slate-800 p-5 space-y-4`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-900 dark:text-violet-100 px-3 py-1 text-xs font-semibold font-mono">
                      MÃ PHÒNG: 248411
                    </span>
                    <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                      ● Đang đồng bộ slide 12
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/50 p-3.5">
                      <p className="text-[15px] font-semibold text-amber-950 dark:text-amber-200">✨ Highlight chung</p>
                      <p className={`mt-1 ${CARD_BODY}`}>
                        Đánh dấu trực tiếp các định nghĩa quan trọng ngay trên slide.
                      </p>
                    </div>
                    <div className="rounded-xl bg-teal-50 dark:bg-teal-950/50 p-3.5">
                      <p className="text-[15px] font-semibold text-teal-950 dark:text-teal-200">📌 Ghi chú nhóm</p>
                      <p className={`mt-1 ${CARD_BODY}`}>
                        Dán ghi chú nhắc lịch thi và mẹo làm bài cho cả phòng.
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
              <h2 className={H2}>
                Bắt đầu học thông minh chỉ với 3 bước
              </h2>
              <p className={`mt-3 ${SECTION_LEAD}`}>
                Tải lên — Hỏi AI — Thi cùng bạn bè. Không cần cài đặt phức tạp.
              </p>
            </div>

            <ol className="grid gap-8 md:grid-cols-3">
              {studentSteps.map((step) => (
                <li
                  key={step.number}
                  className={`${CARD} ${step.cardBg} p-7 transition-transform duration-200 hover:-translate-y-1`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-extrabold ${step.numberBg}`}
                    aria-label={`Bước ${step.number}`}
                  >
                    {step.number}
                  </span>
                  <h3 className={`mt-5 text-2xl ${H3}`}>
                    {step.title}
                  </h3>
                  <p className={`mt-3 ${CARD_BODY}`}>
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ─── 6. LỜI NHẬN XÉT TỪ SINH VIÊN ──────────────────────────────────── */}
        <section
          id="nhan-xet"
          className="reveal-on-scroll is-visible py-20 bg-amber-50/40 dark:bg-slate-900/50 border-t border-slate-200/80 dark:border-slate-800 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className={H2}>
                Sinh viên nói gì về Permind?
              </h2>
              <p className={`mt-3 ${SECTION_LEAD}`}>
                Dành cho sinh viên — những chia sẻ sau các mùa chạy deadline và ôn thi cuối kỳ.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {studentTestimonials.map((item) => (
                <figure
                  key={item.name}
                  className={`${CARD} bg-white dark:bg-slate-900 p-7 shadow-sm flex flex-col justify-between`}
                >
                  <blockquote className="text-[15px] sm:text-base leading-[1.6] text-slate-800 dark:text-slate-100">
                    “{item.quote}”
                  </blockquote>

                  <figcaption className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                    <img
                      src={item.avatarSrc} loading="lazy" decoding="async" width={96} height={96}
                      alt={`Ảnh đại diện của ${item.name}`}
                      className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-[15px] leading-[1.6] text-slate-700 dark:text-slate-300">
                        {item.role}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 7. LỜI KÊU GỌI CUỐI TRANG (CTA) ──────────────────────────────── */}
        <section className="reveal-on-scroll py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-700 via-teal-700 to-teal-800 p-8 sm:p-14 text-white shadow-2xl shadow-teal-700/20">
              <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-amber-300/20 blur-2xl" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-2xl">
                  <h2 className="!text-white text-[2rem] sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                    Sẵn sàng ôn thi nhẹ nhàng hơn cùng hội bạn?
                  </h2>
                  <p className="mt-3 text-base sm:text-lg leading-[1.6] text-white/95">
                    Thử kéo thả cuốn giáo trình đầu tiên của bạn lên Permind hoàn toàn miễn phí.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-300 hover:bg-amber-200 text-slate-950 px-7 py-4 text-base sm:text-lg font-bold shadow-lg transition-colors cursor-pointer"
                  >
                    <span>Bắt đầu học ngay</span>
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={handleGuestLogin}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-[1.5px] border-white/80 bg-white/10 hover:bg-white/20 text-white px-7 py-3.5 text-base font-semibold transition-colors cursor-pointer"
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
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 lg:flex-row sm:px-8 lg:px-10">
          <div className="flex shrink-0 items-center justify-center gap-3">
            <Logo size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Nền tảng học tập AI cho sinh viên
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-semibold" aria-label="Điều hướng chân trang">
            <a href="#hoc-nhom" className="whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors">
              Phòng học nhóm
            </a>
            <a href="#truoc-sau" className="whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors">
              Trước &amp; Sau
            </a>
            <a href="#tinh-nang" className="whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors">
              Tính năng
            </a>
            <a href="#ba-buoc" className="whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-colors">
              3 bước bắt đầu
            </a>
          </nav>

          <p className="shrink-0 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            © 2026 Permind. Học thông minh hơn mỗi ngày.
          </p>
        </div>
      </footer>

      {/* ─── PHÒNG THỬ NGHIỆM MOTION (NỘI BỘ) ───────────────────────────────── */}
      {isMotionLabOpen && (
        <Suspense fallback={null}>
          <MotionShowcaseModal isOpen={isMotionLabOpen} onClose={() => setIsMotionLabOpen(false)} />
        </Suspense>
      )}

      {/* ─── MODAL HẾT PHIÊN ĐĂNG NHẬP ───────────────────────────────────────── */}
      <SessionExpiredModal
        open={sessionExpiredModalOpen}
        onConfirmRelogin={() => {
          setSessionExpiredModalOpen(false);
          setAuthMode("login");
          setIsLoginOpen(true);
          updateBrowserUrlForAuth(true, "login");
        }}
      />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({
  onLogout,
  onOpenSettings,
  userId,
  userName,
  userEmail,
  avatarUrl,
}: {
  onLogout: () => void;
  onOpenSettings?: () => void;
  userId?: string;
  userName?: string;
  userEmail?: string;
  avatarUrl?: string | null;
}) {
  const getTabFromHash = (hash: string): DashboardTab => {
    const h = hash.replace(/^#\/?/, "").toLowerCase();
    if (h === "classrooms" || h === "phong-hoc") return "classrooms";
    if (h === "tests" || h === "kiem-tra") return "tests";
    return "documents";
  };

  const [activeTab, setActiveTab] = useState<DashboardTab>(() => getTabFromHash(window.location.hash));
  const [visitedTabs, setVisitedTabs] = useState<Set<DashboardTab>>(
    () => new Set([getTabFromHash(window.location.hash)])
  );

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

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
        onOpenSettings={onOpenSettings}
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
      />

      {/* Mobile navigation fallback */}
      <div className="mb-2 overflow-x-auto md:hidden px-5 pt-3">
        <nav
          className="flex min-w-max gap-2 rounded-sm bg-white dark:bg-[#1b1b26] p-1.5 border border-[#e1edff] dark:border-[#2a2a3a]"
          aria-label="Điều hướng mobile"
        >
          {[
            { id: "documents" as const, label: "Tài liệu" },
            { id: "classrooms" as const, label: "Phòng học" },
            { id: "tests" as const, label: "Bài kiểm tra" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-normal transition cursor-pointer ${
                activeTab === item.id
                  ? "rounded-pill bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] shadow-[0_2px_0_0_#111118]"
                  : "rounded-[8px] text-[#111118]/70 dark:text-[#f0f6ff]/70 hover:text-[#111118] dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6">
        <Suspense
          fallback={
            <div className="py-16 flex items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
              Đang tải không gian học tập...
            </div>
          }
        >
          {visitedTabs.has("documents") && (
            <div style={{ display: activeTab === "documents" ? "block" : "none" }}>
              <LibraryPage userId={userId} userName={userName} />
            </div>
          )}
          {visitedTabs.has("classrooms") && (
            <div style={{ display: activeTab === "classrooms" ? "block" : "none" }}>
              <ClassroomsPage userId={userId} userName={userName} />
            </div>
          )}
          {visitedTabs.has("tests") && (
            <div style={{ display: activeTab === "tests" ? "block" : "none" }}>
              <TestsPage userId={userId} userName={userName} />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
