import {
  LiveExam,
  LeaderboardRow,
  DARK,
  PURPLE,
  BTN,
  BTN_OUT,
  fmt,
} from "../../services/examService";
import { Leaderboard } from "./Leaderboard";

interface HostViewProps {
  live: LiveExam;
  rows: LeaderboardRow[];
  remaining: number;
  onBack: () => void;
  onEnd: () => void;
  onClose: () => void;
  onTry: () => void;
}

export function HostView({ live, rows, remaining, onBack, onEnd, onClose, onTry }: HostViewProps) {
  const total = live.set.questions.length;
  const running = live.status === "running";
  const avg = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
  const done = rows.filter((r) => r.answered === total).length;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8">
      <button
        onClick={onBack}
        className="text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
      >
        ← Về trang bài kiểm tra
      </button>
      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6 shadow-lg"
        style={{ background: DARK, color: "#fff" }}
      >
        <div>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: running ? "#16a34a" : "#64748b" }}
          >
            {running ? "Đang diễn ra" : "Đã kết thúc"}
          </span>
          <h1 className="mt-2 text-2xl font-bold">{live.set.title}</h1>
          <p className="mt-1 text-sm text-slate-300">
            Mã tham gia: <b className="tracking-widest text-white text-base">{live.code}</b>
            <button
              onClick={() => navigator.clipboard?.writeText(live.code)}
              className="ml-3 text-xs text-indigo-300 underline cursor-pointer hover:text-indigo-200"
            >
              Sao chép
            </button>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-300">Thời gian còn lại</div>
          <div className="text-4xl font-bold tabular-nums">{fmt(remaining)}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Người tham gia", rows.length],
          ["Đã làm xong", `${done}/${rows.length}`],
          ["Điểm trung bình", avg.toFixed(1)],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="text-2xl font-bold text-slate-900">{v}</div>
            <div className="mt-1 text-sm text-slate-500">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Bảng điểm trực tiếp</h2>
        <Leaderboard rows={rows} total={total} />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {running && !rows.some((r) => r.me) && (
          <button onClick={onTry} className={BTN_OUT}>
            Làm bài như thí sinh
          </button>
        )}
        {running ? (
          <button onClick={onEnd} className={BTN} style={{ background: "#334155" }}>
            Kết thúc sớm
          </button>
        ) : (
          <button onClick={onClose} className={BTN} style={{ background: PURPLE }}>
            Đóng bài kiểm tra
          </button>
        )}
      </div>
    </div>
  );
}
