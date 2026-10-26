import { useState, useMemo } from "react";
import {
  Users,
  CalendarCheck,
  ChatsCircle,
  MagnifyingGlass,
  Copy,
  Check,
  Plus,
  SignIn,
  X,
  Clock,
  Hash,
  Function as FunctionIcon,
  TreeStructure,
  Kanban,
  Network,
  ArrowRight,
} from "@phosphor-icons/react";
import { RoomItem } from "../../services/roomService";

interface RoomHistoryProps {
  rooms: RoomItem[];
  onRejoin: (room: RoomItem) => void;
  onRemove: (id: number) => void;
  onOpenJoin: () => void;
  onOpenCreate: () => void;
  userName?: string;
}

// Màu trang trí SuperHi theo môn học (cố định)
const SUBJECT_COLORS: Record<string, { bg: string; name: string; icon: typeof FunctionIcon }> = {
  math: { bg: "#ffda00", name: "Toán đại cương", icon: FunctionIcon },
  cs: { bg: "#91d8ec", name: "Khoa học máy tính", icon: TreeStructure },
  project: { bg: "#ffbac4", name: "Đồ án nhóm", icon: Kanban },
  network: { bg: "#ff4141", name: "Mạng máy tính", icon: Network },
};

function getSubjectInfo(name: string, index: number) {
  const lower = name.toLowerCase();
  if (lower.includes("toán") || lower.includes("giải tích") || lower.includes("đại số")) {
    return SUBJECT_COLORS.math;
  }
  if (lower.includes("mạng") || lower.includes("an toàn") || lower.includes("bảo mật")) {
    return SUBJECT_COLORS.network;
  }
  if (lower.includes("đồ án") || lower.includes("nhóm") || lower.includes("kỹ thuật phần mềm")) {
    return SUBJECT_COLORS.project;
  }
  if (lower.includes("cấu trúc") || lower.includes("giải thuật") || lower.includes("web") || lower.includes("lập trình") || lower.includes("ai")) {
    return SUBJECT_COLORS.cs;
  }
  const fallbackKeys = ["math", "cs", "project", "network"] as const;
  return SUBJECT_COLORS[fallbackKeys[index % fallbackKeys.length]];
}

