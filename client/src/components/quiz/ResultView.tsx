import { ExamResult, PURPLE, BTN } from "../../services/examService";

interface ResultViewProps {
  res: ExamResult;
  onHome: () => void;
}

export function ResultView({ res, onHome }: ResultViewProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-8 py-10">
      <div className="rounded-3xl p-8 text-center shadow-lg bg-slate-900 border border-slate-800 text-white">
        <div className="text-sm text-slate-300">{res.title}</div>
        <div className="mt-2 text-6xl font-bold tracking-tight text-white">{res.score.toFixed(1)}</div>
        <div className="mt-2 text-sm text-slate-300">
          {res.correct}/{res.total} câu đúng · Hạng {res.rank}/{res.of}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 border border-slate-200/90 dark:border-slate-800">
        <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Kết quả từng câu</h2>
        <div className="flex flex-wrap gap-2">
          {res.perQ.map((r, i) => (
            <span
              key={i}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-xs ${
                r === null
                  ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  : r
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border dark:border-emerald-800/60"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 dark:border dark:border-rose-800/60"
              }`}
            >
              {i + 1}
              {r === null ? "" : r ? "✓" : "✗"}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          ✓ đúng · ✗ sai · số trắng là chưa trả lời. Đáp án đúng không được hiển thị.
        </p>
      </div>

      <div className="mt-6 text-center">
        <button onClick={onHome} className={BTN + " shadow-md"} style={{ background: PURPLE }}>
          Về trang bài kiểm tra
        </button>
      </div>
    </div>
  );
}
