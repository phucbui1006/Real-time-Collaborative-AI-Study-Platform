import { useState } from "react";
import {
  LiveExam,
  MyExamState,
  LeaderboardRow,
  DARK,
  PURPLE,
  BTN,
  BTN_OUT,
  LETTERS,
  fmt,
} from "../../services/examService";
import { Leaderboard } from "./Leaderboard";

interface TakeViewProps {
  live: LiveExam;
  mine: MyExamState;
  rows: LeaderboardRow[];
  remaining: number;
  onAnswer: (qid: string, idx: number) => void;
  onFinish: () => void;
}

export function TakeView({ live, mine, rows, remaining, onAnswer, onFinish }: TakeViewProps) {
  const qs = live.set.questions;
  const [qi, setQi] = useState(0);
  const q = qs[qi];
  const chosen = mine.answers[q.id];
  const answered = Object.keys(mine.answers).length;
  const me = rows.find((r) => r.me) || { score: 0, rank: 1, correct: 0 };
  const locked = live.status !== "running";
  const urgent = remaining <= 30;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8">
      <div
        className="flex items-center justify-between rounded-3xl px-6 py-4 shadow-lg"
        style={{ background: DARK, color: "#fff" }}
      >
        <div>
          <div className="text-xs text-slate-300">{live.set.subject}</div>
          <div className="font-semibold text-lg">{live.set.title}</div>
        </div>
        <div
          className="text-3xl font-bold tabular-nums transition-colors"
          style={{ color: urgent ? "#fca5a5" : "#fff" }}
        >
          {fmt(remaining)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-10 gap-6">
        <section className="col-span-12 lg:col-span-7 min-w-0 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex flex-wrap gap-2">
            {qs.map((x, i) => {
              const a = mine.answers[x.id];
              const bg = a === undefined ? "#fff" : a === x.correct ? "#dcfce7" : "#fee2e2";
              return (
                <button
                  key={x.id}
                  onClick={() => setQi(i)}
                  aria-label={`Câu ${i + 1}`}
                  className="h-9 w-9 rounded-full text-sm font-semibold text-slate-900 cursor-pointer transition-all"
                  style={{
                    background: bg,
                    border: i === qi ? `2px solid ${PURPLE}` : "1px solid #cbd5e1",
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-slate-400">
            CÂU {qi + 1} / {qs.length}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{q.text}</h2>

          <div className="mt-5 space-y-3">
            {q.options.map((o, j) => {
              if (!o.trim()) return null;
              const picked = chosen === j;
              const ok = picked && j === q.correct;
              const bad = picked && j !== q.correct;
              return (
                <button
                  key={j}
                  disabled={chosen !== undefined || locked}
                  onClick={() => onAnswer(q.id, j)}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-slate-900 transition-all cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background: ok ? "#dcfce7" : bad ? "#fee2e2" : "#fff",
                    border: `1.5px solid ${ok ? "#16a34a" : bad ? "#dc2626" : "#cbd5e1"}`,
                    opacity: chosen !== undefined && !picked ? 0.55 : 1,
                  }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0"
                    style={{ background: "#f1f5f9" }}
                  >
                    {LETTERS[j]}
                  </span>
                  <span className="flex-1">{o}</span>
                  {ok && <span className="font-semibold text-emerald-700">✓ Đúng</span>}
                  {bad && <span className="font-semibold text-rose-700">✗ Sai</span>}
                </button>
              );
            })}
          </div>

          {chosen !== undefined && (
            <p
              className="mt-4 text-sm font-medium"
              style={{ color: chosen === q.correct ? "#15803d" : "#b91c1c" }}
            >
              {chosen === q.correct ? "Chính xác!" : "Chưa đúng. Đáp án đã chọn không thể đổi."}
            </p>
          )}
          {locked && <p className="mt-4 text-sm font-medium text-slate-500">Đã hết thời gian làm bài.</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setQi((i) => Math.max(0, i - 1))}
              disabled={qi === 0}
              className={BTN_OUT + " disabled:opacity-40"}
            >
              ‹ Câu trước
            </button>
            {qi < qs.length - 1 ? (
              <button
                onClick={() => setQi((i) => i + 1)}
                className={BTN}
                style={{ background: PURPLE }}
              >
                Câu tiếp ›
              </button>
            ) : (
              <button onClick={onFinish} className={BTN} style={{ background: PURPLE }}>
                {answered < qs.length && !locked
                  ? `Nộp bài (còn ${qs.length - answered} câu)`
                  : "Xem kết quả"}
              </button>
            )}
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-3 min-w-0 space-y-4">
          <div className="rounded-3xl p-5 text-center shadow-lg" style={{ background: DARK, color: "#fff" }}>
            <div className="text-xs text-slate-300">Điểm hiện tại</div>
            <div className="text-4xl font-bold">{me.score.toFixed(1)}</div>
            <div className="mt-1 text-sm text-slate-300">
              Hạng {me.rank}/{rows.length} · {me.correct}/{qs.length} câu đúng
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Xếp hạng</h3>
            <Leaderboard rows={rows} total={qs.length} limit={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}
