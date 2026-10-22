import { useState } from "react";
import {
  ExamSet,
  Question,
  AI_DOCS,
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
    <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-8">
      <button
        onClick={onCancel}
        className="text-sm font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70 hover:text-[#0b7a75] transition-colors cursor-pointer inline-flex items-center gap-1.5"
      >
        <span>← Quay lại</span>
      </button>
      <h1 className="mt-2 text-3xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">
        {initial.isNew ? "Tạo bộ câu hỏi mới" : "Chỉnh sửa bộ câu hỏi"}
      </h1>

      <div className="mt-6 grid grid-cols-6 gap-4 rounded-[24px] bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
        <label className="col-span-6 text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Tên bộ câu hỏi
          <input
            className={INP + " mt-1.5"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Kiểm tra Đại số giữa kỳ"
          />
        </label>
        <label className="col-span-6 sm:col-span-4 text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Môn học
          <input
            className={INP + " mt-1.5"}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="VD: Toán học"
          />
        </label>
        <label className="col-span-6 sm:col-span-2 text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Thời gian mặc định (phút)
          <input
            type="number"
            min="1"
            className={INP + " mt-1.5 font-mono"}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        {qs.map((q, i) => (
          <div key={q.id} className="rounded-[24px] bg-white dark:bg-[#1b1b26] p-6 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-normal text-[#111118] dark:text-[#f0f6ff]">Câu {i + 1}</span>
              <button
                onClick={() => setQs((a) => a.filter((_, k) => k !== i))}
                className="text-xs text-[#ff4141] hover:underline cursor-pointer"
              >
                Xoá câu
              </button>
            </div>
            <QuestionFields q={q} onPatch={(p) => upd(i, p)} />
          </div>
        ))}

        {notice && <div className="rounded-[20px] bg-[#16ab59]/10 border border-[#16ab59] px-4 py-3 text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">{notice}</div>}

        {aiOpen ? (
          <AIPanel docs={docs} onAdd={addFromAI} onClose={() => setAiOpen(false)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setNotice("");
                setQs((a) => [...a, newQ()]);
              }}
              className="rounded-[5000px] border-2 border-dashed border-[#111118]/30 dark:border-[#2a2a3a] py-4 text-base font-normal text-[#111118] dark:text-[#f0f6ff] hover:bg-[#e1edff] dark:hover:bg-[#242436] cursor-pointer transition-colors shadow-[0_2px_0_0_#111118]"
            >
              + Thêm câu hỏi thủ công
            </button>
            <button
              onClick={() => {
                setNotice("");
                setAiOpen(true);
              }}
              className="rounded-[5000px] py-4 text-base font-normal text-white cursor-pointer border-2 border-[#111118] shadow-[0_4px_0_0_#111118] bg-[#0b7a75] hover:bg-[#09635f] transition-all"
            >
              ✨ Tạo câu hỏi bằng AI
            </button>
          </div>
        )}
      </div>

      {err && <div className="mt-4 rounded-[20px] bg-[#ff4141]/10 border border-[#ff4141] px-4 py-3 text-sm font-normal text-[#ff4141]">{err}</div>}
      <div className="mt-8 flex justify-end gap-3">
        <button onClick={onCancel} className={BTN_OUT}>
          Huỷ
        </button>
        <button onClick={save} className={BTN}>
          <span>Lưu bộ câu hỏi</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
