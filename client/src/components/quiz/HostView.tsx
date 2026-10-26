import {
  LiveExam,
  LeaderboardRow,
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
    <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-8">
      <button
        onClick={onBack}
        className="text-sm font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70 hover:text-[#0b7a75] dark:hover:text-[#2dd4bf] transition-colors cursor-pointer inline-flex items-center gap-1.5"
      >
        <span>← Về trang bài kiểm tra</span>
      </button>

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-md p-6 bg-white dark:bg-[#1b1b26] border-2 border-[#111118] dark:border-[#2a2a3a] shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000]"
      >
        <div>
          <span
            className={`rounded-sharp px-3 py-1 text-xs font-normal border border-[#111118] ${
              running ? "bg-[#16ab59] text-white" : "bg-[#e1edff] text-[#111118]"
            }`}
          >
            {running ? "Đang diễn ra" : "Đã kết thúc"}
          </span>
          <h1 className="mt-2 text-2xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">{live.set.title}</h1>
          <p className="mt-1 text-sm font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
            Mã tham gia: <b className="tracking-widest font-mono text-base text-[#0b7a75] dark:text-[#2dd4bf]">{live.code}</b>
            <button
              onClick={() => navigator.clipboard?.writeText(live.code)}
              className="ml-3 rounded-sm px-3 py-1 text-xs font-normal border border-[#111118] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#111118] hover:bg-[#d0e2ff] cursor-pointer transition-all"
            >
              Sao chép
            </button>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">Thời gian còn lại</div>
          <div className="text-4xl font-normal font-mono tabular-nums text-[#111118] dark:text-[#f0f6ff]">{fmt(remaining)}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ["Người tham gia", rows.length],
          ["Đã làm xong", `${done}/${rows.length}`],
          ["Điểm trung bình", avg.toFixed(1)],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-md bg-white dark:bg-[#1b1b26] p-5 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
            <div className="text-3xl font-normal font-mono tabular-nums text-[#111118] dark:text-[#f0f6ff]">{v}</div>
            <div className="mt-1 text-sm font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-md bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
        <h2 className="mb-4 text-xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">Bảng điểm trực tiếp</h2>
        <Leaderboard rows={rows} total={total} />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {running && !rows.some((r) => r.me) && (
          <button onClick={onTry} className={BTN_OUT}>
            Làm bài như thí sinh
          </button>
        )}
        {running ? (
          <button
            onClick={onEnd}
            className="rounded-sm h-12 px-6 bg-[#000000] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#0b7a75] text-base font-normal cursor-pointer active:translate-y-[2px] transition-all"
          >
            Kết thúc sớm
          </button>
        ) : (
          <button
            onClick={onClose}
            className="rounded-pill h-12 px-6 bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#111118] text-base font-normal cursor-pointer active:translate-y-[2px] transition-all"
          >
            Đóng bài kiểm tra →
          </button>
        )}
      </div>
    </div>
  );
}
