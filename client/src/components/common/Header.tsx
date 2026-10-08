// components/common/Header.tsx — Thanh điều hướng trên cùng
import logo from "../../assets/logo/Logo web.png";
import { Icon } from "./Icon";

export type DashboardTab = "documents" | "classrooms" | "tests";

type HeaderProps = {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onLogout: () => void;
};

const navigationItems: { id: DashboardTab; label: string }[] = [
  { id: "documents", label: "Tài liệu" },
  { id: "classrooms", label: "Phòng học" },
  { id: "tests", label: "Bài kiểm tra" },
];

export function Header({ activeTab, onSelectTab, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src={logo} alt="PeerMind" className="w-36 sm:w-40" />
        </div>

        {/* Navigation Tabs in Header */}
        <nav className="hidden items-center gap-10 md:flex" aria-label="Điều hướng header">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`nav-link cursor-pointer ${isActive ? "active font-bold" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User & Notification Controls */}
        <div className="flex items-center gap-4">
          <button
            className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 cursor-pointer"
            aria-label="Thông báo"
          >
            <Icon className="h-5 w-5">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </Icon>
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" />
          </button>

          <button
            onClick={onLogout}
            className="group flex items-center gap-3 rounded-full border border-slate-200/80 bg-white py-1.5 px-3 transition hover:border-violet-300 hover:bg-slate-50 shadow-xs cursor-pointer"
            title="Nhấn để đăng xuất"
          >
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-[#17204d] leading-none">Minh Anh</p>
              <p className="mt-1 text-[0.68rem] font-medium text-slate-400 leading-none">Học viên</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
              MA
            </span>
            <Icon className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5">
              <path d="m9 18 6-6-6-6" />
            </Icon>
          </button>
        </div>
      </div>
    </header>
  );
}
