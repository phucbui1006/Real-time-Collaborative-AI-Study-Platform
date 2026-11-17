import React, { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Check,
  X,
  ArrowLeft,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Users,
  BookOpen,
  Trophy,
  KeyRound,
  UserCheck,
  LogOut,
  RefreshCw,
  FolderSync,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import {
  loginWithIdentifier,
  registerWithUsername,
  resendSignupConfirmation,
  signInWithGoogle,
  requestPasswordReset,
  updateUserPassword,
  checkUsernameAvailability,
  validateUsernameClient,
  evaluatePasswordStrength,
  suggestUsernameFromUser,
  completeUsernameSetup,
  updateDisplayName,
  getRememberMePreference,
  UserProfile,
  GuestDataSummary,
} from "../../services/authService";

export type AuthScreenMode =
  | "login"
  | "register"
  | "check-inbox"
  | "forgot-password"
  | "reset-password"
  | "choose-username";

interface AuthScreenProps {
  mode: AuthScreenMode;
  onModeChange: (mode: AuthScreenMode) => void;
  onBackToLanding?: () => void;
  onAuthSuccess: (user: User, profile?: UserProfile | null) => void;
  onGuestLogin: () => void;
  currentUser?: User | null;
  initialNotice?: string | null;
  initialError?: string | null;
  recoveryExpiredError?: string | null;
}

/**
 * Biểu tượng Google chuẩn SVG
 */
function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Màn hình xác thực chính:
 * - Desktop: Chia đôi màn hình (Trái: Form với 2 tab "Đăng nhập | Tạo tài khoản" không tải lại trang; Phải: Khu minh họa #0b7a75 về phòng học nhóm)
 * - Mobile: Ẩn khu minh họa, form toàn màn hình.
 */
export const AuthSplitScreen: React.FC<AuthScreenProps> = ({
  mode,
  onModeChange,
  onBackToLanding,
  onAuthSuccess,
  onGuestLogin,
  currentUser,
  initialNotice,
  initialError,
  recoveryExpiredError,
}) => {
  // ── Trạng thái dùng chung ──
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(initialError || null);
  const [generalNotice, setGeneralNotice] = useState<string | null>(initialNotice || null);

  // ── Trạng thái Đăng nhập (Mục 2.2) ──
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => getRememberMePreference());
  const [loginFieldErrors, setLoginFieldErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});

  // ── Trạng thái Đăng ký (Mục 2.1) ──
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAcceptedTerms, setRegAcceptedTerms] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regFieldErrors, setRegFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  // Kiểm tra trùng tên người dùng debounce ~400ms
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameStatusMsg, setUsernameStatusMsg] = useState<string | null>(null);

  // ── Trạng thái Kiểm tra hộp thư (Mục 2.1) ──
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(60);
  const [resendingEmail, setResendingEmail] = useState(false);

  // ── Trạng thái Quên mật khẩu & Đặt lại mật khẩu (Mục 2.4) ──
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotSubmittedMsg, setForgotSubmittedMsg] = useState<string | null>(null);
  const [forgotIsGoogleOnly, setForgotIsGoogleOnly] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // ── Trạng thái Chọn tên người dùng sau Google OAuth lần đầu (Mục 2.3) ──
  const [oauthUsername, setOauthUsername] = useState(() => suggestUsernameFromUser(currentUser || null));
  const [oauthDisplayName, setOauthDisplayName] = useState<string>(
    () =>
      currentUser?.user_metadata?.full_name ||
      currentUser?.user_metadata?.name ||
      currentUser?.email?.split("@")[0] ||
      ""
  );
  const [oauthChecking, setOauthChecking] = useState(false);
  const [oauthAvailable, setOauthAvailable] = useState<boolean | null>(null);
  const [oauthStatusMsg, setOauthStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) setGeneralError(initialError);
  }, [initialError]);

  useEffect(() => {
    if (initialNotice) setGeneralNotice(initialNotice);
  }, [initialNotice]);

  useEffect(() => {
    if (mode === "choose-username" && currentUser) {
      setOauthUsername((prev) => prev || suggestUsernameFromUser(currentUser));
      setOauthDisplayName(
        (prev) =>
          prev ||
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          currentUser.email?.split("@")[0] ||
          ""
      );
    }
  }, [mode, currentUser]);

  // Đếm ngược 60s cho nút Gửi lại email xác nhận
  useEffect(() => {
    if (mode !== "check-inbox" || resendCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mode, resendCountdown]);

  // Debounce ~400ms kiểm tra trùng username ở form Đăng ký
  useEffect(() => {
    if (mode !== "register") return;
    const raw = regUsername.trim();
    if (!raw) {
      setUsernameChecking(false);
      setUsernameAvailable(null);
      setUsernameStatusMsg(null);
      return;
    }

    const clientCheck = validateUsernameClient(raw);
    if (!clientCheck.valid) {
      setUsernameChecking(false);
      setUsernameAvailable(false);
      setUsernameStatusMsg(clientCheck.error || "Tên người dùng không hợp lệ.");
      return;
    }

    setUsernameChecking(true);
    setUsernameStatusMsg(null);
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      const res = await checkUsernameAvailability(clientCheck.clean);
      if (cancelled) return;
      setUsernameChecking(false);
      setUsernameAvailable(res.available);
      setUsernameStatusMsg(res.message);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [regUsername, mode]);

  // Debounce ~400ms kiểm tra trùng username ở màn hình Chọn tên người dùng (sau Google OAuth)
  useEffect(() => {
    if (mode !== "choose-username") return;
    const raw = oauthUsername.trim();
    if (!raw) {
      setOauthChecking(false);
      setOauthAvailable(null);
      setOauthStatusMsg(null);
      return;
    }

    const clientCheck = validateUsernameClient(raw);
    if (!clientCheck.valid) {
      setOauthChecking(false);
      setOauthAvailable(false);
      setOauthStatusMsg(clientCheck.error || "Tên người dùng không hợp lệ.");
      return;
    }

    setOauthChecking(true);
    setOauthStatusMsg(null);
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      const res = await checkUsernameAvailability(clientCheck.clean, currentUser?.id);
      if (cancelled) return;
      setOauthChecking(false);
      setOauthAvailable(res.available);
      setOauthStatusMsg(res.message);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [oauthUsername, mode, currentUser?.id]);

  const switchMode = (nextMode: AuthScreenMode) => {
    setGeneralError(null);
    setGeneralNotice(null);
    setLoginFieldErrors({});
    setRegFieldErrors({});
    setForgotSubmittedMsg(null);
    setForgotIsGoogleOnly(false);
    onModeChange(nextMode);
  };

  // ── Xử lý Đăng nhập ──
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setGeneralError(null);
    setGeneralNotice(null);

    const errors: { identifier?: string; password?: string } = {};
    if (!loginIdentifier.trim()) {
      errors.identifier = "Vui lòng nhập tên người dùng hoặc email.";
    }
    if (!loginPassword) {
      errors.password = "Vui lòng nhập mật khẩu.";
    }
    if (Object.keys(errors).length > 0) {
      setLoginFieldErrors(errors);
      return;
    }
    setLoginFieldErrors({});
    setLoading(true);

    try {
      const user = await loginWithIdentifier(loginIdentifier, loginPassword, rememberMe);
      onAuthSuccess(user);
    } catch (err: any) {
      setGeneralError(err?.message || "Tên đăng nhập hoặc mật khẩu không đúng");
    } finally {
      setLoading(false);
    }
  };

  // ── Xử lý Đăng ký ──
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setGeneralError(null);
    setGeneralNotice(null);

    const errors: {
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    const uCheck = validateUsernameClient(regUsername);
    if (!uCheck.valid) {
      errors.username = uCheck.error;
    } else if (usernameAvailable === false) {
      errors.username = usernameStatusMsg || "Tên này đã có người dùng";
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
    }

    const pwStrength = evaluatePasswordStrength(regPassword);
    if (!pwStrength.isValidLength) {
      errors.password = "Mật khẩu phải có tối thiểu 6 ký tự.";
    } else if (pwStrength.isCommon) {
      errors.password = "Mật khẩu này quá phổ biến (ví dụ: 123456, password). Vui lòng chọn mật khẩu khác.";
    }

    if (regConfirmPassword !== regPassword) {
      errors.confirmPassword = "Mật khẩu nhập lại không khớp.";
    }

    if (!regAcceptedTerms) {
      errors.terms = "Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật.";
    }

    if (Object.keys(errors).length > 0) {
      setRegFieldErrors(errors);
      return;
    }

    setRegFieldErrors({});
    setLoading(true);

    try {
      const res = await registerWithUsername({
        username: uCheck.clean,
        email: cleanEmail,
        password: regPassword,
        displayName: uCheck.clean,
      });

      if (res.needsEmailConfirmation) {
        setPendingConfirmEmail(cleanEmail);
        setResendCountdown(60);
        onModeChange("check-inbox");
      } else if (res.user) {
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setGeneralError(err?.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ── Xử lý Gửi lại email xác nhận ──
  const handleResendEmail = async () => {
    if (!pendingConfirmEmail || resendCountdown > 0 || resendingEmail) return;
    setResendingEmail(true);
    setGeneralError(null);
    setGeneralNotice(null);
    try {
      await resendSignupConfirmation(pendingConfirmEmail);
      setResendCountdown(60);
      setGeneralNotice("Đã gửi lại email xác nhận. Vui lòng kiểm tra cả mục Thư rác (Spam).");
    } catch (err: any) {
      setGeneralError(err?.message || "Không thể gửi lại email lúc này.");
    } finally {
      setResendingEmail(false);
    }
  };

  // ── Xử lý Tiếp tục với Google ──
  const handleGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    setGeneralError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setGoogleLoading(false);
      setGeneralError(err?.message || "Không thể kết nối với Google. Vui lòng thử lại.");
    }
  };

  // ── Xử lý Quên mật khẩu ──
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setGeneralError(null);
    setForgotSubmittedMsg(null);
    setForgotIsGoogleOnly(false);

    if (!forgotIdentifier.trim()) {
      setGeneralError("Vui lòng nhập email hoặc tên người dùng của bạn.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(forgotIdentifier);
      setForgotSubmittedMsg(res.message);
      setForgotIsGoogleOnly(Boolean(res.isGoogleOnly));
    } catch (err: any) {
      setGeneralError(err?.message || "Không thể xử lý yêu cầu lúc này.");
    } finally {
      setLoading(false);
    }
  };

  // ── Xử lý Đặt lại mật khẩu (/reset-password) ──
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setGeneralError(null);

    const pwStrength = evaluatePasswordStrength(newPassword);
    if (!pwStrength.isValidLength) {
      setGeneralError("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }
    if (pwStrength.isCommon) {
      setGeneralError("Mật khẩu này quá phổ biến (ví dụ: 123456, password). Vui lòng chọn mật khẩu khác.");
      return;
    }
    if (confirmNewPassword !== newPassword) {
      setGeneralError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setLoading(true);
    try {
      await updateUserPassword(newPassword);
      setResetDone(true);
    } catch (err: any) {
      setGeneralError(err?.message || "Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  // ── Xử lý Chọn tên người dùng sau Google OAuth ──
  const handleCompleteOAuthUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || loading) return;
    setGeneralError(null);

    const uCheck = validateUsernameClient(oauthUsername);
    if (!uCheck.valid) {
      setGeneralError(uCheck.error || "Tên người dùng không hợp lệ.");
      return;
    }
    if (oauthAvailable === false) {
      setGeneralError(oauthStatusMsg || "Tên này đã có người dùng");
      return;
    }

    setLoading(true);
    try {
      const avatarUrl =
        currentUser.user_metadata?.avatar_url ||
        currentUser.user_metadata?.picture ||
        null;
      const profile = await completeUsernameSetup({
        userId: currentUser.id,
        username: uCheck.clean,
        displayName: oauthDisplayName.trim() || uCheck.clean,
        avatarUrl,
      });
      onAuthSuccess(currentUser, profile);
    } catch (err: any) {
      setGeneralError(err?.message || "Không thể lưu tên người dùng.");
    } finally {
      setLoading(false);
    }
  };

  const regPwStrength = evaluatePasswordStrength(regPassword);
  const resetPwStrength = evaluatePasswordStrength(newPassword);

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#FFFDF9] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* ─── CỘT TRÁI: FORM XÁC THỰC (TOÀN MÀN HÌNH TRÊN MOBILE, 6 CỘT TRÊN DESKTOP) ─── */}
      <div className="lg:col-span-6 flex flex-col justify-between px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        {/* Top bar: Logo + Nút quay lại + ThemeToggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="md" onClick={onBackToLanding} />
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {onBackToLanding && mode !== "choose-username" && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 min-h-[44px] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7a75] focus-visible:ring-offset-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Trang chủ</span>
              </button>
            )}
          </div>
        </div>

        {/* Thân form ở giữa */}
        <div className="my-auto py-8 w-full max-w-md mx-auto">
          {/* 1. HAI TAB CHUYỂN ĐỔI "ĐĂNG NHẬP | TẠO TÀI KHOẢN" (KHÔNG TẢI LẠI TRANG) */}
          {(mode === "login" || mode === "register") && (
            <>
              <div
                role="tablist"
                aria-label="Chuyển đổi Đăng nhập và Tạo tài khoản"
                className="grid grid-cols-2 rounded-2xl bg-slate-100 dark:bg-slate-800/90 p-1.5 border border-slate-200/80 dark:border-slate-700 mb-6"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  onClick={() => switchMode("login")}
                  className={`py-2.5 min-h-[44px] flex items-center justify-center text-sm font-bold rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7a75] focus-visible:ring-offset-2 ${
                    mode === "login"
                      ? "bg-[#0b7a75] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  onClick={() => switchMode("register")}
                  className={`py-2.5 min-h-[44px] flex items-center justify-center text-sm font-bold rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7a75] focus-visible:ring-offset-2 ${
                    mode === "register"
                      ? "bg-[#0b7a75] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Tạo tài khoản
                </button>
              </div>

              {generalNotice && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 p-3.5 text-sm text-teal-900 dark:text-teal-200"
                >
                  <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{generalNotice}</span>
                </div>
              )}

              {generalError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 text-sm text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{generalError}</span>
                </div>
              )}
            </>
          )}

          {/* ─── TAB 1: ĐĂNG NHẬP (MỤC 2.2) ─── */}
          {mode === "login" && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Chào mừng bạn trở lại! 👋
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Đăng nhập bằng tên người dùng hoặc email để vào không gian học tập.
              </p>

              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Tên người dùng hoặc email
                  </label>
                  <input
                    id="login-identifier"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    disabled={loading || googleLoading}
                    placeholder="vd: minh_anh2026 hoặc ban@student.edu.vn"
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      if (loginFieldErrors.identifier) {
                        setLoginFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                      }
                    }}
                    className={`form-input ${
                      loginFieldErrors.identifier ? "!border-rose-500 focus:!outline-rose-500" : ""
                    }`}
                  />
                  {loginFieldErrors.identifier && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {loginFieldErrors.identifier}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                    >
                      Mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot-password")}
                      className="text-xs font-bold text-[#0b7a75] dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={loading || googleLoading}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (loginFieldErrors.password) {
                          setLoginFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      className={`form-input !pr-11 ${
                        loginFieldErrors.password ? "!border-rose-500 focus:!outline-rose-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginFieldErrors.password && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {loginFieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Ô Ghi nhớ đăng nhập */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0b7a75] focus:ring-[#0b7a75]"
                    />
                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="primary-button w-full h-12 justify-center font-bold cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang đăng nhập...</span>
                    </>
                  ) : (
                    <span>Đăng nhập</span>
                  )}
                </button>
              </form>

              {/* Nút Tiếp tục với Google & Chế độ khách */}
              <div className="mt-5 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  <span className="bg-[#FFFDF9] dark:bg-[#0B1120] px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Hoặc
                  </span>
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7a75] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  <span>Tiếp tục với Google</span>
                </button>

                <button
                  type="button"
                  onClick={onGuestLogin}
                  disabled={loading || googleLoading}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-teal-600/60 dark:border-teal-400/50 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-sm font-semibold text-[#0b7a75] dark:text-teal-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7a75] focus-visible:ring-offset-2"
                >
                  <span>Dùng thử không cần tài khoản</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 2: TẠO TÀI KHOẢN (MỤC 2.1) ─── */}
          {mode === "register" && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Tạo tài khoản PeerMind ✨
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Chọn tên người dùng duy nhất để học nhóm, chia sẻ tài liệu và thi đấu.
              </p>

              <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4" noValidate>
                {/* Trường 1: Tên người dùng */}
                <div>
                  <label
                    htmlFor="register-username"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Tên người dùng <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      maxLength={20}
                      disabled={loading || googleLoading}
                      placeholder="vd: minh_anh_2026"
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value.toLowerCase());
                        if (regFieldErrors.username) {
                          setRegFieldErrors((prev) => ({ ...prev, username: undefined }));
                        }
                      }}
                      className={`form-input !pr-10 font-mono ${
                        regFieldErrors.username || usernameAvailable === false
                          ? "!border-rose-500 focus:!outline-rose-500"
                          : usernameAvailable === true
                          ? "!border-emerald-500"
                          : ""
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {usernameChecking && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      {!usernameChecking && usernameAvailable === true && (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {!usernameChecking && usernameAvailable === false && (
                        <X className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    {regFieldErrors.username ? (
                      <span className="font-medium text-rose-600 dark:text-rose-400">
                        {regFieldErrors.username}
                      </span>
                    ) : usernameStatusMsg ? (
                      <span
                        className={`font-medium ${
                          usernameAvailable
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {usernameStatusMsg}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        3–20 ký tự: chữ thường a-z, số 0-9, dấu gạch dưới (_)
                      </span>
                    )}
                  </div>
                </div>

                {/* Trường 2: Email */}
                <div>
                  <label
                    htmlFor="register-email"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading || googleLoading}
                    placeholder="ban@student.edu.vn"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regFieldErrors.email) {
                        setRegFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    className={`form-input ${
                      regFieldErrors.email ? "!border-rose-500 focus:!outline-rose-500" : ""
                    }`}
                  />
                  {regFieldErrors.email && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {regFieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Trường 3: Mật khẩu + Thanh đo độ mạnh */}
                <div>
                  <label
                    htmlFor="register-password"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Mật khẩu (tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      name="new-password"
                      type={showRegPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      disabled={loading || googleLoading}
                      placeholder="Tối thiểu 6 ký tự"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regFieldErrors.password) {
                          setRegFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      className={`form-input !pr-11 ${
                        regFieldErrors.password ? "!border-rose-500 focus:!outline-rose-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((v) => !v)}
                      aria-label={showRegPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Thanh đo độ mạnh mật khẩu */}
                  {regPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`rounded-full transition-colors ${
                              regPwStrength.score >= bar
                                ? regPwStrength.colorClass
                                : "bg-slate-200 dark:bg-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      <p
                        className={`text-xs font-medium ${
                          regPwStrength.isCommon || !regPwStrength.isValidLength
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        Độ mạnh: {regPwStrength.label}
                      </p>
                    </div>
                  )}

                  {regFieldErrors.password && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {regFieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Trường 4: Nhập lại mật khẩu */}
                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Nhập lại mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      name="confirm-password"
                      type={showRegConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={loading || googleLoading}
                      placeholder="Nhập lại mật khẩu phía trên"
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        if (regFieldErrors.confirmPassword) {
                          setRegFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      className={`form-input !pr-11 ${
                        regFieldErrors.confirmPassword ? "!border-rose-500 focus:!outline-rose-500" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword((v) => !v)}
                      aria-label={showRegConfirmPassword ? "Ẩn mật khẩu nhập lại" : "Hiện mật khẩu nhập lại"}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regFieldErrors.confirmPassword && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {regFieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Trường 5: Ô đồng ý điều khoản */}
                <div>
                  <label className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={regAcceptedTerms}
                      onChange={(e) => {
                        setRegAcceptedTerms(e.target.checked);
                        if (regFieldErrors.terms) {
                          setRegFieldErrors((prev) => ({ ...prev, terms: undefined }));
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#0b7a75] focus:ring-[#0b7a75]"
                    />
                    <span>
                      Tôi đồng ý với{" "}
                      <span className="font-semibold text-[#0b7a75] dark:text-teal-400">
                        Điều khoản sử dụng
                      </span>{" "}
                      và{" "}
                      <span className="font-semibold text-[#0b7a75] dark:text-teal-400">
                        Chính sách bảo mật
                      </span>{" "}
                      của PeerMind.
                    </span>
                  </label>
                  {regFieldErrors.terms && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                      {regFieldErrors.terms}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading || usernameChecking}
                  className="primary-button w-full h-12 justify-center font-bold cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <span>Tạo tài khoản</span>
                  )}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  <span className="bg-[#FFFDF9] dark:bg-[#0B1120] px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Hoặc
                  </span>
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b7a75] focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  <span>Tiếp tục với Google</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── MÀN HÌNH 3: KIỂM TRA HỘP THƯ SAU ĐĂNG KÝ (MỤC 2.1) ─── */}
          {mode === "check-inbox" && (
            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-950 text-[#0b7a75] dark:text-teal-300">
                <Mail className="h-8 w-8" />
              </div>

              <h1 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">
                Kiểm tra hộp thư của bạn 📬
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Chúng tôi đã gửi liên kết kích hoạt tài khoản tới{" "}
                <strong className="font-bold text-slate-900 dark:text-white">
                  {pendingConfirmEmail || regEmail || "email của bạn"}
                </strong>
                . Vui lòng nhấp vào liên kết trong thư để hoàn tất đăng ký.
              </p>

              {generalNotice && (
                <div className="mt-4 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 p-3 text-xs font-medium text-teal-800 dark:text-teal-200">
                  {generalNotice}
                </div>
              )}

              {generalError && (
                <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {generalError}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendCountdown > 0 || resendingEmail}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 hover:border-teal-600 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${resendingEmail ? "animate-spin" : ""}`} />
                  {resendCountdown > 0 ? (
                    <span>Gửi lại email xác nhận ({resendCountdown}s)</span>
                  ) : (
                    <span>Gửi lại email xác nhận</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="primary-button w-full h-11 justify-center font-bold cursor-pointer"
                >
                  Quay lại Đăng nhập
                </button>
              </div>
            </div>
          )}

          {/* ─── MÀN HÌNH 4: QUÊN MẬT KHẨU (MỤC 2.4) ─── */}
          {mode === "forgot-password" && (
            <div>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-[#0b7a75] dark:hover:text-teal-400 mb-4 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại đăng nhập</span>
              </button>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Quên mật khẩu? 🔑
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Nhập email hoặc tên người dùng của bạn. Hệ thống sẽ tự động gửi hướng dẫn đặt lại mật khẩu.
              </p>

              {generalError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 text-sm text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{generalError}</span>
                </div>
              )}

              {forgotSubmittedMsg ? (
                <div className="mt-6 rounded-2xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#0b7a75] dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {forgotIsGoogleOnly ? "Tài khoản liên kết Google" : "Đã ghi nhận yêu cầu"}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {forgotSubmittedMsg}
                      </p>
                    </div>
                  </div>

                  {forgotIsGoogleOnly ? (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <GoogleIcon />
                      <span>Tiếp tục với Google</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="primary-button w-full h-11 justify-center font-bold cursor-pointer"
                    >
                      Quay về màn hình Đăng nhập
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="forgot-identifier"
                      className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Email hoặc Tên người dùng
                    </label>
                    <input
                      id="forgot-identifier"
                      type="text"
                      autoComplete="username"
                      required
                      disabled={loading}
                      placeholder="ban@student.edu.vn hoặc minh_anh2026"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="primary-button w-full h-12 justify-center font-bold cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang kiểm tra &amp; gửi...</span>
                      </>
                    ) : (
                      <span>Gửi hướng dẫn đặt lại mật khẩu</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ─── MÀN HÌNH 5: ĐẶT LẠI MẬT KHẨU (/reset-password - MỤC 2.4) ─── */}
          {mode === "reset-password" && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Đặt lại mật khẩu mới 🔒
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Nhập mật khẩu mới cho tài khoản PeerMind của bạn (tối thiểu 6 ký tự).
              </p>

              {recoveryExpiredError ? (
                <div className="mt-6 rounded-2xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
                        Liên kết không hợp lệ hoặc đã hết hạn
                      </h2>
                      <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">
                        {recoveryExpiredError}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot-password")}
                    className="primary-button w-full h-11 justify-center font-bold cursor-pointer"
                  >
                    Yêu cầu gửi lại liên kết mới
                  </button>
                </div>
              ) : resetDone ? (
                <div className="mt-6 rounded-2xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#0b7a75] dark:text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Đổi mật khẩu thành công!
                      </h2>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                        Mật khẩu mới của bạn đã được cập nhật. Bây giờ bạn có thể đăng nhập vào hệ thống.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="primary-button w-full h-11 justify-center font-bold cursor-pointer"
                  >
                    Đăng nhập ngay
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="mt-6 space-y-4">
                  {generalError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 text-sm text-rose-700 dark:text-rose-300"
                    >
                      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{generalError}</span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="reset-new-password"
                      className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Mật khẩu mới (tối thiểu 6 ký tự)
                    </label>
                    <div className="relative">
                      <input
                        id="reset-new-password"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={6}
                        disabled={loading}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="form-input !pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPassword.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="grid grid-cols-4 gap-1.5 h-1.5">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={`rounded-full ${
                                resetPwStrength.score >= bar
                                  ? resetPwStrength.colorClass
                                  : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Độ mạnh: {resetPwStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="reset-confirm-password"
                      className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Nhập lại mật khẩu mới
                    </label>
                    <input
                      id="reset-confirm-password"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={loading}
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="primary-button w-full h-12 justify-center font-bold cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Đang lưu mật khẩu...</span>
                      </>
                    ) : (
                      <span>Xác nhận đặt lại mật khẩu</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ─── MÀN HÌNH 6: CHỌN TÊN NGƯỜI DÙNG SAU KHI ĐĂNG NHẬP GOOGLE LẦN ĐẦU (MỤC 2.3) ─── */}
          {mode === "choose-username" && (
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 dark:bg-teal-950/80 px-3.5 py-1 text-xs font-bold text-[#0b7a75] dark:text-teal-300 mb-4">
                <UserCheck className="h-4 w-4" />
                <span>Hoàn tất hồ sơ Google của bạn</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Chọn tên người dùng 🎯
              </h1>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Đây là lần đầu bạn đăng nhập bằng Google. Hãy chọn một tên người dùng duy nhất để bạn bè dễ nhận ra trong phòng học.
              </p>

              {/* Hiển thị avatar Google và email */}
              {currentUser && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                  {currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture ? (
                    <img
                      src={currentUser.user_metadata.avatar_url || currentUser.user_metadata.picture}
                      alt="Ảnh đại diện Google"
                      className="h-11 w-11 rounded-full object-cover border border-teal-600"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-[#0b7a75] text-white flex items-center justify-center font-bold">
                      {(oauthDisplayName || "SV").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.user_metadata?.full_name || currentUser.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
              )}

              {generalError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 text-sm text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{generalError}</span>
                </div>
              )}

              <form onSubmit={handleCompleteOAuthUsername} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="oauth-username"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Tên người dùng (username) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="oauth-username"
                      type="text"
                      autoComplete="username"
                      required
                      maxLength={20}
                      disabled={loading}
                      value={oauthUsername}
                      onChange={(e) => setOauthUsername(e.target.value.toLowerCase())}
                      className={`form-input !pr-10 font-mono ${
                        oauthAvailable === false
                          ? "!border-rose-500"
                          : oauthAvailable === true
                          ? "!border-emerald-500"
                          : ""
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {oauthChecking && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      {!oauthChecking && oauthAvailable === true && (
                        <Check className="h-4 w-4 text-emerald-600" />
                      )}
                      {!oauthChecking && oauthAvailable === false && (
                        <X className="h-4 w-4 text-rose-600" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      oauthAvailable === false
                        ? "text-rose-600 dark:text-rose-400"
                        : oauthAvailable === true
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-500"
                    }`}
                  >
                    {oauthStatusMsg || "3–20 ký tự: chữ thường a-z, số 0-9, dấu gạch dưới (_)"}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="oauth-displayname"
                    className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Tên hiển thị trong phòng học
                  </label>
                  <input
                    id="oauth-displayname"
                    type="text"
                    maxLength={60}
                    disabled={loading}
                    placeholder="Nguyễn Minh Anh"
                    value={oauthDisplayName}
                    onChange={(e) => setOauthDisplayName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || oauthChecking || oauthAvailable === false}
                  className="primary-button w-full h-12 justify-center font-bold cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang hoàn tất...</span>
                    </>
                  ) : (
                    <span>Vào ứng dụng PeerMind →</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer nhỏ dưới cột trái */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          © 2026 PeerMind (permind.io.vn) · Nền tảng học nhóm AI cho sinh viên
        </div>
      </div>

      {/* ─── CỘT PHẢI: KHU MINH HỌA TEAL (#0b7a75) VỀ PHÒNG HỌC NHÓM (ẨN TRÊN MOBILE) ─── */}
      <div className="hidden lg:flex lg:col-span-6 relative overflow-hidden bg-[#0b7a75] text-white p-12 xl:p-16 flex-col justify-between">
        {/* Họa tiết trang trí mềm mại */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-amber-300/15 blur-3xl" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-xs border border-white/25 px-4 py-1.5 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Không gian học nhóm thời gian thực</span>
          </span>

          <h2 className="mt-6 text-3xl xl:text-4xl font-extrabold leading-tight !text-white">
            Học nhóm hiệu quả hơn với Slide đồng bộ &amp; Trợ lý AI trích dẫn từng trang.
          </h2>
          <p className="mt-3 text-base text-teal-50/90 leading-relaxed max-w-xl">
            Tải giáo trình PDF, DOCX hay PPTX — cả nhóm cùng lật slide, ghi chú trực tiếp và thi đấu bảng xếp hạng trắc nghiệm chỉ với mã phòng 6 số.
          </p>
        </div>

        {/* Thẻ mô phỏng trực quan Phòng học nhóm PeerMind */}
        <div className="relative z-10 my-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/25 p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold">Phòng #248411 · Ôn tập Kinh tế Vĩ mô</span>
            </div>
            <span className="rounded-full bg-amber-300 text-slate-950 px-3 py-0.5 text-xs font-extrabold">
              6 thành viên online
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-3.5 border border-white/15">
              <BookOpen className="h-5 w-5 text-amber-300 mb-2" />
              <p className="text-xs font-bold">Đọc &amp; Tóm tắt</p>
              <p className="text-[11px] text-teal-100 mt-0.5">AI chỉ rõ kiến thức nằm ở trang mấy</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3.5 border border-white/15">
              <Users className="h-5 w-5 text-sky-300 mb-2" />
              <p className="text-xs font-bold">Đồng bộ Slide</p>
              <p className="text-[11px] text-teal-100 mt-0.5">Highlight &amp; thảo luận trực tiếp</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3.5 border border-white/15">
              <Trophy className="h-5 w-5 text-rose-300 mb-2" />
              <p className="text-xs font-bold">Đấu Quiz AI</p>
              <p className="text-[11px] text-teal-100 mt-0.5">Bảng xếp hạng thời gian thực</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-teal-100">
            <div className="flex -space-x-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-slate-950 font-bold ring-2 ring-[#0b7a75]">
                MA
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-300 text-slate-950 font-bold ring-2 ring-[#0b7a75]">
                HĐ
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-300 text-slate-950 font-bold ring-2 ring-[#0b7a75]">
                TV
              </span>
            </div>
            <span>“Học nhóm từ xa mà vui như ngồi chung bàn thư viện!”</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-teal-100/90">
          <span>🔒 Bảo mật với Supabase RLS &amp; Xác thực 2 lớp</span>
          <span>⚡ Tốc độ xử lý tài liệu &lt; 5 giây</span>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL 1: THÔNG BÁO HẾT PHIÊN ĐĂNG NHẬP (MỤC 2.2) ──────────────────────

export const SessionExpiredModal: React.FC<{
  open: boolean;
  onConfirmRelogin: () => void;
}> = ({ open, onConfirmRelogin }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 id="session-expired-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
              Phiên đăng nhập đã hết
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bảo mật tài khoản PeerMind
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Phiên đăng nhập đã hết, vui lòng đăng nhập lại. Trang bạn đang xem đã được lưu lại để mở tiếp ngay sau khi đăng nhập.
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={onConfirmRelogin}
            className="primary-button w-full h-11 justify-center font-bold cursor-pointer"
          >
            Đăng nhập lại ngay
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL 2: HỎI ĐỒNG BỘ DỮ LIỆU CHẾ ĐỘ KHÁCH -> TÀI KHOẢN (MỤC 2.6) ──────

export const GuestMigrationModal: React.FC<{
  open: boolean;
  summary: GuestDataSummary | null;
  loading: boolean;
  error: string | null;
  onConfirmSync: () => void;
  onSkipSync: () => void;
}> = ({ open, summary, loading, error, onConfirmSync, onSkipSync }) => {
  if (!open || !summary?.hasGuestData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-sync-title"
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-950 text-[#0b7a75] dark:text-teal-300">
            <FolderSync className="h-6 w-6" />
          </div>
          <div>
            <h2 id="guest-sync-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
              Đồng bộ dữ liệu dùng thử?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tìm thấy dữ liệu từ chế độ khách trên trình duyệt này
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Chuyển tài liệu và lịch sử chat đã có sang tài khoản?
        </p>

        <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-3.5 text-xs space-y-1 text-slate-700 dark:text-slate-300">
          {summary.docsCount > 0 && (
            <p>📄 <strong>{summary.docsCount}</strong> tài liệu đã tải lên ở chế độ khách</p>
          )}
          {summary.chatMessagesCount > 0 && (
            <p>💬 <strong>{summary.chatMessagesCount}</strong> lượt hỏi đáp với Trợ lý AI</p>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onSkipSync}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
          >
            Để sau / Bỏ qua
          </button>
          <button
            type="button"
            onClick={onConfirmSync}
            disabled={loading}
            className="flex-1 primary-button h-11 justify-center font-bold text-sm cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang đồng bộ...</span>
              </>
            ) : (
              <span>Đồng bộ ngay</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL 3: CÀI ĐẶT TÀI KHOẢN CÁ NHÂN (MỤC 2.5) ──────────────────────────

export const ProfileSettingsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  userId?: string;
  username?: string | null;
  displayName?: string | null;
  userEmail?: string | null;
  avatarUrl?: string | null;
  onProfileUpdated: (newDisplayName: string) => void;
  onLogout: () => void;
}> = ({
  open,
  onClose,
  userId,
  username,
  displayName,
  userEmail,
  avatarUrl,
  onProfileUpdated,
  onLogout,
}) => {
  const [nameInput, setNameInput] = useState(displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setNameInput(displayName || username || "");
      setNameMsg(null);
      setNewPass("");
      setConfirmPass("");
      setPassMsg(null);
    }
  }, [open, displayName, username]);

  if (!open) return null;

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || savingName) return;
    setNameMsg(null);
    setSavingName(true);
    try {
      const updated = await updateDisplayName(userId, nameInput);
      onProfileUpdated(updated.display_name || nameInput.trim());
      setNameMsg({ type: "ok", text: "Đã cập nhật tên hiển thị thành công." });
    } catch (err: any) {
      setNameMsg({ type: "err", text: err?.message || "Không thể đổi tên hiển thị." });
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPass) return;
    setPassMsg(null);

    if (newPass !== confirmPass) {
      setPassMsg({ type: "err", text: "Mật khẩu nhập lại không khớp." });
      return;
    }

    setSavingPass(true);
    try {
      await updateUserPassword(newPass);
      setNewPass("");
      setConfirmPass("");
      setPassMsg({ type: "ok", text: "Đã đổi mật khẩu thành công." });
    } catch (err: any) {
      setPassMsg({ type: "err", text: err?.message || "Không thể đổi mật khẩu." });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-settings-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border-2 border-[#111118] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-6 sm:p-7 shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cài đặt"
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="profile-settings-title" className="text-xl font-extrabold text-[#111118] dark:text-[#f0f6ff]">
          Cài đặt tài khoản ⚙️
        </h2>

        {/* Thông tin tóm tắt */}
        <div className="mt-4 flex items-center gap-3.5 rounded-xl bg-[#f0f6ff] dark:bg-[#242436] p-3.5 border border-[#e1edff] dark:border-[#2a2a3a]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Ảnh đại diện"
              className="h-12 w-12 rounded-full object-cover border border-[#111118]"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#91d8ec] text-sm font-bold text-[#111118] border border-[#111118]">
              {(displayName || username || "SV").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#111118] dark:text-[#f0f6ff] truncate">
              {displayName || username || "Sinh viên PeerMind"}
            </p>
            {username && (
              <p className="text-xs font-mono text-[#0b7a75] dark:text-[#2dd4bf] truncate">
                @{username}
              </p>
            )}
            {userEmail && (
              <p className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 truncate">
                {userEmail}
              </p>
            )}
          </div>
        </div>

        {/* 1. Đổi tên hiển thị */}
        <form onSubmit={handleSaveDisplayName} className="mt-5 space-y-3 border-t border-[#e1edff] dark:border-[#2a2a3a] pt-5">
          <h3 className="text-sm font-bold text-[#111118] dark:text-[#f0f6ff]">
            1. Đổi tên hiển thị
          </h3>
          <div>
            <label htmlFor="settings-display-name" className="block text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 mb-1">
              Tên hiển thị trong phòng học và bảng xếp hạng
            </label>
            <div className="flex gap-2">
              <input
                id="settings-display-name"
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="form-input flex-1 !h-10 text-sm"
              />
              <button
                type="submit"
                disabled={savingName}
                className="primary-button !h-10 !px-4 text-xs font-bold shrink-0 cursor-pointer"
              >
                {savingName ? "Đang lưu..." : "Lưu tên"}
              </button>
            </div>
          </div>
          {nameMsg && (
            <p
              className={`text-xs font-medium ${
                nameMsg.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {nameMsg.text}
            </p>
          )}
        </form>

        {/* 2. Đổi mật khẩu */}
        <form onSubmit={handleSavePassword} className="mt-5 space-y-3 border-t border-[#e1edff] dark:border-[#2a2a3a] pt-5">
          <h3 className="text-sm font-bold text-[#111118] dark:text-[#f0f6ff]">
            2. Đổi mật khẩu
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="Mật khẩu mới (≥ 6 ký tự)"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="form-input !h-10 text-sm !pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Hiện hoặc ẩn mật khẩu"
                className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500 cursor-pointer"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <input
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="form-input !h-10 text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            {passMsg ? (
              <p
                className={`text-xs font-medium ${
                  passMsg.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {passMsg.text}
              </p>
            ) : (
              <span className="text-xs text-slate-500">Không dùng mật khẩu phổ biến (123456...)</span>
            )}
            <button
              type="submit"
              disabled={savingPass}
              className="primary-button !h-10 !px-4 text-xs font-bold shrink-0 cursor-pointer"
            >
              {savingPass ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </div>
        </form>

        {/* 3. Đăng xuất */}
        <div className="mt-6 pt-4 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between">
          <span className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60">
            Đăng xuất khỏi phiên làm việc hiện tại
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold cursor-pointer transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};
