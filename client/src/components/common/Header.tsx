import { Bell, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export type DashboardTab = "documents" | "classrooms" | "tests";

type HeaderProps = {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
};

const navigationItems: { id: DashboardTab; label: string }[] = [
  { id: "documents", label: "Tài liệu" },
  { id: "classrooms", label: "Phòng học" },
  { id: "tests", label: "Bài kiểm tra" },
];

export function Header({ activeTab, onSelectTab, onLogout, userName, userEmail }: HeaderProps) {
  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "Minh Anh");
  const initials = displayName.slice(0, 2).toUpperCase();
  return (
    <header className="sticky top-0 z-40 h-16 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
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
                    ? "border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold text-indigo-950 dark:text-indigo-300"
                    : "border-b-2 border-transparent font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Cột 3 (Phải): Nút chuyển đổi Theme, Khu vực thông báo & Avatar */}
        <div className="flex flex-1 items-center justify-end gap-2.5 sm:gap-3 shrink-0">
          {/* Nút chuyển đổi Sáng / Tối */}
          <ThemeToggle />

          {/* Nút thông báo */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-2xs"
            aria-label="Thông báo"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-800" />
          </button>

          {/* User profile & Đăng xuất */}
          <div className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 shadow-2xs">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
              {initials}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[120px]" title={displayName}>{displayName}</p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 leading-none">Học viên</p>
            </div>
            <button
              onClick={onLogout}
              className="ml-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors duration-150 p-1 cursor-pointer"
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
