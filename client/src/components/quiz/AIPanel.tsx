import { useState } from "react";
import {
  Question,
  LEVELS,
  BTN,
  BTN_OUT,
  INP,
  generateQuestionsApi,
  validateQ,
} from "../../services/examService";
import { QuestionFields } from "./QuestionFields";

interface AIPanelProps {
  docs: { id: number; title: string }[];
  onAdd: (questions: Question[]) => void;
  onClose: () => void;
}

export function AIPanel({ docs, onAdd, onClose }: AIPanelProps) {
  const [topic, setTopic] = useState("");
  const [docId, setDocId] = useState("");
  const [count, setCount] = useState<number | string>(5);
  const [level, setLevel] = useState("Vừa");
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<(Question & { keep: boolean })[]>([]);
  const [err, setErr] = useState("");

  const gen = async () => {
    if (!topic.trim() && !docId) return setErr("Hãy nhập chủ đề hoặc chọn một tài liệu.");
    setErr("");
    setLoading(true);
    try {
      const doc = docs.find((d) => String(d.id) === docId);
      const res = await generateQuestionsApi({
        topic,
        docTitle: doc?.title || "",
        count: Math.min(20, Math.max(1, +count || 5)),
        level,
      });
      setDrafts(res);
    } catch {
      setErr("AI chưa tạo được câu hỏi. Hãy thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const patch = (id: string, p: Partial<Question & { keep: boolean }>) =>
    setDrafts((a) => a.map((d) => (d.id === id ? { ...d, ...p } : d)));

  const chosen = drafts.filter((d) => d.keep);

  const add = () => {
    for (const d of chosen) {
      const m = validateQ(d, drafts.indexOf(d), "Câu AI");
      if (m) return setErr(m);
    }
    onAdd(chosen.map(({ keep: _k, ...q }) => q));
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm border-2 border-indigo-600 dark:border-indigo-500">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-50">✨ Tạo câu hỏi bằng AI</h3>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="text-xl leading-none text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 grid grid-cols-6 gap-3">
        <label className="col-span-6 text-sm font-medium text-slate-700 dark:text-slate-300">
          Chủ đề / nội dung muốn ra đề
          <textarea
            className={INP + " mt-1"}
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="VD: Phương trình bậc hai, mức độ lớp 10"
          />
        </label>
        <label className="col-span-6 sm:col-span-3 text-sm font-medium text-slate-700 dark:text-slate-300">
          Hoặc dựa trên tài liệu
          <select
            className={INP + " mt-1"}
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
          >
            <option value="">Không dùng tài liệu</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-3 sm:col-span-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Số câu
          <input
            type="number"
            min="1"
            max="20"
            className={INP + " mt-1"}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        <div className="col-span-3 sm:col-span-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          Độ khó
          <div className="mt-1 flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold cursor-pointer transition-colors ${
                  level === l
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={gen}
        disabled={loading}
        className={BTN + " mt-4"}
      >
        {loading ? "AI đang tạo câu hỏi…" : drafts.length ? "Tạo lại" : "Tạo câu hỏi"}
      </button>

      {err && <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-4 py-2 text-sm text-rose-700 dark:text-rose-300">{err}</div>}

      {drafts.length > 0 && !loading && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Câu hỏi AI vừa tạo ({drafts.length})</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sửa trực tiếp nội dung và đáp án bên dưới, bỏ chọn những câu không muốn dùng. AI có thể sai, hãy kiểm tra đáp án đúng trước khi thêm.
          </p>
          <div className="mt-3 space-y-3">
            {drafts.map((d, i) => (
              <div
                key={d.id}
                className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                style={{ opacity: d.keep ? 1 : 0.5 }}
              >
                <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.keep}
                    onChange={(e) => patch(d.id, { keep: e.target.checked })}
                    className="accent-indigo-600 cursor-pointer"
                  />{" "}
                  Câu AI {i + 1}
                </label>
                <QuestionFields q={d} onPatch={(p) => patch(d.id, p)} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className={BTN_OUT}>
              Bỏ qua
            </button>
            <button
              onClick={add}
              disabled={!chosen.length}
              className={BTN}
            >
              Thêm {chosen.length} câu vào bộ câu hỏi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
