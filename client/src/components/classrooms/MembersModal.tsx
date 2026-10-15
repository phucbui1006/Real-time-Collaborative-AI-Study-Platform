import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";

export type RoomMember = {
  id: number;
  name: string;
  role: "host" | "member";
  avatarColor: string;
  isOnline: boolean;
};

interface MembersModalProps {
  open: boolean;
  onClose: () => void;
  members: RoomMember[];
}

export function MembersModal({ open, onClose, members }: MembersModalProps) {
  const [search, setSearch] = useState("");

  // Close modal on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );
  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách thành viên trong phòng"
        className="w-full max-w-md rounded-lg bg-white p-6 border border-slate-200/90 shadow-xl transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Thành viên trong phòng
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              Hiện có <strong className="text-emerald-600 font-semibold">{onlineCount}</strong> / {members.length} người đang trực tuyến
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Search input */}
        <div className="mt-4 relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên thành viên…"
            className="w-full h-9 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
          />
        </div>

        {/* Members list */}
        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {filteredMembers.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md p-2.5 border border-slate-200/80 bg-white hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white shadow-2xs"
                    style={{ background: m.avatarColor }}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                      m.isOnline ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    title={m.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-xs text-slate-900 flex items-center gap-2">
                    <span className="truncate">{m.name}</span>
                    {m.role === "host" && (
                      <span className="rounded px-1.5 py-0.2 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        Chủ phòng
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {m.isOnline ? (
                      <span className="text-emerald-600 font-medium">Đang hoạt động</span>
                    ) : (
                      <span>Ngoại tuyến</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}

          {filteredMembers.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Không tìm thấy thành viên phù hợp.
            </div>
          )}
        </ul>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
