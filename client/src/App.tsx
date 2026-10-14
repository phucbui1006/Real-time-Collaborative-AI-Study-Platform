import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Users, Compass, BarChart3, X, Check, Menu, ArrowLeft } from "lucide-react";
import { Logo } from "./components/common/Logo";
import { Header, DashboardTab } from "./components/common/Header";
import LibraryPage from "./pages/LibraryPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import TestsPage from "./pages/TestsPage";
import { ClassroomHeroAnimation } from "./components/common/ClassroomHeroAnimation";

type AuthView = "login" | "register" | "forgot";

const features = [
  {
    number: "01",
    title: "Học cùng bạn bè",
    description: "Kết nối với những người bạn cùng mục tiêu, chia sẻ kiến thức và tiến bộ mỗi ngày.",
    icon: Users,
  },
  {
    number: "02",
    title: "Lộ trình thông minh",
    description: "Cá nhân hóa nội dung theo năng lực để bạn học đúng thứ cần thiết, đúng thời điểm.",
    icon: Compass,
  },
  {
    number: "03",
    title: "Theo dõi tiến độ",
    description: "Nhìn thấy sự trưởng thành qua từng cột mốc với báo cáo trực quan và dễ hiểu.",
    icon: BarChart3,
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
              <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                Học tập cùng bạn bè &amp; Trí tuệ nhân tạo
              </h1>
              <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600">
                Không gian học nhóm kết hợp AI giúp biến tài liệu phức tạp thành trải nghiệm học tập sinh động và hiệu
                quả.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button onClick={openLogin} className="primary-button justify-center h-10 px-5 text-sm cursor-pointer">
                  Bắt đầu học ngay
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button onClick={enterDashboard} className="secondary-button justify-center h-10 px-5 text-sm cursor-pointer">
                  Xem bản trải nghiệm (Demo)
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <ClassroomHeroAnimation />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="tinh-nang" className="relative py-20 bg-[#FAFAFA]">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="text-center max-w-2xl mx-auto">
              <span className="pill-badge">Lợi ích vượt trội</span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Trải nghiệm học tập thế hệ mới</h2>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">Thiết kế tối ưu giúp bạn học nhanh hơn, nhớ lâu hơn.</p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <div key={feature.number} className="feature-card">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      <IconComponent className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <strong className="mt-5 block text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono">
                      BƯỚC {feature.number}
                    </strong>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="hanh-trinh" className="relative py-16 bg-white border-t border-slate-200/80">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="rounded-lg bg-indigo-950 p-8 text-white sm:p-12 border border-indigo-900/60 shadow-xs">
              <div className="max-w-2xl">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-white/10 text-indigo-200 border border-white/10">
                  Sẵn sàng trải nghiệm?
                </span>
                <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Bắt đầu nâng cao hiệu quả học tập ngay hôm nay
                </h2>
                <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                  Tham gia cùng hàng nghìn học viên đang sử dụng PeerMind để học thông minh hơn mỗi ngày.
                </p>
                <div className="mt-6">
                  <button onClick={openLogin} className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md bg-white text-indigo-950 hover:bg-slate-100 text-sm font-medium shadow-xs transition-colors cursor-pointer">
                    Tạo tài khoản miễn phí
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8 lg:px-10">
          <Logo size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
          <p className="text-xs text-slate-500 font-mono">© 2026 PeerMind. Tất cả quyền được bảo lưu.</p>
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
    <div className="min-h-screen bg-[#FAFAFA] text-slate-700">
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

      <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:py-8">
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
