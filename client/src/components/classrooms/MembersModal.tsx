import { useEffect, useState } from "react";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách thành viên trong phòng"
        className="w-full rounded-3xl p-6 shadow-2xl transition-all"
        style={{ maxWidth: 440, background: "#141a3d", color: "#fff" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Thành viên trong phòng</h2>
            <p className="mt-1 text-xs text-slate-400">
              Hiện có <strong className="text-emerald-400">{onlineCount}</strong> / {members.length} người đang trực tuyến
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="text-xl leading-none text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm thành viên…"
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-all"
          />
        </div>

        {/* Members list */}
        <ul className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {filteredMembers.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-2xl p-3 ring-1 ring-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-xs"
                    style={{ background: m.avatarColor }}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#141a3d] ${
                      m.isOnline ? "bg-emerald-500" : "bg-slate-500"
                    }`}
                    title={m.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-sm text-white flex items-center gap-2">
                    <span>{m.name}</span>
                    {m.role === "host" && (
                      <span className="rounded-full bg-violet-600/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-100">
                        Chủ phòng
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {m.isOnline ? (
                      <span className="text-emerald-400">Đang hoạt động</span>
                    ) : (
                      <span>Ngoại tuyến</span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}

          {filteredMembers.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              Không tìm thấy thành viên phù hợp.
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}
