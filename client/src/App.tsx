import { FormEvent, useEffect, useState } from "react";
import logo from "./assets/logo/Logo web.png";
import { Header, DashboardTab } from "./components/common/Header";
import LibraryPage from "./pages/LibraryPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import TestsPage from "./pages/TestsPage";
import { Icon } from "./components/common/Icon";

const heroPhoto =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1400";

type AuthView = "login" | "register" | "forgot";

const features = [
  {
    number: "01",
    title: "Học cùng bạn bè",
    description: "Kết nối với những người bạn cùng mục tiêu, chia sẻ kiến thức và tiến bộ mỗi ngày.",
    color: "bg-sky-50 text-sky-600",
    icon: (
      <Icon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </Icon>
    ),
  },
  {
    number: "02",
    title: "Lộ trình thông minh",
    description: "Cá nhân hóa nội dung theo năng lực để bạn học đúng thứ cần thiết, đúng thời điểm.",
    color: "bg-violet-50 text-violet-600",
    icon: (
      <Icon>
        <path d="M9 18h6M10 22h4" />
        <path d="M8.5 14.5A7 7 0 1 1 15.5 14.5C14.6 15.2 14 16.1 14 17h-4c0-.9-.6-1.8-1.5-2.5Z" />
        <path d="m9.5 8.5 1.7 1.7 3.5-3.5" />
      </Icon>
    ),
  },
  {
    number: "03",
    title: "Theo dõi tiến độ",
    description: "Nhìn thấy sự trưởng thành qua từng cột mốc với báo cáo trực quan và dễ hiểu.",
    color: "bg-amber-50 text-amber-600",
    icon: (
      <Icon>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
        <path d="M2 19h22" />
      </Icon>
    ),
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
    <div className="min-h-screen overflow-x-hidden bg-[#fcfdff] text-[#17204d]">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#" aria-label="PeerMind - Trang chủ" className="block">
            <img src={logo} alt="PeerMind" className="h-auto w-40 sm:w-44" />
          </a>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Điều hướng chính">
            <a className="nav-link" href="#gioi-thieu">
              Giới thiệu
            </a>
            <a className="nav-link" href="#tinh-nang">
              Tính năng
            </a>
            <a className="nav-link" href="#hanh-trinh">
              Hành trình
            </a>
          </nav>

          <button onClick={openLogin} className="primary-button hidden md:inline-flex cursor-pointer">
            Đăng nhập
            <Icon className="h-4 w-4">
              <path d="m9 18 6-6-6-6" />
            </Icon>
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-[#17204d] md:hidden cursor-pointer"
            aria-label="Mở menu"
            aria-expanded={isMenuOpen}
          >
            <Icon>
              {isMenuOpen ? (
                <>
                  <path d="m6 6 12 12" />
                  <path d="M18 6 6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </Icon>
          </button>
        </div>

        {isMenuOpen && (
          <div className="mx-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-xl md:hidden">
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
                  className="rounded-xl px-4 py-3 font-medium hover:bg-slate-50"
                >
                  {label}
                </a>
              ))}
              <button onClick={openLogin} className="primary-button mt-3 justify-center">
                Đăng nhập
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section
          id="gioi-thieu"
          className="relative flex min-h-[780px] items-center overflow-hidden pt-24 lg:min-h-[850px]"
        >
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="dot-grid absolute bottom-12 left-[4%] h-28 w-28 opacity-50" />

          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-14 lg:px-10">
            <div className="lg:col-span-7">
              <span className="pill-badge">Nền tảng học tập thông minh</span>
              <h1 className="hero-heading mt-6">
                Học tập cùng <span className="gradient-text">bạn bè</span> &amp; Trí tuệ nhân tạo
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
                Không gian học nhóm kết hợp AI giúp biến tài liệu phức tạp thành trải nghiệm học tập sinh động và hiệu
                quả.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button onClick={openLogin} className="primary-button justify-center py-4 text-base cursor-pointer">
                  Bắt đầu học ngay
                  <Icon className="h-4 w-4">
                    <path d="m9 18 6-6-6-6" />
                  </Icon>
                </button>
                <button onClick={enterDashboard} className="secondary-button justify-center py-4 text-base cursor-pointer">
                  Xem bản trải nghiệm (Demo)
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="glass-panel overflow-hidden p-3 sm:p-4">
                  <div className="overflow-hidden rounded-2xl">
                    <img src={heroPhoto} alt="Học nhóm cùng bạn bè" className="h-72 w-full object-cover sm:h-96" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tinh-nang" className="relative py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="text-center">
              <span className="pill-badge">Lợi ích vượt trội</span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Trải nghiệm học tập thế hệ mới</h2>
              <p className="mt-4 text-slate-600 sm:text-lg">Thiết kế tối ưu giúp bạn học nhanh hơn, nhớ lâu hơn.</p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.number} className="feature-card">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <strong className="mt-6 block text-sm font-bold tracking-widest text-slate-400 uppercase">
                    BƯỚC {feature.number}
                  </strong>
                  <h3 className="mt-2 text-xl font-bold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="hanh-trinh" className="relative py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="rounded-[2.5rem] bg-[#17204d] p-8 text-white sm:p-12 lg:p-16">
              <div className="max-w-2xl">
                <span className="pill-badge bg-white/10 text-sky-300">Sẵn sàng trải nghiệm?</span>
                <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Bắt đầu nâng cao hiệu quả học tập ngay hôm nay
                </h2>
                <p className="mt-4 text-slate-300 sm:text-lg">
                  Tham gia cùng hàng nghìn học viên đang sử dụng PeerMind để học thông minh hơn mỗi ngày.
                </p>
                <div className="mt-8">
                  <button onClick={openLogin} className="primary-button py-4 text-base cursor-pointer">
                    Tạo tài khoản miễn phí
                    <Icon className="h-4 w-4">
                      <path d="m9 18 6-6-6-6" />
                    </Icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8 lg:px-10">
          <img src={logo} alt="PeerMind" className="w-36" />
          <p className="text-sm text-slate-500">© 2026 PeerMind. Tất cả quyền được bảo lưu.</p>
        </div>
      </footer>

      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-6 right-6 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <Icon className="h-4 w-4">
                <path d="m6 6 12 12M18 6 6 18" />
              </Icon>
            </button>

            {authView === "login" && (
              <>
                <h2 id="login-title" className="text-3xl font-extrabold tracking-tight text-[#17204d]">
                  Chào mừng trở lại!
                </h2>
                <p className="mt-2 leading-6 text-slate-500">Đăng nhập để tiếp tục hành trình học tập của bạn.</p>
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                        className="text-xs font-semibold text-violet-600 hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <input required type="password" placeholder="••••••••" className="form-input" />
                  </label>
                  <button type="button" onClick={enterDashboard} className="primary-button w-full justify-center py-4 cursor-pointer">
                    Đăng nhập
                  </button>
                  <p className="text-center text-sm text-slate-500">
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("register")}
                      className="font-bold text-violet-600 hover:underline cursor-pointer"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                </form>
              </>
            )}

            {authView === "register" && (
              <>
                <h2 id="login-title" className="text-3xl font-extrabold tracking-tight text-[#17204d]">
                  Tạo tài khoản mới
                </h2>
                <p className="mt-2 leading-6 text-slate-500">Miễn phí 100% và luôn luôn như vậy.</p>
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                  <button type="button" onClick={enterDashboard} className="primary-button w-full justify-center py-4 cursor-pointer">
                    Tạo tài khoản
                  </button>
                  <p className="text-center text-sm text-slate-500">
                    Đã có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => changeAuthView("login")}
                      className="font-bold text-violet-600 hover:underline cursor-pointer"
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
                  <Icon className="h-4 w-4">
                    <path d="m15 18-6-6 6-6" />
                  </Icon>
                  Quay lại đăng nhập
                </button>
                <h2 id="login-title" className="mt-5 text-3xl font-extrabold tracking-tight text-[#17204d]">
                  Quên mật khẩu?
                </h2>
                <p className="mt-2 leading-6 text-slate-500">
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
                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <label className="block">
                      <span className="form-label">Email</span>
                      <input required type="email" placeholder="ban@example.com" className="form-input" />
                    </label>
                    <button type="submit" className="primary-button w-full justify-center py-4 cursor-pointer">
                      Gửi liên kết khôi phục
                    </button>
                    <p className="text-center text-sm text-slate-400">
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
    <div className="min-h-screen bg-[#f6f8fc] text-[#17204d]">
      <Header activeTab={activeTab} onSelectTab={setActiveTab} onLogout={onLogout} />

      {/* Mobile navigation fallback */}
      <div className="mb-2 overflow-x-auto md:hidden px-5 pt-4">
        <nav className="flex min-w-max gap-2 rounded-2xl bg-white p-2 shadow-xs" aria-label="Điều hướng mobile">
          {[
            { id: "documents" as const, label: "Tài liệu" },
            { id: "classrooms" as const, label: "Phòng học" },
            { id: "tests" as const, label: "Bài kiểm tra" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer ${
                activeTab === item.id ? "bg-[#17204d] text-white" : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:py-10">
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
    <div className="mt-8 rounded-2xl bg-emerald-50 p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white">
        <Icon>
          <path d="m5 12 4 4L19 6" />
        </Icon>
      </span>
      <p className="mt-4 font-bold text-emerald-800">{title}</p>
      <p className="mt-1 text-sm leading-6 text-emerald-700">{description}</p>
      <button onClick={onContinue} className="primary-button mt-5 w-full justify-center cursor-pointer">
        {buttonText}
      </button>
    </div>
  );
}