export function RoomHistory({
  rooms,
  onRejoin,
  onRemove,
  onOpenJoin,
  onOpenCreate,
  userName = "Minh Anh",
}: RoomHistoryProps) {
  const [q, setQ] = useState("");
  const [currentFilter, setCurrentFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filtered = useMemo(() => {
    return rooms.filter((r, idx) => {
      const query = q.toLowerCase().trim();
      const matchesSearch = !query || (r.name + r.code).toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (currentFilter === "all") return true;
      if (currentFilter === "online") return idx % 2 === 0; // mẫu: phòng chẵn có người online
      const subject = getSubjectInfo(r.name, idx);
      if (currentFilter === "math") return subject.name === "Toán đại cương";
      if (currentFilter === "cs") return subject.name === "Khoa học máy tính";
      if (currentFilter === "project") return subject.name === "Đồ án nhóm";
      return true;
    });
  }, [rooms, q, currentFilter]);

  return (
    <div className="relative w-full max-w-[1200px] mx-auto space-y-12">
      {/* Decorative shapes behind content (SuperHi flat paper-cut) */}
      <div
        className="pointer-events-none fixed -top-24 -right-28 w-[420px] h-[420px] bg-[#ffda00] opacity-80 dark:opacity-25 z-0"
        style={{
          clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
          transform: "rotate(12deg)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -bottom-28 -left-28 w-[440px] h-[440px] bg-[#ffbac4] opacity-80 dark:opacity-25 z-0"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)",
          transform: "rotate(-10deg)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-10">
        {/* ==========================================================================
            HERO / GREETING SECTION
           ========================================================================== */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16ab59] border border-[#111118]" />
              <span className="text-xs font-normal tracking-wide text-[#111118]/70 dark:text-[#f0f6ff]/70 uppercase">
                XIN CHÀO, {userName.toUpperCase()}
              </span>
            </div>
            <h1 className="mt-1 text-3xl sm:text-[42px] font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]">
              Phòng học của tôi
            </h1>
            <p className="mt-1 text-base font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75">
              Các phòng học nhóm bạn đã tạo hoặc từng tham gia gần đây.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            <button
              onClick={onOpenJoin}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-sm bg-[#000000] dark:bg-[#2a2a3a] text-white dark:text-[#f0f6ff] text-lg font-normal border border-[#111118] dark:border-[#2dd4bf] shadow-[0_4px_0_0_#0b7a75] dark:shadow-[0_4px_0_0_#2dd4bf] active:translate-y-[2px] transition-transform cursor-pointer"
            >
              <SignIn size={22} weight="regular" />
              <span>Tham gia bằng mã</span>
            </button>
            <button
              onClick={onOpenCreate}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] dark:bg-[#2dd4bf] dark:text-[#111118] text-white text-lg font-normal border border-[#111118] shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] active:translate-y-[2px] transition-transform cursor-pointer"
            >
              <Plus size={22} weight="regular" />
              <span>Tạo phòng học mới →</span>
            </button>
          </div>
        </section>

        {/* ==========================================================================
            3 CHỈ SỐ NHANH / YẾU TỐ CON NGƯỜI
           ========================================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Thống kê học tập">
          <div className="bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] rounded-md p-5 flex items-center gap-4 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
            <div className="w-12 h-12 rounded-sm bg-[#ffda00] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0">
              <Users size={24} weight="regular" />
            </div>
            <div>
              <div className="text-sm text-[#111118]/75 dark:text-[#f0f6ff]/75">Bạn học đang online</div>
              <div className="text-lg font-normal text-[#111118] dark:text-[#f0f6ff] mt-0.5">3 bạn đang học nhóm</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] rounded-md p-5 flex items-center gap-4 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
            <div className="w-12 h-12 rounded-sm bg-[#91d8ec] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0">
              <CalendarCheck size={24} weight="regular" />
            </div>
            <div>
              <div className="text-sm text-[#111118]/75 dark:text-[#f0f6ff]/75">Lịch học sắp tới</div>
              <div className="text-lg font-normal text-[#111118] dark:text-[#f0f6ff] mt-0.5">19:30 tối nay · Giải tích 1</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] rounded-md p-5 flex items-center gap-4 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
            <div className="w-12 h-12 rounded-sm bg-[#ffbac4] text-[#111118] border border-[#111118] flex items-center justify-center shrink-0">
              <ChatsCircle size={24} weight="regular" />
            </div>
            <div>
              <div className="text-sm text-[#111118]/75 dark:text-[#f0f6ff]/75">Nhóm đồ án & môn học</div>
              <div className="text-lg font-normal text-[#111118] dark:text-[#f0f6ff] mt-0.5">{rooms.length} phòng đang tham gia</div>
            </div>
          </div>
        </section>

        {/* ==========================================================================
            SEARCH & FILTER CONTROLS BAR
           ========================================================================== */}
        <section className="bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] rounded-md p-6 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass
                size={20}
                weight="regular"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#111118]/60 dark:text-[#f0f6ff]/60 pointer-events-none"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên môn, mã phòng 6 số…"
                className="w-full h-12 pl-12 pr-5 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a] text-[#111118] dark:text-[#f0f6ff] text-base placeholder:text-[#111118]/50 dark:placeholder:text-[#f0f6ff]/50 outline-none focus:border-[#0b7a75] dark:focus:border-[#2dd4bf] focus:ring-2 focus:ring-[#0b7a75] dark:focus:ring-[#2dd4bf] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              {[
                { id: "all", label: `Tất cả (${rooms.length})` },
                { id: "online", label: "Đang online" },
                { id: "math", label: "Toán đại cương" },
                { id: "cs", label: "Khoa học máy tính" },
                { id: "project", label: "Đồ án nhóm" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentFilter(tab.id)}
                  className={`h-10 px-4 text-base font-normal whitespace-nowrap transition-colors cursor-pointer ${
                    currentFilter === tab.id
                      ? "rounded-pill bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]"
                      : "rounded-[8px] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] hover:bg-[#d0e2ff] dark:hover:bg-[#2e2e42]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================================================================
            ROOM CARDS GRID
           ========================================================================== */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#1b1b26] border border-dashed border-[#e1edff] dark:border-[#2a2a3a] rounded-md p-12 text-center shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
            <p className="text-base text-[#111118]/70 dark:text-[#f0f6ff]/70">
              {rooms.length === 0
                ? 'Bạn chưa tham gia phòng nào. Bấm "Tạo phòng học mới" hoặc "Tham gia bằng mã" để bắt đầu nhé!'
                : "Không tìm thấy phòng phù hợp với từ khoá tìm kiếm."}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={onOpenCreate}
                className="h-10 px-5 rounded-pill bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] text-base font-normal shadow-[0_3px_0_0_#111118] active:translate-y-[1px] cursor-pointer"
              >
                Tạo phòng học mới →
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((r, idx) => {
              const subject = getSubjectInfo(r.name, idx);
              const SubjectIcon = subject.icon;
              const isOnline = idx % 2 === 0;

              return (
                <article
                  key={r.id}
                  className="bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] rounded-md p-6 shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_#111118] dark:hover:shadow-[0_4px_0_0_#000000] transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Icon môn học & Tiêu đề */}
                    <div className="flex items-start gap-4">
                      <div
                        className="w-13 h-13 rounded-sm flex items-center justify-center text-[#111118] border border-[#111118] shadow-[0_2px_0_0_#111118] shrink-0"
                        style={{ backgroundColor: subject.bg }}
                      >
                        <SubjectIcon size={26} weight="regular" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-sharp text-xs font-normal border border-[#111118] text-[#111118]"
                            style={{ backgroundColor: subject.bg }}
                          >
                            {subject.name}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sharp bg-[#e1edff] dark:bg-[#242436] text-xs text-[#111118] dark:text-[#f0f6ff]">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOnline ? "bg-[#16ab59]" : "bg-slate-400"
                              }`}
                            />
                            {isOnline ? "2 bạn đang học" : "Chưa có ai online"}
                          </span>
                        </div>
                        <h2 className="text-xl font-normal text-[#111118] dark:text-[#f0f6ff] line-clamp-2 leading-snug">
                          {r.name}
                        </h2>
                      </div>

                      <button
                        onClick={() => onRemove(r.id)}
                        aria-label={`Xoá ${r.name} khỏi danh sách`}
                        className="w-8 h-8 rounded-sm flex items-center justify-center text-[#111118]/60 dark:text-[#f0f6ff]/60 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                      >
                        <X size={16} weight="regular" />
                      </button>
                    </div>

                    {/* Khối chi tiết: Mã phòng & Lịch học */}
                    <div className="mt-4 bg-[#e1edff] dark:bg-[#242436] rounded-[4px] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-sm text-[#111118]/85 dark:text-[#f0f6ff]/85">
                          <Hash size={16} weight="regular" /> Mã phòng:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base tracking-[0.18em] bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] px-3 py-1 rounded-[4px] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_1px_0_0_#111118] dark:shadow-[0_1px_0_0_#000000]">
                            {r.code}
                          </span>
                          <button
                            onClick={(e) => handleCopyCode(r.code, e)}
                            className="w-8 h-8 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] text-[#111118] dark:text-[#f0f6ff] flex items-center justify-center shadow-[0_1px_0_0_#111118] hover:bg-[#f0f6ff] active:translate-y-[1px] transition-transform cursor-pointer"
                            title="Sao chép mã phòng"
                          >
                            {copiedCode === r.code ? (
                              <Check size={16} weight="regular" className="text-[#16ab59]" />
                            ) : (
                              <Copy size={16} weight="regular" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-[#111118]/80 dark:text-[#f0f6ff]/80">
                        <Clock size={16} weight="regular" />
                        <span>Vào gần nhất: {r.lastVisit || "Vừa xong"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Avatars thành viên & Nút vào phòng */}
                  <div className="mt-5 pt-4 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between gap-4">
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-[#91d8ec] text-[#111118] border-2 border-white dark:border-[#1b1b26] flex items-center justify-center text-xs shadow-[0_1px_0_0_#111118]">
                          {userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#ffda00] text-[#111118] border-2 border-white dark:border-[#1b1b26] flex items-center justify-center text-xs shadow-[0_1px_0_0_#111118]">
                          TD
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#ffbac4] text-[#111118] border-2 border-white dark:border-[#1b1b26] flex items-center justify-center text-xs shadow-[0_1px_0_0_#111118]">
                          TT
                        </div>
                      </div>
                      <span className="ml-3 text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70">
                        +3 bạn khác
                      </span>
                    </div>

                    <button
                      onClick={() => onRejoin(r)}
                      className="inline-flex items-center gap-1.5 h-10 px-5 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] dark:bg-[#2dd4bf] dark:text-[#111118] text-white text-sm font-normal border border-[#111118] shadow-[0_3px_0_0_#111118] dark:shadow-[0_3px_0_0_#000000] active:translate-y-[1px] transition-transform cursor-pointer"
                    >
                      <span>Vào lại</span>
                      <ArrowRight size={14} weight="regular" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
