import { useState } from "react";
import {
  LiveExam,
  MyExamState,
  LeaderboardRow,
  LETTERS,
  fmt,
} from "../../services/examService";
import { Leaderboard } from "./Leaderboard";
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 px-6 py-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {live.set.subject}
          </span>
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
            {live.set.title}
          </h1>
        </div>

        {/* Countdown Timer with tabular-nums and JetBrains Mono */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-semibold font-mono tabular-nums transition-colors ${
            urgent
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse"
              : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          }`}
        >
          <Clock className={`h-4 w-4 ${urgent ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`} strokeWidth={1.75} />
          <span>{fmt(remaining)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <section className="col-span-12 lg:col-span-7 min-w-0 rounded-xl bg-white dark:bg-slate-900 p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          {/* Question pagination pills */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {qs.map((x, i) => {
              const a = mine.answers[x.id];
              const isAnswered = a !== undefined;
              const isCorrect = a === x.correct;
              const isCurrent = i === qi;

              return (
                <button
                  key={x.id}
                  onClick={() => setQi(i)}
                  aria-label={`Câu ${i + 1}`}
                  className={`h-8 w-8 rounded-md text-xs font-semibold font-mono tabular-nums transition-all cursor-pointer ${
                    isCurrent
                      ? "ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-1 dark:ring-offset-slate-900 z-10"
                      : ""
                  } ${
                    !isAnswered
                      ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      : isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              CÂU HỎI {qi + 1} / {qs.length}
            </span>
          </div>

          <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-50 leading-relaxed tracking-tight">
            {q.text}
          </h2>

          {/* 4 Đáp án sử dụng Tactile Quiz Answer Button Token (Mục 3.3 quy chuẩn) */}
          <div className="mt-6 space-y-3">
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
                  className={`flex w-full items-center gap-3.5 rounded-lg p-3.5 text-left text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed ${
                    ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-500 shadow-none"
                      : bad
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-2 border-rose-500 shadow-none"
                      : "bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 shadow-xs hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-slate-800 active:translate-y-[2px]"
                  }`}
                  style={{
                    opacity: chosen !== undefined && !picked ? 0.6 : 1,
                  }}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold shrink-0 font-mono ${
                      ok
                        ? "bg-emerald-500 text-white"
                        : bad
                        ? "bg-rose-500 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    {LETTERS[j]}
                  </span>
                  <span className="flex-1 leading-normal">{o}</span>
                  {ok && (
                    <span className="inline-flex items-center gap-1 font-semibold text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> Đúng
                    </span>
                  )}
                  {bad && (
                    <span className="inline-flex items-center gap-1 font-semibold text-xs text-rose-700 dark:text-rose-400">
                      <XCircle className="h-4 w-4" strokeWidth={2} /> Sai
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {chosen !== undefined && (
            <div
              className={`mt-4 rounded-md p-3 text-xs font-medium border ${
                chosen === q.correct
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              }`}
            >
              {chosen === q.correct
                ? "Chính xác! Câu trả lời đã được ghi nhận."
                : "Chưa chính xác. Mỗi câu hỏi chỉ được chọn đáp án một lần."}
            </div>
          )}
          {locked && (
            <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              Đã hết thời gian làm bài kiểm tra.
            </p>
          )}

          {/* Bottom navigation */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={() => setQi((i) => Math.max(0, i - 1))}
              disabled={qi === 0}
              className="inline-flex items-center gap-1 h-9 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              <span>Câu trước</span>
            </button>

            {qi < qs.length - 1 ? (
              <button
                onClick={() => setQi((i) => i + 1)}
                className="inline-flex items-center gap-1 h-9 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all cursor-pointer shadow-xs active:translate-y-[1px]"
              >
                <span>Câu tiếp</span>
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="inline-flex items-center gap-1 h-9 px-4 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium transition-all cursor-pointer shadow-xs active:translate-y-[1px]"
              >
                {answered < qs.length && !locked
                  ? `Nộp bài (còn ${qs.length - answered} câu)`
                  : "Xem kết quả"}
              </button>
            )}
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-3 min-w-0 space-y-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Điểm số hiện tại
            </div>
            <div className="mt-2 text-3xl font-mono font-bold text-slate-900 dark:text-slate-50 tabular-nums">
              {me.score.toFixed(1)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Hạng <strong className="text-slate-900 dark:text-slate-100">{me.rank}</strong>/{rows.length} · {me.correct}/{qs.length} câu đúng
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <h3 className="mb-3 text-xs font-semibold text-slate-900 dark:text-slate-100 tracking-tight uppercase">
              Bảng xếp hạng trực tiếp
            </h3>
            <Leaderboard rows={rows} total={qs.length} limit={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}
