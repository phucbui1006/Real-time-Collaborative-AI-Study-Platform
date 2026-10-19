import { useState, useMemo } from "react";
import { X, Plus, LogIn } from "lucide-react";
import { RoomItem } from "../../services/roomService";

interface RoomHistoryProps {
  rooms: RoomItem[];
  onRejoin: (room: RoomItem) => void;
  onRemove: (id: number) => void;
  onOpenJoin: () => void;
  onOpenCreate: () => void;
}

export function RoomHistory({
  rooms,
  onRejoin,
  onRemove,
  onOpenJoin,
  onOpenCreate,
}: RoomHistoryProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => rooms.filter((r) => (r.name + r.code).toLowerCase().includes(q.toLowerCase())),
    [rooms, q]
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            XIN CHÀO, MINH ANH
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Phòng học của bạn
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vào lại phòng cũ hoặc tham gia phòng mới bằng mã 6 số.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenJoin}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium shadow-2xs transition-colors duration-150 cursor-pointer"
          >
            <LogIn className="h-4 w-4" strokeWidth={1.75} />
            Tham gia phòng
          </button>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-500/20 active:translate-y-[1px] text-sm font-medium transition-all duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Tạo phòng học
          </button>
        </div>
      </div>

      {/* Room list section */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Phòng đã tham gia</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc mã…"
            className="h-9 w-full sm:w-64 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors duration-150"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center text-sm text-slate-400">
            {rooms.length === 0
              ? 'Bạn chưa tham gia phòng nào. Bấm "Tham gia phòng" hoặc "Tạo phòng học" để bắt đầu.'
              : "Không tìm thấy phòng phù hợp."}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3.5 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all shadow-2xs"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white shadow-2xs"
                  style={{ background: r.color }}
                >
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-900 dark:text-slate-100 text-sm">{r.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Mã <span className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-700 dark:text-indigo-400 border border-slate-200 dark:border-slate-800">{r.code}</span> · Vào gần nhất: {r.lastVisit}
                  </div>
                </div>
                <button
                  onClick={() => onRejoin(r)}
                  className="h-8 px-3 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500/25 text-xs font-medium shadow-2xs transition-colors duration-150 cursor-pointer"
                >
                  Vào lại
                </button>
                <button
                  onClick={() => onRemove(r.id)}
                  aria-label={`Xoá ${r.name} khỏi lịch sử`}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

