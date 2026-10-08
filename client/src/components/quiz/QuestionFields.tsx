import { Question, LETTERS, INP } from "../../services/examService";

interface QuestionFieldsProps {
  q: Question;
  onPatch: (patch: Partial<Question>) => void;
}

export function QuestionFields({ q, onPatch }: QuestionFieldsProps) {
  const setOpt = (j: number, v: string) =>
    onPatch({ options: q.options.map((o, m) => (m === j ? v : o)) });

  return (
    <>
      <textarea
        className={INP}
        rows={2}
        value={q.text}
        onChange={(e) => onPatch({ text: e.target.value })}
        placeholder="Nội dung câu hỏi"
      />
      <p className="mb-1 mt-3 text-xs text-slate-500">
        Chọn nút tròn ở đáp án đúng. Người làm bài sẽ không nhìn thấy đáp án này.
      </p>
      <div className="space-y-2">
        {q.options.map((o, j) => (
          <div key={j} className="flex items-center gap-2">
            <input
              type="radio"
              name={`c-${q.id}`}
              checked={q.correct === j}
              onChange={() => onPatch({ correct: j })}
              aria-label={`Đáp án ${LETTERS[j]} là đúng`}
              className="accent-violet-600 cursor-pointer"
            />
            <span className="w-5 text-sm font-semibold text-slate-500">{LETTERS[j]}</span>
            <input
              className={INP}
              value={o}
              onChange={(e) => setOpt(j, e.target.value)}
              placeholder={`Đáp án ${LETTERS[j]}`}
            />
          </div>
        ))}
      </div>
    </>
  );
}
