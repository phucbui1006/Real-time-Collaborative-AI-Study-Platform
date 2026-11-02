import { ExamResult } from "../../services/examService";

interface ResultViewProps {
  res: ExamResult;
  onHome: () => void;
}

export function ResultView({ res, onHome }: ResultViewProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-8 py-10">
      <div className="rounded-md p-8 text-center bg-white dark:bg-[#1b1b26] border-2 border-[#111118] dark:border-[#2a2a3a] shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000]">
        <div className="text-base font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">{res.title}</div>
        <div className="mt-3 text-7xl font-mono font-normal tracking-tight text-[#111118] dark:text-[#f0f6ff] tabular-nums">
          {res.score.toFixed(1)}
        </div>
        <div className="mt-3 text-sm font-mono font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
          {res.correct}/{res.total} câu đúng · Hạng {res.rank}/{res.of}
        </div>
      </div>

      <div className="mt-6 rounded-md bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
        <h2 className="mb-4 font-normal text-lg text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">Kết quả từng câu</h2>
        <div className="flex flex-wrap gap-2.5">
          {res.perQ.map((r, i) => (
            <span
              key={i}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-normal font-mono border-2 border-[#111118] shadow-[0_2px_0_0_#111118] ${
                r === null
                  ? "bg-[#e1edff] text-[#111118] dark:bg-[#242436] dark:text-[#f0f6ff]"
                  : r
                  ? "bg-[#16ab59] text-white"
                  : "bg-[#ff4141] text-white"
              }`}
            >
              {i + 1}
              {r === null ? "" : r ? " ✓" : " ✗"}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
          ✓ đúng · ✗ sai · ô xanh nhạt là chưa trả lời. Đáp án đúng không được hiển thị.
        </p>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onHome}
          className="inline-flex items-center justify-center gap-2 rounded-pill h-12 px-8 text-base font-normal bg-[#0b7a75] hover:bg-[#09635f] text-white border-2 border-[#111118] shadow-[0_4px_0_0_#111118] active:translate-y-[2px] transition-all cursor-pointer"
        >
          <span>Về trang bài kiểm tra</span>
        </button>
      </div>
    </div>
  );
}
