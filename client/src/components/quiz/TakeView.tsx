import { useState } from "react";
import {
  LiveExam,
  MyExamState,
  LeaderboardRow,
  LETTERS,
  fmt,
} from "../../services/examService";
import { Leaderboard } from "./Leaderboard";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

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

  const startedAt = live.startedAt || (live.endAt - live.minutes * 60000);
  const lateSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const isLate = lateSeconds >= 60 && remaining > 0;
  const lateMinutes = Math.floor(lateSeconds / 60);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 sm:px-8 py-8">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-md bg-white dark:bg-[#1b1b26] px-6 py-4 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
        <div>
          <span className="text-xs font-normal uppercase tracking-wider text-[#111118]/70 dark:text-[#f0f6ff]/70">
            {live.set.subject}
          </span>
          <h1 className="text-xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">
            {live.set.title}
          </h1>
        </div>

        {/* Countdown Timer with tabular-nums and JetBrains Mono */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-normal font-mono tabular-nums transition-colors ${
            urgent
              ? "bg-[#ff4141] text-white border-2 border-[#111118] shadow-[0_2px_0_0_#111118] animate-pulse"
              : "bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] border border-[#111118] shadow-[0_2px_0_0_#111118]"
          }`}
        >
          <Clock className="h-4 w-4" strokeWidth={1.75} />
          <span>{fmt(remaining)}</span>
        </div>
      </div>

      {/* Thông báo nếu thí sinh vào phòng thi muộn */}
      {isLate && (
        <div className="flex items-center gap-2 rounded-sm bg-[#ffda00]/20 border border-[#111118] dark:border-[#ffda00] text-[#111118] dark:text-[#f0f6ff] px-4 py-2.5 text-xs font-normal shadow-[0_2px_0_0_#111118]">
          <span className="font-semibold text-[#111118] dark:text-[#ffda00]">⚠️ Lưu ý vào muộn:</span>
          <span>
            Bài kiểm tra đã mở được {lateMinutes} phút. Thời gian làm bài của bạn được đồng bộ theo phòng thi và chỉ còn <strong>{fmt(remaining)}</strong> trước khi hết giờ.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <section className="col-span-12 lg:col-span-7 min-w-0 rounded-md bg-white dark:bg-[#1b1b26] p-6 sm:p-7 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
          {/* Question pagination pills */}
          <div className="mb-6 flex flex-wrap gap-2">
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
                  className={`h-9 w-9 rounded-full text-xs font-normal font-mono tabular-nums transition-all cursor-pointer border-2 border-[#111118] shadow-[0_2px_0_0_#111118] flex items-center justify-center ${
                    isCurrent ? "ring-2 ring-[#0b7a75] ring-offset-2" : ""
                  } ${
                    !isAnswered
                      ? "bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] hover:bg-[#d0e2ff]"
                      : isCorrect
                      ? "bg-[#16ab59] text-white"
                      : "bg-[#ff4141] text-white"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-normal tracking-wider text-[#111118]/70 dark:text-[#f0f6ff]/70 font-mono tabular-nums">
              CÂU HỎI {qi + 1} / {qs.length}
            </span>
          </div>

          <h2 className="mt-3 text-lg font-normal text-[#111118] dark:text-[#f0f6ff] leading-relaxed tracking-[-0.01em]">
            {q.text}
          </h2>

          {/* 4 Đáp án sử dụng Tactile Quiz Answer Button Token */}
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
                  className={`flex w-full items-center gap-3.5 rounded-sm p-4 text-left text-sm font-normal transition-all cursor-pointer disabled:cursor-not-allowed ${
                    ok
                      ? "bg-[#16ab59] text-white border-2 border-[#111118] shadow-[0_3px_0_0_#111118]"
                      : bad
                      ? "bg-[#ff4141] text-white border-2 border-[#111118] shadow-[0_3px_0_0_#111118]"
                      : "bg-[#f0f6ff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] border-2 border-[#111118] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] hover:bg-[#e1edff] dark:hover:bg-[#2a2a3a] active:translate-y-[2px]"
                  }`}
                  style={{
                    opacity: chosen !== undefined && !picked ? 0.6 : 1,
                  }}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-normal shrink-0 font-mono border border-[#111118] ${
                      ok || bad
                        ? "bg-white text-[#111118]"
                        : "bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff]"
                    }`}
                  >
                    {LETTERS[j]}
                  </span>
                  <span className="flex-1 leading-normal font-normal">{o}</span>
                  {ok && (
                    <span className="inline-flex items-center gap-1 font-normal text-xs text-white">
                      ✓ Đúng
                    </span>
                  )}
                  {bad && (
                    <span className="inline-flex items-center gap-1 font-normal text-xs text-white">
                      ✗ Sai
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {chosen !== undefined && (
            <div
              className={`mt-5 rounded-sharp p-4 text-sm font-normal border-2 border-[#111118] shadow-[0_2px_0_0_#111118] ${
                chosen === q.correct
                  ? "bg-[#16ab59] text-white"
                  : "bg-[#ff4141] text-white"
              }`}
            >
              {chosen === q.correct
                ? "Chính xác! Câu trả lời đã được ghi nhận."
                : "Chưa chính xác. Mỗi câu hỏi chỉ được chọn đáp án một lần."}
            </div>
          )}
          {locked && (
            <p className="mt-4 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
              Đã hết thời gian làm bài kiểm tra.
            </p>
          )}

          {/* Bottom navigation */}
          <div className="mt-8 pt-5 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between gap-3">
            <button
              onClick={() => setQi((i) => Math.max(0, i - 1))}
              disabled={qi === 0}
              className="inline-flex items-center gap-1.5 h-12 px-6 rounded-sm border-2 border-[#111118] bg-white dark:bg-[#1b1b26] text-sm font-normal text-[#111118] dark:text-[#f0f6ff] hover:bg-[#e1edff] dark:hover:bg-[#242436] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-[0_2px_0_0_#111118] active:translate-y-[1px]"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              <span>Câu trước</span>
            </button>

            {qi < qs.length - 1 ? (
              <button
                onClick={() => setQi((i) => i + 1)}
                className="inline-flex items-center gap-1.5 h-12 px-6 rounded-pill bg-[#0b7a75] hover:bg-[#09635f] text-white text-sm font-normal transition-all cursor-pointer border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px]"
              >
                <span>Câu tiếp</span>
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="inline-flex items-center gap-2 h-12 px-7 rounded-pill bg-[#0b7a75] text-white hover:bg-[#09635f] text-sm font-normal transition-all cursor-pointer border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px]"
              >
                <span>
                  {answered < qs.length && !locked
                    ? `Nộp bài (còn ${qs.length - answered} câu)`
                    : "Xem kết quả"}
                </span>
              </button>
            )}
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-3 min-w-0 space-y-4">
          <div className="rounded-md bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] text-center">
            <div className="text-xs font-normal uppercase tracking-wider text-[#111118]/70 dark:text-[#f0f6ff]/70">
              Điểm số hiện tại
            </div>
            <div className="mt-2 text-4xl font-mono font-normal text-[#111118] dark:text-[#f0f6ff] tabular-nums">
              {me.score.toFixed(1)}
            </div>
            <div className="mt-1 text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-mono tabular-nums">
              Hạng <strong className="text-[#0b7a75] dark:text-[#2dd4bf] font-mono">{me.rank}</strong>/{rows.length} · {me.correct}/{qs.length} câu đúng
            </div>
          </div>

          <div className="rounded-md bg-white dark:bg-[#1b1b26] p-5 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118]">
            <h3 className="mb-3 text-xs font-normal text-[#111118] dark:text-[#f0f6ff] tracking-tight uppercase">
              Bảng xếp hạng trực tiếp
            </h3>
            <Leaderboard rows={rows} total={qs.length} limit={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}
