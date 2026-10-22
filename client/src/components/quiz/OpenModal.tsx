import { useState, useEffect } from "react";
import { ExamSet, BTN, INP } from "../../services/examService";
import { X } from "lucide-react";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/60 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mở bài kiểm tra trực tuyến"
        className="w-full max-w-[440px] rounded-[24px] p-7 border-2 border-[#111118] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">
              Mở bài kiểm tra trực tuyến
            </h2>
            <p className="mt-1 text-sm font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
              {set.title} · {set.questions.length} câu hỏi
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-full bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] flex items-center justify-center shadow-[0_2px_0_0_#111118] hover:bg-[#d0e2ff] cursor-pointer transition-all"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <label className="mt-5 block text-xs font-normal uppercase text-[#111118]/70 dark:text-[#f0f6ff]/70">
          Thời gian làm bài (phút)
          <input
            type="number"
            min="1"
            max="180"
            className={INP + " mt-1.5 font-mono"}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        <p className="mt-3 text-xs font-normal text-[#111118]/60 dark:text-[#f0f6ff]/60 leading-relaxed">
          Mọi người trả lời trong khoảng thời gian này. Bảng điểm và xếp hạng được cập nhật trực tiếp cho người mở phòng.
        </p>
        <button
          onClick={() => onStart(set, Math.max(1, +minutes || set.minutes))}
          className={BTN + " mt-6 w-full"}
        >
          <span>Bắt đầu bài thi</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
