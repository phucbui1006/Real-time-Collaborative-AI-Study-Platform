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
    <div className="rounded-md bg-white dark:bg-[#1b1b26] p-6 shadow-[0_4px_0_0_#111118] border-2 border-[#111118] dark:border-[#2a2a3a]">
      <div className="flex items-center justify-between">
        <h3 className="font-normal text-xl text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">✨ Tạo câu hỏi bằng AI</h3>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="w-8 h-8 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] flex items-center justify-center shadow-[0_2px_0_0_#111118] hover:bg-[#d0e2ff] cursor-pointer transition-all"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 grid grid-cols-6 gap-3">
        <label className="col-span-6 text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Chủ đề / nội dung muốn ra đề
          <textarea
            className="w-full rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] p-4 text-sm font-normal text-[#111118] dark:text-[#f0f6ff] placeholder:text-[#111118]/50 outline-none focus:border-[#0b7a75] mt-1.5"
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="VD: Phương trình bậc hai, mức độ lớp 10"
          />
        </label>
        <label className="col-span-6 sm:col-span-3 text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Hoặc dựa trên tài liệu
          <select
            className={INP + " mt-1.5"}
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
        <label className="col-span-3 sm:col-span-1 text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Số câu
          <input
            type="number"
            min="1"
            max="20"
            className={INP + " mt-1.5 font-mono"}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </label>
        <div className="col-span-3 sm:col-span-2 text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Độ khó
          <div className="mt-1.5 flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={`flex-1 py-2 text-xs font-normal cursor-pointer transition-all border border-[#111118] ${
                  level === l
                    ? "rounded-pill bg-[#0b7a75] text-white shadow-[0_2px_0_0_#111118]"
                    : "rounded-[8px] bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] hover:bg-[#e1edff] dark:hover:bg-[#242436]"
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
        className={BTN + " mt-5"}
      >
        <span>{loading ? "AI đang tạo câu hỏi…" : drafts.length ? "Tạo lại" : "Tạo câu hỏi"}</span>
      </button>

      {err && <div className="mt-3 rounded-sharp bg-[#ff4141]/10 border border-[#ff4141] px-4 py-2.5 text-xs font-normal text-[#ff4141]">{err}</div>}

      {drafts.length > 0 && !loading && (
        <div className="mt-6">
          <h4 className="text-base font-normal text-[#111118] dark:text-[#f0f6ff]">Câu hỏi AI vừa tạo ({drafts.length})</h4>
          <p className="mt-1 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
            Sửa trực tiếp nội dung và đáp án bên dưới, bỏ chọn những câu không muốn dùng.
          </p>
          <div className="mt-4 space-y-3">
            {drafts.map((d, i) => (
              <div
                key={d.id}
                className="rounded-[4px] p-5 bg-[#f0f6ff] dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a]"
                style={{ opacity: d.keep ? 1 : 0.5 }}
              >
                <label className="mb-3 flex items-center gap-2 text-sm font-normal text-[#111118] dark:text-[#f0f6ff] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.keep}
                    onChange={(e) => patch(d.id, { keep: e.target.checked })}
                    className="accent-[#0b7a75] cursor-pointer h-4 w-4"
                  />{" "}
                  Câu AI {i + 1}
                </label>
                <QuestionFields q={d} onPatch={(p) => patch(d.id, p)} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className={BTN_OUT}>
              Bỏ qua
            </button>
            <button
              onClick={add}
              disabled={!chosen.length}
              className={BTN}
            >
              <span>Thêm {chosen.length} câu vào bộ câu hỏi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
