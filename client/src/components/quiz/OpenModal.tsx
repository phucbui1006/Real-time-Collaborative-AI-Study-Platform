import { useState, useEffect } from "react";
import { ExamSet, DARK, PURPLE, BTN, INP } from "../../services/examService";

interface OpenModalProps {
  set: ExamSet;
  onStart: (set: ExamSet, minutes: number) => void;
  onClose: () => void;
}

export function OpenModal({ set, onStart, onClose }: OpenModalProps) {
  const [minutes, setMinutes] = useState<number | string>(set.minutes);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mở bài kiểm tra trực tuyến"
        className="w-full rounded-3xl p-6 shadow-2xl transition-all"
        style={{ maxWidth: 420, background: DARK, color: "#fff" }}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">Mở bài kiểm tra trực tuyến</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="text-xl leading-none text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          {set.title} · {set.questions.length} câu hỏi
        </p>
        <label className="mt-5 block text-sm font-medium text-slate-100">
          Thời gian làm bài (phút)
          <input
            type="number"
            min="1"
            max="180"
            className={INP + " mt-1"}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        <p className="mt-3 text-xs text-slate-400">
          Mọi người trả lời trong khoảng thời gian này. Người làm bài biết câu mình đúng hay sai nhưng không thấy đáp án đúng. Bảng điểm và xếp hạng cập nhật trực tiếp.
        </p>
        <button
          onClick={() => onStart(set, Math.max(1, +minutes || set.minutes))}
          className={BTN + " mt-5 w-full py-3 shadow-lg"}
          style={{ background: PURPLE }}
        >
          Bắt đầu
        </button>
      </div>
    </div>
  );
}
