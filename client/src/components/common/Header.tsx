// components/common/Header.tsx — Thanh điều hướng trên cùng chuẩn UI_DESIGN_SKILL.md
import { Bell, LogOut } from "lucide-react";
import { Logo } from "./Logo";

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
    <header className="sticky top-0 z-40 h-16 w-full bg-white border-b border-slate-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Cột 1 (Trái): Logo ngang PeerMind */}
        <div className="flex flex-1 items-center justify-start shrink-0">
          <Logo
            size="md"
            onClick={() => {
              onSelectTab("documents");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>

        {/* Cột 2 (Giữa): 3 Mục điều hướng thuần chữ — TUYỆT ĐỐI KHÔNG icon/box */}
        <nav className="hidden h-16 items-center gap-8 md:flex shrink-0" aria-label="Điều hướng chính">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`h-16 inline-flex items-center px-1 text-sm transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "border-b-2 border-indigo-600 font-semibold text-indigo-950"
                    : "border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Cột 3 (Phải): Khu vực thông báo & Avatar hồ sơ người dùng */}
        <div className="flex flex-1 items-center justify-end gap-3 shrink-0">
          {/* Nút thông báo */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 cursor-pointer shadow-2xs"
            aria-label="Thông báo"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-indigo-600 ring-2 ring-white" />
          </button>

          {/* User profile & Đăng xuất */}
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-700 shadow-2xs">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
              MA
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-none">Minh Anh</p>
              <p className="mt-0.5 text-[10px] text-slate-500 leading-none">Học viên</p>
            </div>
            <button
              onClick={onLogout}
              className="ml-1 text-slate-400 hover:text-rose-600 transition-colors duration-150 p-1 cursor-pointer"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
