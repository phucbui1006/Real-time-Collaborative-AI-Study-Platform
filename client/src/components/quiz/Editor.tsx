import { useState } from "react";
import {
  ExamSet,
  Question,
  AI_DOCS,
  PURPLE,
  BTN,
  BTN_OUT,
  INP,
  newQ,
  validateQ,
  isBlankQ,
} from "../../services/examService";
import { QuestionFields } from "./QuestionFields";
import { AIPanel } from "./AIPanel";

interface EditorProps {
  initial: ExamSet;
  docs?: { id: number; title: string }[];
  onSave: (set: ExamSet) => void;
  onCancel: () => void;
}

export function Editor({ initial, docs = AI_DOCS, onSave, onCancel }: EditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [subject, setSubject] = useState(initial.subject);
  const [minutes, setMinutes] = useState<number | string>(initial.minutes);
  const [qs, setQs] = useState<Question[]>(initial.questions);
  const [aiOpen, setAiOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [err, setErr] = useState("");

  const upd = (i: number, patch: Partial<Question>) =>
    setQs((a) => a.map((q, k) => (k === i ? { ...q, ...patch } : q)));

  const addFromAI = (list: Question[]) => {
    setQs((a) => [...a.filter((q) => !isBlankQ(q)), ...list]); // Bỏ câu trống mặc định nếu chưa nhập gì
    setNotice(`Đã thêm ${list.length} câu từ AI vào bộ câu hỏi.`);
    setAiOpen(false);
  };

  const save = () => {
    if (!title.trim()) return setErr("Hãy nhập tên bộ câu hỏi.");
    if (!qs.length) return setErr("Cần ít nhất 1 câu hỏi.");
    for (const [i, q] of qs.entries()) {
      const m = validateQ(q, i);
      if (m) return setErr(m);
    }
    onSave({
      ...initial,
      title: title.trim(),
      subject: subject.trim().toUpperCase() || "KHÁC",
      minutes: Math.max(1, +minutes || 10),
      questions: qs,
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-8 py-8">
      <button
        onClick={onCancel}
        className="text-sm font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
      >
        ← Quay lại
      </button>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        {initial.isNew ? "Tạo bộ câu hỏi" : "Chỉnh sửa bộ câu hỏi"}
      </h1>

      <div className="mt-6 grid grid-cols-6 gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <label className="col-span-6 text-sm font-medium text-slate-700">
          Tên bộ câu hỏi
          <input
            className={INP + " mt-1"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Kiểm tra Đại số giữa kỳ"
          />
        </label>
        <label className="col-span-6 sm:col-span-4 text-sm font-medium text-slate-700">
          Môn học
          <input
            className={INP + " mt-1"}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="VD: Toán học"
          />
        </label>
        <label className="col-span-6 sm:col-span-2 text-sm font-medium text-slate-700">
          Thời gian mặc định (phút)
          <input
            type="number"
            min="1"
            className={INP + " mt-1"}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        {qs.map((q, i) => (
          <div key={q.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Câu {i + 1}</span>
              <button
                onClick={() => setQs((a) => a.filter((_, k) => k !== i))}
                className="text-sm text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                Xoá câu
              </button>
            </div>
            <QuestionFields q={q} onPatch={(p) => upd(i, p)} />
          </div>
        ))}

        {notice && <div className="rounded-xl bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</div>}

        {aiOpen ? (
          <AIPanel docs={docs} onAdd={addFromAI} onClose={() => setAiOpen(false)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setNotice("");
                setQs((a) => [...a, newQ()]);
              }}
              className="rounded-3xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-600 hover:bg-white cursor-pointer"
            >
              + Thêm câu hỏi thủ công
            </button>
            <button
              onClick={() => {
                setNotice("");
                setAiOpen(true);
              }}
              className="rounded-3xl py-4 text-sm font-semibold text-white cursor-pointer shadow-md"
              style={{ background: PURPLE }}
            >
              ✨ Tạo câu hỏi bằng AI
            </button>
          </div>
        )}
      </div>

      {err && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onCancel} className={BTN_OUT}>
          Huỷ
        </button>
        <button onClick={save} className={BTN} style={{ background: PURPLE }}>
          Lưu bộ câu hỏi
        </button>
      </div>
    </div>
  );
}
