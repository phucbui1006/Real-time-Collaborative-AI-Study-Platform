import { useState, useMemo } from "react";
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
          <p className="text-xs font-semibold tracking-widest text-sky-600 uppercase">
            XIN CHÀO, MINH ANH
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Phòng học của bạn
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vào lại phòng cũ hoặc tham gia phòng mới bằng mã 6 số.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenJoin}
            className="rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors shadow-xs cursor-pointer"
          >
            Tham gia phòng
          </button>
          <button
            onClick={onOpenCreate}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
            style={{ background: "#7c3aed" }}
          >
            + Tạo phòng học
          </button>
        </div>
      </div>

      {/* Room list section */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Phòng đã tham gia</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc mã…"
            className="w-full sm:w-64 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            {rooms.length === 0
              ? 'Bạn chưa tham gia phòng nào. Bấm "Tham gia phòng" hoặc "Tạo phòng học" để bắt đầu.'
              : "Không tìm thấy phòng phù hợp."}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-xs"
                  style={{ background: r.color }}
                >
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-900 text-base">{r.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Mã {r.code} · Vào gần nhất: {r.lastVisit}
                  </div>
                </div>
                <button
                  onClick={() => onRejoin(r)}
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-white hover:border-slate-400 transition-colors cursor-pointer"
                >
                  Vào lại
                </button>
                <button
                  onClick={() => onRemove(r.id)}
                  aria-label={`Xoá ${r.name} khỏi lịch sử`}
                  className="px-2 text-slate-300 hover:text-rose-500 transition-colors text-lg cursor-pointer"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
