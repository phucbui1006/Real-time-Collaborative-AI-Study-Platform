import { ExamResult, DARK, PURPLE, BTN } from "../../services/examService";

interface ResultViewProps {
  res: ExamResult;
  onHome: () => void;
}

export function ResultView({ res, onHome }: ResultViewProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-8 py-10">
      <div className="rounded-3xl p-8 text-center shadow-lg" style={{ background: DARK, color: "#fff" }}>
        <div className="text-sm text-slate-300">{res.title}</div>
        <div className="mt-2 text-6xl font-bold tracking-tight">{res.score.toFixed(1)}</div>
        <div className="mt-2 text-sm text-slate-300">
          {res.correct}/{res.total} câu đúng · Hạng {res.rank}/{res.of}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-3 font-semibold text-slate-900">Kết quả từng câu</h2>
        <div className="flex flex-wrap gap-2">
          {res.perQ.map((r, i) => (
            <span
              key={i}
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-xs"
              style={{
                background: r === null ? "#f1f5f9" : r ? "#dcfce7" : "#fee2e2",
                color: r === null ? "#64748b" : r ? "#15803d" : "#b91c1c",
              }}
            >
              {i + 1}
              {r === null ? "" : r ? "✓" : "✗"}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
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
