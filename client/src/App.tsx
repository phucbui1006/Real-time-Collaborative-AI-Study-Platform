import { ChangeEvent, FormEvent, ReactNode, useEffect, useState } from "react";
import logo from "./assets/peermind-logo.png";

const heroPhoto =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1400";

type AuthView = "login" | "register" | "forgot";
type DashboardTab = "documents" | "classrooms" | "tests";

type IconProps = {
  children: ReactNode;
  className?: string;
};

function Icon({ children, className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const features = [
  {
    number: "01",
    title: "Học cùng bạn bè",
    description:
      "Kết nối với những người bạn cùng mục tiêu, chia sẻ kiến thức và tiến bộ mỗi ngày.",
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
    description:
      "Cá nhân hóa nội dung theo năng lực để bạn học đúng thứ cần thiết, đúng thời điểm.",
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
    description:
      "Nhìn thấy sự trưởng thành qua từng cột mốc với báo cáo trực quan và dễ hiểu.",
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

          <button onClick={openLogin} className="primary-button hidden md:inline-flex">
            Đăng nhập
            <Icon className="h-4 w-4">
              <path d="m9 18 6-6-6-6" />
            </Icon>
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-[#17204d] md:hidden"
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

          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
            <div className="relative z-10 max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Học tập theo cách của bạn
              </div>
              <h1 className="text-[3.35rem] leading-[1.03] font-extrabold tracking-[-0.055em] text-[#17204d] sm:text-6xl lg:text-[4.75rem]">
                Cùng nhau học,
                <span className="relative mt-2 block text-sky-500">
                  cùng nhau giỏi.
                  <svg
                    className="absolute -bottom-3 left-1 w-[82%] text-violet-400"
                    viewBox="0 0 420 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M3 13C100 3 282 2 417 8" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-10 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                PeerMind là không gian học tập nơi bạn kết nối, khám phá và phát triển cùng
                cộng đồng. Biến mỗi mục tiêu thành một hành trình đầy cảm hứng.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <button onClick={openLogin} className="primary-button justify-center px-7 py-4 text-base">
                  Bắt đầu học ngay
                  <Icon className="h-5 w-5">
                    <path d="m9 18 6-6-6-6" />
                  </Icon>
                </button>
                <a href="#tinh-nang" className="secondary-button justify-center px-7 py-4">
                  Khám phá PeerMind
                </a>
              </div>
              <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  {["LT", "MN", "TH"].map((name, index) => (
                    <span
                      key={name}
                      className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white ${
                        ["bg-sky-500", "bg-violet-500", "bg-amber-400"][index]
                      }`}
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <p>
                  <strong className="text-[#17204d]">10.000+</strong> bạn học đang đồng hành
                </p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:ml-auto">
              <div className="absolute -inset-5 rotate-3 rounded-[3rem] bg-violet-100/70" />
              <figure className="relative overflow-hidden rounded-[2.5rem] border-[8px] border-white bg-slate-100 shadow-[0_30px_80px_rgba(52,64,140,0.2)]">
                <img
                  src={heroPhoto}
                  alt="Nhóm sinh viên vui vẻ cùng học bên máy tính"
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Icon>
                      <path d="m5 12 4 4L19 6" />
                    </Icon>
                  </span>
                  <span>
                    <strong className="block text-sm text-[#17204d]">Mục tiêu hôm nay</strong>
                    <span className="text-xs text-slate-500">Bạn đã hoàn thành 4/5 bài học</span>
                  </span>
                  <span className="ml-auto text-lg font-bold text-emerald-600">80%</span>
                </figcaption>
              </figure>
              <div className="absolute -top-7 -right-3 grid h-20 w-20 rotate-6 place-items-center rounded-3xl bg-sky-500 text-white shadow-lg sm:-right-7">
                <Icon className="h-9 w-9">
                  <path d="M12 3v18M3 12h18" />
                </Icon>
              </div>
            </div>
          </div>
        </section>

        <section id="tinh-nang" className="relative bg-white py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Tại sao chọn PeerMind?</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-[#17204d] sm:text-5xl">
                Mọi thứ bạn cần để <span className="text-violet-500">tiến bộ hơn</span>
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-500">
                Một nền tảng đơn giản, gần gũi và luôn đồng hành cùng bạn trên mỗi chặng đường.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="feature-card">
                  <div className="flex items-start justify-between">
                    <span className={`grid h-14 w-14 place-items-center rounded-2xl ${feature.color}`}>
                      {feature.icon}
                    </span>
                    <span className="text-sm font-bold tracking-widest text-slate-300">{feature.number}</span>
                  </div>
                  <h3 className="mt-8 text-2xl font-bold text-[#17204d]">{feature.title}</h3>
                  <p className="mt-4 leading-7 text-slate-500">{feature.description}</p>
                  <a href="#" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-violet-600">
                    Tìm hiểu thêm
                    <Icon className="h-4 w-4">
                      <path d="m9 18 6-6-6-6" />
                    </Icon>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="hanh-trinh" className="px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#17204d] px-6 py-16 text-center text-white sm:px-14 sm:py-20">
            <div className="dot-grid absolute -top-5 -right-3 h-40 w-40 opacity-10" />
            <div className="absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-sky-500/20" />
            <div className="relative mx-auto max-w-3xl">
              <p className="font-bold tracking-[0.18em] text-sky-400 uppercase">Sẵn sàng chưa?</p>
              <h2 className="mt-5 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
                Hành trình giỏi hơn bắt đầu từ hôm nay.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-300">
                Đăng nhập để gặp những người bạn mới và biến việc học thành trải nghiệm đáng mong đợi.
              </p>
              <button onClick={openLogin} className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-[#17204d] transition hover:-translate-y-0.5 hover:bg-sky-50">
                Đăng nhập PeerMind
                <Icon className="h-5 w-5">
                  <path d="m9 18 6-6-6-6" />
                </Icon>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-8 text-center sm:px-8 md:flex-row md:text-left lg:px-10">
          <img src={logo} alt="PeerMind" className="w-36" />
          <p className="text-sm text-slate-400">© 2025 PeerMind. Học cùng nhau, lớn cùng nhau.</p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-violet-600">Điều khoản</a>
            <a href="#" className="hover:text-violet-600">Liên hệ</a>
          </div>
        </div>
      </footer>

      {isLoginOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#101638]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsLoginOpen(false);
          }}
        >
          <div className="relative w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9">
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-5 right-5 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Đóng"
            >
              <Icon className="h-5 w-5">
                <path d="m6 6 12 12" />
                <path d="M18 6 6 18" />
              </Icon>
            </button>
            <img src={logo} alt="PeerMind" className="w-40" />

            {authView === "login" && (
              <>
                <h2 id="login-title" className="mt-7 text-3xl font-extrabold tracking-tight text-[#17204d]">
                  Chào mừng trở lại!
                </h2>
                <p className="mt-2 text-slate-500">Tiếp tục hành trình học tập của bạn.</p>

                {isSubmitted ? (
                  <AuthSuccess
                    title="Đăng nhập thành công!"
                    description="Chào mừng bạn quay lại với PeerMind."
                    buttonText="Đi tới dashboard"
                    onContinue={enterDashboard}
                  />
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <label className="block">
                      <span className="form-label">Email</span>
                      <input required type="email" placeholder="ban@example.com" className="form-input" />
                    </label>
                    <label className="block">
                      <span className="form-label">Mật khẩu</span>
                      <input required type="password" placeholder="Nhập mật khẩu" className="form-input" />
                    </label>
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 text-slate-500">
                        <input type="checkbox" className="accent-violet-600" />
                        Ghi nhớ tôi
                      </label>
                      <button
                        type="button"
                        onClick={() => changeAuthView("forgot")}
                        className="font-semibold text-violet-600 hover:text-violet-800"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <button type="submit" className="primary-button w-full justify-center py-4">
                      Đăng nhập
                    </button>
                    <p className="text-center text-sm text-slate-500">
                      Chưa có tài khoản?{" "}
                      <button
                        type="button"
                        onClick={() => changeAuthView("register")}
                        className="font-bold text-violet-600 hover:text-violet-800"
                      >
                        Đăng ký miễn phí
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}

            {authView === "register" && (
              <>
                <button type="button" onClick={() => changeAuthView("login")} className="auth-back-button">
                  <Icon className="h-4 w-4">
                    <path d="m15 18-6-6 6-6" />
                  </Icon>
                  Quay lại đăng nhập
                </button>
                <h2 id="login-title" className="mt-5 text-3xl font-extrabold tracking-tight text-[#17204d]">
                  Tạo tài khoản
                </h2>
                <p className="mt-2 text-slate-500">Bắt đầu hành trình học tập cùng PeerMind.</p>

                {isSubmitted ? (
                  <AuthSuccess
                    title="Đăng ký thành công!"
                    description="Tài khoản của bạn đã sẵn sàng để học tập."
                    buttonText="Đăng nhập ngay"
                    onContinue={() => changeAuthView("login")}
                  />
                ) : (
                  <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                    <label className="block">
                      <span className="form-label">Họ và tên</span>
                      <input required type="text" placeholder="Nguyễn Minh Anh" className="form-input" />
                    </label>
                    <label className="block">
                      <span className="form-label">Email</span>
                      <input required type="email" placeholder="ban@example.com" className="form-input" />
                    </label>
                    <label className="block">
                      <span className="form-label">Mật khẩu</span>
                      <input
                        required
                        minLength={8}
                        type="password"
                        placeholder="Tối thiểu 8 ký tự"
                        className="form-input"
                      />
                    </label>
                    <label className="flex items-start gap-2.5 text-sm leading-5 text-slate-500">
                      <input required type="checkbox" className="mt-1 accent-violet-600" />
                      <span>
                        Tôi đồng ý với{" "}
                        <a href="#" className="font-semibold text-violet-600">Điều khoản sử dụng</a>{" "}
                        và Chính sách bảo mật.
                      </span>
                    </label>
                    <button type="submit" className="primary-button w-full justify-center py-4">
                      Tạo tài khoản
                    </button>
                    <p className="text-center text-sm text-slate-500">
                      Đã có tài khoản?{" "}
                      <button
                        type="button"
                        onClick={() => changeAuthView("login")}
                        className="font-bold text-violet-600 hover:text-violet-800"
                      >
                        Đăng nhập
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}

            {authView === "forgot" && (
              <>
                <button type="button" onClick={() => changeAuthView("login")} className="auth-back-button">
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
                    <button type="submit" className="primary-button w-full justify-center py-4">
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

const dashboardNavigation = [
  {
    id: "documents" as const,
    label: "Tài liệu",
    description: "Kho kiến thức",
    icon: (
      <Icon>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </Icon>
    ),
  },
  {
    id: "classrooms" as const,
    label: "Phòng học",
    description: "Học tập cùng nhau",
    icon: (
      <Icon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </Icon>
    ),
  },
  {
    id: "tests" as const,
    label: "Bài kiểm tra",
    description: "Kiểm tra trực tuyến",
    icon: (
      <Icon>
        <path d="M9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </Icon>
    ),
  },
];

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("documents");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).map((file) => file.name);
    setUploadedFiles((current) => [...files, ...current]);
    event.target.value = "";
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#17204d]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <img src={logo} alt="PeerMind" className="w-40 sm:w-44" />
          <div className="flex items-center gap-3">
            <button
              className="relative grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              aria-label="Thông báo"
            >
              <Icon className="h-5 w-5">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </Icon>
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" />
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-[#17204d]">Minh Anh</p>
              <p className="text-xs text-slate-400">Học viên</p>
            </div>
            <button
              onClick={onLogout}
              className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 pr-3 text-sm font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
              title="Nhấn để đăng xuất"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                MA
              </span>
              <Icon className="h-4 w-4">
                <path d="m9 18 6-6-6-6" />
              </Icon>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] gap-8 px-5 py-7 sm:px-8 lg:py-10">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-28 rounded-[1.75rem] bg-[#17204d] p-5 text-white shadow-[0_20px_45px_rgba(23,32,77,0.15)]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-400 text-[#17204d]">
                <Icon className="h-5 w-5">
                  <path d="M12 3v12M8 7l4-4 4 4" />
                  <path d="M5 13v6h14v-6" />
                </Icon>
              </span>
              <div>
                <p className="text-sm font-bold">Thêm tài liệu</p>
                <p className="text-[0.68rem] text-slate-400">Kho cá nhân của bạn</p>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 py-7 text-center transition hover:border-sky-400 hover:bg-white/10">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sky-300">
                <Icon className="h-5 w-5">
                  <path d="M12 5v14M5 12h14" />
                </Icon>
              </span>
              <strong className="mt-3 text-sm">Chọn file để tải lên</strong>
              <span className="mt-1 text-[0.68rem] leading-5 text-slate-400">
                PDF, DOCX, PPTX hoặc hình ảnh
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">File vừa thêm</p>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[0.65rem] text-slate-300">
                  {uploadedFiles.length}
                </span>
              </div>
              {uploadedFiles.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {uploadedFiles.slice(0, 4).map((file, index) => (
                    <li key={`${file}-${index}`} className="flex items-center gap-2 rounded-xl bg-white/8 p-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-400/20 text-violet-200">
                        <Icon className="h-4 w-4">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16h16V8Z" />
                          <path d="M14 2v6h6M8 13h8M8 17h5" />
                        </Icon>
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.7rem] font-medium text-slate-200">{file}</span>
                      <button
                        onClick={() => setUploadedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))}
                        className="text-slate-500 transition hover:text-white"
                        aria-label={`Xóa ${file}`}
                      >
                        <Icon className="h-3.5 w-3.5">
                          <path d="m6 6 12 12M18 6 6 18" />
                        </Icon>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl bg-white/5 px-3 py-4 text-center text-[0.68rem] leading-5 text-slate-500">
                  Chưa có file mới.
                  <br />
                  Tài liệu tải lên sẽ hiện ở đây.
                </p>
              )}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-7 hidden rounded-[1.5rem] border border-slate-100 bg-white p-2 shadow-sm lg:block">
            <nav className="grid grid-cols-3 gap-2" aria-label="Điều hướng dashboard">
              {dashboardNavigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-left transition ${
                    activeTab === item.id
                      ? "bg-[#17204d] text-white shadow-lg"
                      : "text-slate-500 hover:bg-slate-50 hover:text-[#17204d]"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      activeTab === item.id ? "bg-violet-500 text-white" : "bg-slate-100 text-violet-600"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>
                    <strong className="block text-sm">{item.label}</strong>
                    <span className={`text-[0.68rem] ${activeTab === item.id ? "text-slate-300" : "text-slate-400"}`}>
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mb-6 overflow-x-auto lg:hidden">
            <nav className="flex min-w-max gap-2 rounded-2xl bg-white p-2 shadow-sm" aria-label="Điều hướng dashboard">
              {dashboardNavigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    activeTab === item.id ? "bg-[#17204d] text-white" : "text-slate-500"
                  }`}
                >
                  <span className="h-5 w-5">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Xin chào, Minh Anh</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                {activeTab === "documents" && "Kho tài liệu"}
                {activeTab === "classrooms" && "Phòng học của bạn"}
                {activeTab === "tests" && "Bài kiểm tra trực tuyến"}
              </h1>
              <p className="mt-2 text-slate-500">
                {activeTab === "documents" && "Khám phá và tiếp tục những nội dung bạn đang học."}
                {activeTab === "classrooms" && "Kết nối, thảo luận và tiến bộ cùng bạn bè."}
                {activeTab === "tests" && "Đánh giá kiến thức và chinh phục mục tiêu tiếp theo."}
              </p>
            </div>
            <DashboardAction activeTab={activeTab} />
          </div>

          {activeTab === "documents" && <DocumentsPanel />}
          {activeTab === "classrooms" && <ClassroomsPanel />}
          {activeTab === "tests" && <TestsPanel />}
        </main>
      </div>
    </div>
  );
}

function DashboardAction({ activeTab }: { activeTab: DashboardTab }) {
  const labels = {
    documents: "Tải tài liệu lên",
    classrooms: "Tạo phòng học",
    tests: "Tạo bài kiểm tra",
  };

  return (
    <button className="primary-button shrink-0 justify-center">
      <Icon className="h-4 w-4">
        <path d="M12 5v14M5 12h14" />
      </Icon>
      {labels[activeTab]}
    </button>
  );
}

function DocumentsPanel() {
  const documents = [
    { title: "Toán cao cấp — Chương 4", subject: "Toán học", progress: 72, tone: "bg-sky-500", icon: "∑" },
    { title: "Ngữ pháp tiếng Anh B1", subject: "Ngoại ngữ", progress: 48, tone: "bg-violet-500", icon: "Aa" },
    { title: "Vật lý — Điện trường", subject: "Vật lý", progress: 86, tone: "bg-amber-400", icon: "φ" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard value="24" label="Tài liệu đã lưu" detail="+3 tuần này" color="text-sky-600" />
        <StatCard value="12h" label="Thời gian học" detail="+18% so với tuần trước" color="text-violet-600" />
        <StatCard value="68%" label="Tiến độ trung bình" detail="Đang tiến bộ tốt" color="text-emerald-600" />
      </div>
      <section className="dashboard-section mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Tiếp tục học</h2>
          <button className="text-sm font-bold text-violet-600">Xem tất cả</button>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {documents.map((document) => (
            <article key={document.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 transition hover:border-violet-200 hover:bg-white hover:shadow-lg">
              <span className={`grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white ${document.tone}`}>
                {document.icon}
              </span>
              <p className="mt-5 text-xs font-bold tracking-wider text-slate-400 uppercase">{document.subject}</p>
              <h3 className="mt-1 min-h-12 font-bold leading-6">{document.title}</h3>
              <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                <span>Tiến độ</span>
                <strong className="text-[#17204d]">{document.progress}%</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${document.tone}`} style={{ width: `${document.progress}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ClassroomsPanel() {
  const rooms = [
    { title: "Nhóm ôn thi Toán 12", members: 18, next: "19:30 hôm nay", color: "bg-sky-100 text-sky-700" },
    { title: "English Speaking Club", members: 24, next: "20:00 thứ 5", color: "bg-violet-100 text-violet-700" },
    { title: "Lập trình Web cơ bản", members: 12, next: "09:00 thứ 7", color: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
      <section className="dashboard-section">
        <h2 className="text-xl font-bold">Phòng học đang tham gia</h2>
        <div className="mt-5 space-y-4">
          {rooms.map((room, index) => (
            <article key={room.title} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-5 sm:flex-row sm:items-center">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold ${room.color}`}>
                0{index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{room.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{room.members} thành viên · Buổi tiếp theo: {room.next}</p>
              </div>
              <button className="secondary-button justify-center px-5 py-2.5 text-sm">Vào phòng</button>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-[1.75rem] bg-violet-600 p-6 text-white">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
          <Icon>
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
          </Icon>
        </span>
        <p className="mt-8 text-sm text-violet-200">Sắp diễn ra</p>
        <h3 className="mt-1 text-xl font-bold">Ôn tập Đại số</h3>
        <p className="mt-2 text-sm text-violet-100">Hôm nay, 19:30</p>
        <button className="mt-8 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-violet-700">Đặt lời nhắc</button>
      </section>
    </div>
  );
}

function TestsPanel() {
  const tests = [
    { title: "Kiểm tra Đại số giữa kỳ", subject: "Toán học", questions: 30, minutes: 45, status: "Làm bài", ready: true },
    { title: "English Grammar — Unit 6", subject: "Tiếng Anh", questions: 25, minutes: 30, status: "Làm bài", ready: true },
    { title: "Dao động điều hòa", subject: "Vật lý", questions: 20, minutes: 25, status: "Đã đạt 8.5", ready: false },
  ];

  return (
    <>
      <div className="rounded-[1.75rem] bg-[#17204d] p-6 text-white sm:flex sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-sm font-semibold text-sky-400">Thử thách tuần này</p>
          <h2 className="mt-2 text-2xl font-bold">Hoàn thành 3 bài kiểm tra</h2>
          <p className="mt-2 text-sm text-slate-400">Bạn đã hoàn thành 2/3. Chỉ còn một bước nữa!</p>
        </div>
        <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-full border-8 border-violet-400 sm:mt-0">
          <strong>67%</strong>
        </div>
      </div>
      <section className="dashboard-section mt-6">
        <h2 className="text-xl font-bold">Bài kiểm tra dành cho bạn</h2>
        <div className="mt-5 divide-y divide-slate-100">
          {tests.map((test) => (
            <article key={test.title} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Icon>
                  <path d="M9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </Icon>
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold text-violet-600 uppercase">{test.subject}</p>
                <h3 className="mt-1 font-bold">{test.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{test.questions} câu hỏi · {test.minutes} phút</p>
              </div>
              <button className={test.ready ? "primary-button justify-center text-sm" : "rounded-full bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700"}>
                {test.status}
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function StatCard({ value, label, detail, color }: { value: string; label: string; detail: string; color: string }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <strong className={`text-3xl font-extrabold ${color}`}>{value}</strong>
      <p className="mt-2 font-bold">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </article>
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
      <button onClick={onContinue} className="primary-button mt-5 w-full justify-center">
        {buttonText}
      </button>
    </div>
  );
}
