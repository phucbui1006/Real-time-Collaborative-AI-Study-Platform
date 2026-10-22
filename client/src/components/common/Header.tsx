import { LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-40 h-16 w-full bg-white dark:bg-[#1b1b26] border-b border-[#e1edff] dark:border-[#2a2a3a] transition-colors duration-150">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
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

        {/* Cột 2 (Giữa): 3 Mục điều hướng */}
        <nav className="hidden h-16 items-center gap-8 md:flex shrink-0" aria-label="Điều hướng chính">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`h-16 inline-flex items-center px-1 text-base transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "border-b-2 border-[#0b7a75] dark:border-[#2dd4bf] font-normal text-[#0b7a75] dark:text-[#2dd4bf]"
                    : "border-b-2 border-transparent font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70 hover:text-[#111118] dark:hover:text-[#f0f6ff]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Cột 3 (Phải): Nút chuyển đổi Theme & Avatar */}
        <div className="flex flex-1 items-center justify-end gap-3 shrink-0">
          <ThemeToggle />

          {/* User profile & Đăng xuất */}
          <div className="flex items-center gap-2 rounded-[5000px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] px-3 py-1 text-[#111118] dark:text-[#f0f6ff] shadow-[0_1px_0_0_#111118] dark:shadow-[0_1px_0_0_#000000]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#91d8ec] text-xs font-normal text-[#111118] border border-[#111118]">
              {initials}
            </span>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-normal text-[#111118] dark:text-[#f0f6ff] leading-none truncate max-w-[120px]" title={displayName}>{displayName}</p>
            </div>
            <button
              onClick={onLogout}
              className="ml-1 text-[#111118]/60 dark:text-[#f0f6ff]/60 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 cursor-pointer"
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
